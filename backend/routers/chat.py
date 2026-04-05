import json
import time
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.responses import StreamingResponse
from langchain_openai import ChatOpenAI
from sqlalchemy.orm import Session, selectinload

from config import settings
from database import get_db
from models import Card, ChatSession, Message, MessageCardAssociation, User
from routers.auth import get_current_user
from schemas import (
    ChatSessionCreate,
    ChatSessionResponse,
    ChatSessionUpdate,
    MessageRequest,
    MessageResponse,
)
from services.subscription_service import SubscriptionService
from tarot_reader import TarotReader
from utils.error_handlers import (
    ChatSessionError,
    RateLimitExceededError,
    ResourceNotFoundError,
    logger,
)
from utils.rate_limiter import RATE_LIMITS, limiter

router = APIRouter(prefix="/chat", tags=["chat"])

# Initialize TarotReader
reader = TarotReader()


def load_system_prompt() -> str:
    """
    Load System Prompt from File

    Reads the system prompt content from backend/system_prompt.txt file.
    Falls back to a default prompt if the file is not found.

    Returns:
        str: The system prompt content

    Note:
        The system prompt file should be located in the backend directory.
        If the file is not found, a basic fallback prompt will be used.
    """
    try:
        # Get the directory where this script is located (backend/routers/)
        current_dir = Path(__file__).resolve().parent
        # Go up one level to backend directory
        backend_dir = current_dir.parent
        # Path to system_prompt.txt
        system_prompt_path = backend_dir / "system_prompt.txt"

        with system_prompt_path.open(encoding="utf-8") as file:
            return file.read().strip()
    except FileNotFoundError:
        # Calculate the path for logging even if file doesn't exist
        current_dir = Path(__file__).resolve().parent
        backend_dir = current_dir.parent
        system_prompt_path = backend_dir / "system_prompt.txt"

        logger.logger.warning(
            "System prompt file not found, using fallback prompt", extra={"file_path": str(system_prompt_path)}
        )
        # Fallback system prompt
        return (
            "You are a compassionate and insightful tarot reader. "
            "You help people gain clarity and guidance through tarot card readings. "
            "When someone asks you a question that would benefit from tarot guidance, "
            "use the draw_cards tool to draw cards for them."
        )
    except Exception as e:
        # Calculate the path for logging even if there's an error
        current_dir = Path(__file__).resolve().parent
        backend_dir = current_dir.parent
        system_prompt_path = backend_dir / "system_prompt.txt"

        logger.logger.error(
            "Error loading system prompt file, using fallback prompt",
            extra={"error": str(e), "file_path": str(system_prompt_path)},
        )
        # Fallback system prompt
        return (
            "You are a compassionate and insightful tarot reader. "
            "You help people gain clarity and guidance through tarot card readings. "
            "When someone asks you a question that would benefit from tarot guidance, "
            "use the draw_cards tool to draw cards for them."
        )


# Rate limiting
RATE_LIMIT_WINDOW = 60  # 1 minute
RATE_LIMIT_MAX_REQUESTS = 10
user_request_counts = {}

# Tool definition for draw_cards
DRAW_CARDS_TOOL = {
    "type": "function",
    "function": {
        "name": "draw_cards",
        "description": (
            "Draw tarot cards and provide a reading for the user's question or concern. "
            "Use this when the user is asking for guidance, advice, insights about their life, "
            "future, relationships, career, or any other personal matter."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "user_question": {
                    "type": "string",
                    "description": "The user's question or concern for which to draw cards",
                },
                "num_cards": {
                    "type": "integer",
                    "description": "Number of cards to draw (1-10)",
                    "minimum": 1,
                    "maximum": 10,
                    "default": 3,
                },
            },
            "required": ["user_question"],
        },
    },
}


def validate_chat_session_exists(db: Session, session_id: int, user_id: int) -> bool:
    """
    Validate that a chat session exists and belongs to the specified user.

    Args:
        db: Database session
        session_id: ID of the chat session to validate
        user_id: ID of the user who should own the session

    Returns:
        bool: True if session exists and belongs to user, False otherwise
    """
    session = db.query(ChatSession).filter(ChatSession.id == session_id, ChatSession.user_id == user_id).first()
    return session is not None


def check_rate_limit(user_id: int) -> None:
    """
    Check User Rate Limit

    Verify that the user hasn't exceeded the rate limit for chat endpoints.
    Maintains a sliding window of requests per user.

    Args:
        user_id (int): ID of the user to check

    Raises:
        RateLimitExceededError: If user has exceeded 10 requests per minute

    Note:
        Rate limit is 10 requests per minute per user.
        Old requests outside the window are automatically cleaned up.
    """
    current_time = time.time()
    if user_id not in user_request_counts:
        user_request_counts[user_id] = []

    # Remove old requests
    user_request_counts[user_id] = [
        req_time for req_time in user_request_counts[user_id] if current_time - req_time < RATE_LIMIT_WINDOW
    ]

    if len(user_request_counts[user_id]) >= RATE_LIMIT_MAX_REQUESTS:
        raise RateLimitExceededError(
            message="Too many requests",
            details={
                "retry_after": RATE_LIMIT_WINDOW,
                "limit": RATE_LIMIT_MAX_REQUESTS,
            },
        )

    user_request_counts[user_id].append(current_time)


def execute_draw_cards_tool(
    user_question: str, num_cards: int = 3, db: Session = None, current_user: User = None
) -> dict:
    """
    Execute Tarot Card Drawing Tool

    Draw tarot cards for a user's question and prepare them for both display
    and database storage. This function interfaces with the TarotReader
    and manages card data formatting.

    Args:
        user_question (str): The user's question or concern
        num_cards (int): Number of cards to draw (1-10, default: 3)
        db (Session): Database session for card lookups
        current_user (User): The user requesting the card draw (for turn consumption)

    Returns:
        dict: Tool execution result containing:
            - success (bool): Whether the operation succeeded
            - cards_for_display (List[dict]): Cards formatted for frontend display
            - card_orientation_tuples (List[tuple]): Cards with orientations for DB storage
            - question (str): The original question
            - error (str): Error message if success is False

    Note:
        This function handles the complex data transformation between the
        TarotReader's output format and the database/API response formats.
    """
    try:
        # Check and consume turns before drawing cards
        if current_user and db:
            subscription_service = SubscriptionService()
            turn_result = subscription_service.consume_user_turn(db, current_user, usage_context="chat")

            if not turn_result.success:
                return {
                    "success": False,
                    "error": "No turns available. You need to purchase more turns to draw cards.",
                    "remaining_free_turns": turn_result.remaining_free_turns,
                    "remaining_paid_turns": turn_result.remaining_paid_turns,
                    "total_remaining_turns": turn_result.total_remaining_turns,
                }
        # Draw cards (from TarotReader, returns dicts)
        drawn_cards_data = reader.shuffle_and_draw(num_cards)

        # Get card names to fetch from DB
        card_names = [card_data["name"] for card_data in drawn_cards_data]

        # Fetch Card model instances from DB
        db_cards = db.query(Card).filter(Card.name.in_(card_names)).all()

        # Create a mapping from name to Card model instance for easier lookup
        db_cards_map = {card.name: card for card in db_cards}

        # Format cards for display and ensure we use the orientation from the draw
        formatted_cards_for_display = []
        final_db_cards_for_message = []  # For associating with the Message model

        for drawn_card_data in drawn_cards_data:
            card_name = drawn_card_data["name"]
            db_card_instance = db_cards_map.get(card_name)
            if db_card_instance:
                final_db_cards_for_message.append(db_card_instance)

                # For display, use orientation from the draw and meaning from db/draw
                orientation = drawn_card_data["orientation"]
                meaning = drawn_card_data["meaning"]  # TarotReader provides this
                formatted_meaning = ", ".join(meaning) if isinstance(meaning, list) else meaning

                formatted_cards_for_display.append(
                    {
                        "id": db_card_instance.id,
                        "name": db_card_instance.name,
                        "orientation": orientation,
                        "meaning": formatted_meaning,  # Use meaning from TarotReader's draw
                        "image_url": db_card_instance.image_url,
                        # Add other fields from db_card_instance if needed for display
                        "description_short": db_card_instance.description_short,
                        "description_upright": db_card_instance.description_upright,
                        "description_reversed": db_card_instance.description_reversed,
                        "suit": db_card_instance.suit,
                        "rank": db_card_instance.rank,
                        "element": db_card_instance.element,
                        "astrology": db_card_instance.astrology,
                        "numerology": db_card_instance.numerology,
                    }
                )

        if len(final_db_cards_for_message) != num_cards:
            logger.logger.warning(
                (
                    f"Mismatch in drawn cards and DB cards. "
                    f"Drawn: {num_cards}, Found in DB: {len(final_db_cards_for_message)}"
                ),
                extra={
                    "card_names_drawn": card_names,
                    "cards_found_in_db": [c.name for c in final_db_cards_for_message],
                },
            )
            # Decide if this is an error or can proceed with fewer cards

        logger.logger.info(
            "Cards drawn successfully via tool call",
            extra={
                "num_cards": num_cards,
                "question": user_question,
                "cards": [
                    f"{card.name} ({orientation})"
                    for card, orientation in zip(final_db_cards_for_message, formatted_cards_for_display)
                ],
            },
        )

        return {
            "success": True,
            "cards_for_display": formatted_cards_for_display,
            "card_orientation_tuples": [
                (card, card_data["orientation"])
                for card, card_data in zip(final_db_cards_for_message, drawn_cards_data)
            ],
            "question": user_question,
        }
    except Exception as e:
        logger.logger.error(
            "Error in draw_cards tool execution",
            extra={"error": str(e), "question": user_question, "num_cards": num_cards},
        )
        return {"success": False, "error": f"Failed to draw cards: {str(e)}"}


@router.post("/sessions/", response_model=ChatSessionResponse)
@limiter.limit(RATE_LIMITS["chat"])
def create_chat_session(
    request: Request,
    chat: ChatSessionCreate,
    response: Response,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Create New Chat Session

    Create a new chat session for the authenticated user. Each session can contain
    multiple messages and maintains conversation context for tarot readings.

    Args:
        chat (ChatSessionCreate): Chat session data
            - title (str, optional): Custom title for the session (default: "New Chat")
        current_user (User): Authenticated user (automatically injected)

    Returns:
        ChatSessionResponse: Created chat session information
            - id (int): Unique session ID
            - title (str): Session title
            - created_at (datetime): Session creation timestamp

    Raises:
        RateLimitExceededError (429): Too many requests (10 per minute limit)
        ChatSessionError (400): Error creating the session

    Rate Limit:
        10 requests per minute per user

    Example Request:
        ```json
        {
            "title": "Career Guidance Session"
        }
        ```

    Example Response:
        ```json
        {
            "id": 123,
            "title": "Career Guidance Session",
            "created_at": "2024-01-01T12:00:00Z"
        }
        ```
    """
    try:
        check_rate_limit(current_user.id)

        db_chat = ChatSession(title=chat.title, user_id=current_user.id)
        db.add(db_chat)
        db.commit()
        db.refresh(db_chat)

        logger.logger.info(
            "Chat session created",
            extra={
                "user_id": current_user.id,
                "session_id": db_chat.id,
                "title": chat.title,
            },
        )
        return db_chat
    except RateLimitExceededError:
        raise
    except Exception as e:
        db.rollback()
        logger.logger.error(
            "Error creating chat session",
            extra={"error": str(e), "user_id": current_user.id, "title": chat.title},
        )
        raise ChatSessionError(message="Error creating chat session", details={"error": str(e)})


@router.get("/sessions/", response_model=list[ChatSessionResponse])
@limiter.limit(RATE_LIMITS["default"])
def get_chat_sessions(
    request: Request,
    response: Response,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get User's Chat Sessions

    Retrieve all chat sessions belonging to the authenticated user,
    ordered by creation date (most recent first).

    Args:
        current_user (User): Authenticated user (automatically injected)

    Returns:
        List[ChatSessionResponse]: List of user's chat sessions
            Each session contains:
            - id (int): Unique session ID
            - title (str): Session title
            - created_at (datetime): Session creation timestamp

    Raises:
        RateLimitExceededError (429): Too many requests (10 per minute limit)
        ChatSessionError (400): Error retrieving sessions

    Rate Limit:
        10 requests per minute per user

    Example Response:
        ```json
        [
            {
                "id": 123,
                "title": "Career Guidance Session",
                "created_at": "2024-01-01T12:00:00Z"
            },
            {
                "id": 122,
                "title": "Relationship Reading",
                "created_at": "2024-01-01T11:30:00Z"
            }
        ]
        ```
    """
    try:
        check_rate_limit(current_user.id)

        sessions = (
            db.query(ChatSession)
            .filter(ChatSession.user_id == current_user.id)
            .order_by(ChatSession.created_at.desc())
            .all()
        )

        logger.logger.info(
            "Retrieved chat sessions",
            extra={"user_id": current_user.id, "session_count": len(sessions)},
        )
        return sessions
    except RateLimitExceededError:
        raise
    except Exception as e:
        logger.logger.error(
            "Error retrieving chat sessions",
            extra={"error": str(e), "user_id": current_user.id},
        )
        raise ChatSessionError(message="Error retrieving chat sessions", details={"error": str(e)})


@router.get("/sessions/{session_id}/messages/", response_model=list[MessageResponse])
@limiter.limit(RATE_LIMITS["default"])
def get_chat_messages(
    request: Request,
    session_id: int,
    response: Response,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get Chat Messages

    Retrieve all messages from a specific chat session, including any associated
    tarot cards that were drawn during the conversation.

    Args:
        session_id (int): ID of the chat session
        current_user (User): Authenticated user (automatically injected)

    Returns:
        List[MessageResponse]: List of messages in chronological order
            Each message contains:
            - id (int): Message ID
            - role (str): "user" or "assistant"
            - content (str): Message text content
            - created_at (datetime): Message timestamp
            - cards (List[Card], optional): Associated tarot cards (if any)

    Raises:
        ResourceNotFoundError (404): Chat session not found or doesn't belong to user
        RateLimitExceededError (429): Too many requests (10 per minute limit)
        ChatSessionError (400): Error retrieving messages

    Rate Limit:
        10 requests per minute per user

    Example Response:
        ```json
        [
            {
                "id": 1,
                "role": "user",
                "content": "I need guidance about my career",
                "created_at": "2024-01-01T12:00:00Z",
                "cards": null
            },
            {
                "id": 2,
                "role": "assistant",
                "content": "I've drawn 3 cards for your career question...",
                "created_at": "2024-01-01T12:01:00Z",
                "cards": [
                    {
                        "id": 1,
                        "name": "The Fool",
                        "orientation": "upright",
                        "image_url": "/images/the-fool.jpg"
                    }
                ]
            }
        ]
        ```
    """
    try:
        check_rate_limit(current_user.id)

        # Verify session belongs to user
        session = (
            db.query(ChatSession).filter(ChatSession.id == session_id, ChatSession.user_id == current_user.id).first()
        )
        if not session:
            raise ResourceNotFoundError(message="Chat session not found", details={"session_id": session_id})

        messages = (
            db.query(Message)
            .filter(Message.chat_session_id == session_id)
            .options(selectinload(Message.card_associations).joinedload(MessageCardAssociation.card))
            .order_by(Message.created_at)
            .all()
        )

        logger.logger.info(
            "Retrieved chat messages",
            extra={
                "user_id": current_user.id,
                "session_id": session_id,
                "message_count": len(messages),
            },
        )
        return messages
    except RateLimitExceededError:
        raise
    except ResourceNotFoundError:
        raise
    except Exception as e:
        logger.logger.error(
            "Error retrieving chat messages",
            extra={
                "error": str(e),
                "user_id": current_user.id,
                "session_id": session_id,
            },
        )
        raise ChatSessionError(message="Error retrieving chat messages", details={"error": str(e)})


@router.delete("/sessions/{session_id}")
@limiter.limit(RATE_LIMITS["default"])
def delete_chat_session(
    request: Request,
    session_id: int,
    response: Response,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Delete Chat Session

    Permanently delete a chat session and all its associated messages.
    This action cannot be undone.

    Args:
        session_id (int): ID of the chat session to delete
        current_user (User): Authenticated user (automatically injected)

    Returns:
        dict: Success confirmation message
            - message (str): Confirmation that the session was deleted

    Raises:
        ResourceNotFoundError (404): Chat session not found or doesn't belong to user
        RateLimitExceededError (429): Too many requests (10 per minute limit)
        ChatSessionError (400): Error deleting the session

    Rate Limit:
        10 requests per minute per user

    Example Response:
        ```json
        {
            "message": "Chat session deleted successfully"
        }
        ```

    Warning:
        This operation permanently deletes the session and all its messages.
        Associated tarot card records are also removed.
    """
    try:
        check_rate_limit(current_user.id)

        session = (
            db.query(ChatSession).filter(ChatSession.id == session_id, ChatSession.user_id == current_user.id).first()
        )
        if not session:
            raise ResourceNotFoundError(message="Chat session not found", details={"session_id": session_id})

        db.delete(session)
        db.commit()

        logger.logger.info(
            "Chat session deleted",
            extra={"user_id": current_user.id, "session_id": session_id},
        )
        return {"message": "Chat session deleted successfully"}
    except RateLimitExceededError:
        raise
    except ResourceNotFoundError:
        raise
    except Exception as e:
        db.rollback()
        logger.logger.error(
            "Error deleting chat session",
            extra={
                "error": str(e),
                "user_id": current_user.id,
                "session_id": session_id,
            },
        )
        raise ChatSessionError(message="Error deleting chat session", details={"error": str(e)})


@router.patch("/sessions/{session_id}", response_model=ChatSessionResponse)
@limiter.limit(RATE_LIMITS["default"])
def update_chat_session(
    request: Request,
    session_id: int,
    chat_update: ChatSessionUpdate,
    response: Response,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Update Chat Session

    Update the title of an existing chat session. Currently, only the title
    field can be modified.

    Args:
        session_id (int): ID of the chat session to update
        chat_update (ChatSessionUpdate): Update data
            - title (str): New title for the session
        current_user (User): Authenticated user (automatically injected)

    Returns:
        ChatSessionResponse: Updated chat session information
            - id (int): Session ID
            - title (str): Updated session title
            - created_at (datetime): Original creation timestamp

    Raises:
        ResourceNotFoundError (404): Chat session not found or doesn't belong to user
        RateLimitExceededError (429): Too many requests (10 per minute limit)
        ChatSessionError (400): Error updating the session

    Rate Limit:
        10 requests per minute per user

    Example Request:
        ```json
        {
            "title": "Updated Career Guidance Session"
        }
        ```

    Example Response:
        ```json
        {
            "id": 123,
            "title": "Updated Career Guidance Session",
            "created_at": "2024-01-01T12:00:00Z"
        }
        ```
    """
    try:
        check_rate_limit(current_user.id)

        session = (
            db.query(ChatSession).filter(ChatSession.id == session_id, ChatSession.user_id == current_user.id).first()
        )
        if not session:
            raise ResourceNotFoundError(message="Chat session not found", details={"session_id": session_id})

        session.title = chat_update.title
        db.commit()
        db.refresh(session)

        logger.logger.info(
            "Chat session updated",
            extra={
                "user_id": current_user.id,
                "session_id": session_id,
                "new_title": chat_update.title,
            },
        )
        return session
    except RateLimitExceededError:
        raise
    except ResourceNotFoundError:
        raise
    except Exception as e:
        db.rollback()
        logger.logger.error(
            "Error updating chat session",
            extra={
                "error": str(e),
                "user_id": current_user.id,
                "session_id": session_id,
            },
        )
        raise ChatSessionError(message="Error updating chat session", details={"error": str(e)})


@router.post("/sessions/{session_id}/messages/")
@limiter.limit(RATE_LIMITS["chat"])
async def create_message(
    request: Request,
    session_id: int,
    message_request: MessageRequest,
    response: Response,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Send Message to Chat Session (Streaming)

    Send a message to a chat session and receive a streaming AI response.
    The AI assistant can automatically draw tarot cards when appropriate and provide
    personalized readings based on the conversation context.

    Args:
        session_id (int): ID of the chat session
        message_request (MessageRequest): Message data
            - content (str): The message text to send
        current_user (User): Authenticated user (automatically injected)

    Returns:
        StreamingResponse: Server-Sent Events stream with real-time AI response

    Stream Event Types:
        - user_message: Contains the saved user message
        - cards: Tarot cards drawn by the AI (if applicable)
        - content_start: Initial response content
        - content_chunk: Streaming response text chunks
        - assistant_message: Complete saved assistant message
        - error: Error information

    Raises:
        ResourceNotFoundError (404): Chat session not found or doesn't belong to user
        RateLimitExceededError (429): Too many requests (10 per minute limit)
        ChatSessionError (400): Error processing the message

    Rate Limit:
        10 requests per minute per user

    Example Request:
        ```json
        {
            "content": "I need guidance about my career path and future opportunities"
        }
        ```

    Example Stream Response:
        ```
        data: {"type": "user_message", "message": {...}}

        data: {"type": "cards", "cards": [{"name": "The Fool", "orientation": "upright", ...}]}

        data: {"type": "content_start", "content": "I've drawn 3 cards for your question..."}

        data: {"type": "content_chunk", "content": "The Fool represents..."}

        data: {"type": "assistant_message", "message": {...}}
        ```

    AI Features:
        - Automatically detects when tarot guidance is needed
        - Draws 1-10 cards based on question complexity
        - Provides personalized interpretations
        - Maintains conversation context
        - Supports both casual conversation and tarot readings

    Note:
        This endpoint uses Server-Sent Events for real-time streaming.
        The Content-Type is "text/event-stream".
    """
    try:
        check_rate_limit(current_user.id)

        # Validate message content before saving or streaming
        if message_request.content is None or (
            isinstance(message_request.content, str) and message_request.content.strip() == ""
        ):
            raise HTTPException(status_code=422, detail="Message content cannot be empty.")

        # Verify session belongs to user
        session = (
            db.query(ChatSession).filter(ChatSession.id == session_id, ChatSession.user_id == current_user.id).first()
        )
        if not session:
            raise ResourceNotFoundError(message="Chat session not found", details={"session_id": session_id})

        # Save user message
        user_message = Message(chat_session_id=session_id, content=message_request.content, role="user")
        db.add(user_message)
        try:
            db.commit()
            db.refresh(user_message)
        except Exception as db_exc:
            db.rollback()
            logger.logger.error(
                "Error saving user message before streaming",
                extra={
                    "error": str(db_exc),
                    "user_id": current_user.id,
                    "session_id": session_id,
                    "content": message_request.content,
                },
            )
            raise HTTPException(status_code=500, detail="Failed to save user message.")

        logger.logger.info(
            "User message saved",
            extra={
                "user_id": current_user.id,
                "session_id": session_id,
                "message_id": user_message.id,
            },
        )

        user_message_response = MessageResponse.from_orm(user_message)

        async def generate_streaming_response():
            try:
                # Send the user message first
                user_message_dict = user_message_response.model_dump(mode="json")  # Pydantic V2 style
                event_payload_user = {
                    "type": "user_message",
                    "message": user_message_dict,
                }
                yield f"data: {json.dumps(event_payload_user)}\n\n"

                # Initialize LLM with tool calling
                llm = ChatOpenAI(
                    temperature=0.7,
                    model=settings.OPENAI_MODEL,
                    streaming=True,
                    max_tokens=800,
                )

                # Create the system message
                system_message_content = load_system_prompt()

                # Fetch historical messages for context
                db_messages_for_context = (
                    db.query(Message)
                    .filter(Message.chat_session_id == session_id)
                    .order_by(Message.created_at.asc())
                    .all()
                )

                messages_for_llm = [{"role": "system", "content": system_message_content}]
                for msg in db_messages_for_context:
                    messages_for_llm.append({"role": msg.role, "content": msg.content})
                # The current user's message (message_request.content) is the last one in db_messages_for_context
                # because it was saved to the DB just before this function's parent (create_message) called this
                # generator.

                # Get model response with tool calling
                llm_response = llm.bind_tools([DRAW_CARDS_TOOL]).invoke(messages_for_llm)

                # Check if the model wants to use tools
                if llm_response.tool_calls:
                    tool_call = llm_response.tool_calls[0]

                    if tool_call["name"] == "draw_cards":
                        # Execute the tool
                        args = tool_call["args"]
                        user_question = args.get("user_question", message_request.content)
                        num_cards_to_draw = args.get("num_cards", 3)

                        # Pass the db session and user to the tool executor
                        tool_result = execute_draw_cards_tool(
                            user_question, num_cards_to_draw, db=db, current_user=current_user
                        )

                        if tool_result["success"]:
                            # Send cards to frontend (using cards_for_display)
                            cards_data = {
                                "type": "cards",
                                "cards": tool_result["cards_for_display"],
                            }
                            yield f"data: {json.dumps(cards_data)}\n\n"

                            # Start streaming the reading
                            start_message_content = (
                                f"I've drawn {len(tool_result['cards_for_display'])} cards "
                                f"for your question: '{user_question}'\n\n"
                            )
                            yield f"data: {json.dumps({'type': 'content_start', 'content': start_message_content})}\n\n"

                            # Send card details (using cards_for_display)
                            card_details_content = ""
                            for i, card_display_data in enumerate(tool_result["cards_for_display"], 1):
                                card_details_content += (
                                    f"**Card {i}: {card_display_data['name']} "
                                    f"({card_display_data['orientation']})**\n"
                                    f"{card_display_data['meaning']}\n\n"
                                )
                            yield f"data: {json.dumps({'type': 'content_chunk', 'content': card_details_content})}\n\n"

                            # Send reading header
                            reading_header = "## Tarot Reading\n\n"
                            yield f"data: {json.dumps({'type': 'content_chunk', 'content': reading_header})}\n\n"

                            # Generate streaming reading using the TarotReader's create_reading method
                            full_reading_text = ""
                            async for chunk in reader.create_reading(
                                user_question, tool_result["cards_for_display"]
                            ):  # Pass display data for reading generation
                                full_reading_text += chunk
                                yield f"data: {json.dumps({'type': 'content_chunk', 'content': chunk})}\n\n"

                            # Save the complete AI response
                            complete_ai_content = (
                                start_message_content + card_details_content + reading_header + full_reading_text
                            )

                            # Validate that the chat session still exists before saving
                            if not validate_chat_session_exists(db, session_id, current_user.id):
                                logger.logger.error(
                                    "Chat session no longer exists while saving assistant message",
                                    extra={
                                        "user_id": current_user.id,
                                        "session_id": session_id,
                                    },
                                )
                                raise HTTPException(
                                    status_code=404, detail="Chat session not found. Please refresh and try again."
                                )

                            ai_message = Message(
                                chat_session_id=session_id,
                                content=complete_ai_content,
                                role="assistant",
                            )
                            db.add(ai_message)
                            db.flush()

                            card_associations_to_add = []
                            if tool_result.get("card_orientation_tuples"):
                                for card_instance, orientation_str in tool_result["card_orientation_tuples"]:
                                    association = MessageCardAssociation(
                                        message_id=ai_message.id,
                                        card_id=card_instance.id,
                                        orientation=orientation_str,
                                    )
                                    card_associations_to_add.append(association)
                                db.add_all(card_associations_to_add)

                            db.commit()
                            db.refresh(ai_message)

                            ai_message_response_pydantic = MessageResponse.from_orm(ai_message)
                            # Pydantic V2 style for a dict ready for json.dumps
                            message_dict_assistant = ai_message_response_pydantic.model_dump(mode="json")
                            event_payload_assistant = {
                                "type": "assistant_message",
                                "message": message_dict_assistant,
                            }
                            yield f"data: {json.dumps(event_payload_assistant)}\n\n"

                        else:
                            # Handle case where turn consumption failed
                            if "turns available" in tool_result.get("error", ""):
                                total_remaining = tool_result.get("total_remaining_turns", 0)
                                if total_remaining > 0:
                                    error_content = (
                                        f"I'd love to draw cards for you, but it looks like there was an issue "
                                        f"with your reading credits. You have {total_remaining} readings remaining. "
                                        f"Please try again, or contact support if the problem continues."
                                    )
                                else:
                                    error_content = (
                                        "I'd love to draw cards for you, but you've used up all your readings for now! "
                                        "You can get more readings by upgrading your plan or purchasing additional credits. "
                                        "Don't worry though - you'll receive 3 free readings at the beginning of each month. "
                                        "Check your profile page for subscription options."
                                    )

                                # Send error message to frontend
                                yield f"data: {json.dumps({'type': 'content_chunk', 'content': error_content})}\n\n"

                                # Save error message to chat
                                error_message = Message(
                                    chat_session_id=session_id,
                                    content=error_content,
                                    role="assistant",
                                )
                                db.add(error_message)
                                db.commit()
                                db.refresh(error_message)

                                error_message_response = MessageResponse.from_orm(error_message)
                                message_dict_error = error_message_response.model_dump(mode="json")
                                event_payload_error = {
                                    "type": "assistant_message",
                                    "message": message_dict_error,
                                }
                                yield f"data: {json.dumps(event_payload_error)}\n\n"
                            else:
                                error_content = (
                                    "I apologize, but I'm having trouble drawing cards right now. "
                                    "Please try again in a moment."
                                )
                                raise HTTPException(status_code=500, detail=error_content)

                else:
                    response_content = ""
                    async for chunk in llm.astream(messages_for_llm):
                        if chunk.content:
                            response_content += chunk.content  # Accumulate content for saving
                            yield f"data: {json.dumps({'type': 'content_chunk', 'content': chunk.content})}\n\n"

                    # Save the complete AI response if no tools were called
                    if response_content:  # Ensure there's content to save
                        # Validate that the chat session still exists before saving
                        if not validate_chat_session_exists(db, session_id, current_user.id):
                            logger.logger.error(
                                "Chat session no longer exists while saving assistant message (no tools)",
                                extra={
                                    "user_id": current_user.id,
                                    "session_id": session_id,
                                },
                            )
                            raise HTTPException(
                                status_code=404, detail="Chat session not found. Please refresh and try again."
                            )

                        ai_message = Message(
                            chat_session_id=session_id,
                            content=response_content,
                            role="assistant",
                        )
                        db.add(ai_message)
                        db.commit()
                        db.refresh(ai_message)

                        no_tool_ai_message_response = MessageResponse.from_orm(ai_message)
                        # Pydantic V2 style for a dict ready for json.dumps
                        message_dict_no_tool = no_tool_ai_message_response.model_dump(mode="json")
                        event_payload_no_tool = {
                            "type": "assistant_message",
                            "message": message_dict_no_tool,
                        }
                        yield f"data: {json.dumps(event_payload_no_tool)}\n\n"
                    else:  # Handle case where LLM stream yields no content (should be rare)
                        # Validate that the chat session still exists before saving
                        if not validate_chat_session_exists(db, session_id, current_user.id):
                            logger.logger.error(
                                "Chat session no longer exists while saving empty assistant message",
                                extra={
                                    "user_id": current_user.id,
                                    "session_id": session_id,
                                },
                            )
                            raise HTTPException(
                                status_code=404, detail="Chat session not found. Please refresh and try again."
                            )

                        empty_ai_message = Message(chat_session_id=session_id, content="", role="assistant")
                        db.add(empty_ai_message)
                        db.commit()
                        db.refresh(empty_ai_message)
                        empty_message_response = MessageResponse.from_orm(empty_ai_message)
                        message_dict_empty = empty_message_response.model_dump(mode="json")
                        event_payload_empty = {
                            "type": "assistant_message",
                            "message": message_dict_empty,
                        }
                        yield f"data: {json.dumps(event_payload_empty)}\n\n"

                logger.logger.info(
                    "Streaming response completed",
                    extra={
                        "user_id": current_user.id,
                        "session_id": session_id,
                        "used_tools": bool(llm_response.tool_calls) if "llm_response" in locals() else False,
                    },
                )

            except Exception as e_stream:
                logger.logger.error(f"Error during streaming response: {e_stream}", exc_info=True)
                raise HTTPException(
                    status_code=500, detail=f"An unexpected error occurred during response generation: {str(e_stream)}"
                )

        return StreamingResponse(
            generate_streaming_response(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "*",
            },
        )

    except RateLimitExceededError:
        db.rollback()
        raise
    except ResourceNotFoundError:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.logger.error(
            "Error in message creation",
            extra={
                "error": str(e),
                "user_id": current_user.id,
                "session_id": session_id,
            },
        )
        raise ChatSessionError(message="Error processing message", details={"error": str(e)})


@router.get("/search", response_model=list[ChatSessionResponse])
@limiter.limit(RATE_LIMITS["default"])
def search_chat_sessions(
    request: Request,
    q: str,
    response: Response,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Search Chat Sessions

    Search through the authenticated user's chat sessions by title.
    This enables the search functionality in the enhanced navigation.

    Args:
        q (str): Search query string
        current_user (User): Authenticated user (automatically injected)

    Returns:
        List[ChatSessionResponse]: List of matching chat sessions

    Raises:
        RateLimitExceededError (429): Too many requests (10 per minute limit)
        ChatSessionError (400): Error during search

    Rate Limit:
        10 requests per minute per user

    Example Request:
        GET /chat/search?q=career

    Example Response:
        ```json
        [
            {
                "id": 123,
                "title": "Career Guidance Session",
                "created_at": "2024-01-01T12:00:00Z"
            }
        ]
        ```
    """
    try:
        check_rate_limit(current_user.id)

        # Search sessions by title
        sessions = (
            db.query(ChatSession)
            .filter(ChatSession.user_id == current_user.id, ChatSession.title.ilike(f"%{q}%"))
            .order_by(ChatSession.created_at.desc())
            .limit(20)
            .all()
        )

        logger.logger.info(
            "Chat sessions searched",
            extra={"user_id": current_user.id, "query": q, "results_count": len(sessions)},
        )
        return sessions
    except RateLimitExceededError:
        raise
    except Exception as e:
        logger.logger.error(
            "Error searching chat sessions",
            extra={"error": str(e), "user_id": current_user.id, "query": q},
        )
        raise ChatSessionError(message="Error searching chat sessions", details={"error": str(e)})
