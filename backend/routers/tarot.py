import time

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session

from database import get_db
from models import Spread, User
from routers.auth import get_current_user
from schemas import CardResponse, ReadingRequest, SpreadListResponse, SpreadResponse
from services.subscription_service import SubscriptionService
from tarot_reader import TarotReader
from utils.error_handlers import TarotAPIException, ValidationError, logger
from utils.metrics import active_users, track_card_drawn, track_tarot_reading
from utils.rate_limiter import RATE_LIMITS, limiter

router = APIRouter(prefix="/tarot", tags=["tarot"])


@router.post("/reading", response_model=list[CardResponse])
@limiter.limit(RATE_LIMITS["tarot"])
async def get_reading(
    request: Request,
    request_data: ReadingRequest,
    response: Response,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Generate Tarot Reading

    Draw tarot cards and get their meanings for a specific concern or question.
    This is an alternative to the chat-based tarot reading functionality.

    Args:
        request (Request): FastAPI request object
        request_data (ReadingRequest): Reading request data
            - concern (str): The user's question, concern, or area of life for guidance
            - num_cards (int, optional): Number of cards to draw (1-10, default: 3)
        response (Response): FastAPI response object
        current_user (User): Authenticated user (automatically injected)

    Returns:
        List[CardResponse]: List of drawn cards with their interpretations
            Each card contains:
            - name (str): Card name (e.g., "The Fool", "Three of Cups")
            - orientation (str): "upright" or "reversed"
            - meaning (str): Interpretation of the card for the given concern
            - image_url (str, optional): URL to the card image

    Raises:
        ValidationError (400): Invalid number of cards (must be between 1 and 10)
        AuthenticationError (401): User not authenticated

    Example Request:
        ```json
        {
            "concern": "I'm considering a career change and need guidance",
            "num_cards": 3
        }
        ```

    Example Response:
        ```json
        [
            {
                "name": "The Fool",
                "orientation": "upright",
                "meaning": "New beginnings, taking a leap of faith in your career",
                "image_url": "/images/the-fool.jpg"
            },
            {
                "name": "Three of Pentacles",
                "orientation": "reversed",
                "meaning": "Lack of collaboration, need to work on skills",
                "image_url": "/images/three-of-pentacles.jpg"
            },
            {
                "name": "The Star",
                "orientation": "upright",
                "meaning": "Hope and inspiration for your future path",
                "image_url": "/images/the-star.jpg"
            }
        ]
        ```

    Note:
        Cards are randomly drawn and orientations are determined by the tarot reading algorithm.
        The meanings are contextually generated based on the user's concern.
    """
    start_time = time.time()
    reading_type = f"{request_data.num_cards}_card"

    try:
        # Check and consume turns before generating reading
        subscription_service = SubscriptionService()
        turn_result = subscription_service.consume_user_turn(db, current_user, usage_context="reading")

        # If turn consumption failed, but the user is specialized premium, allow the reading to proceed.
        if not turn_result.success and current_user.is_specialized_premium:
            # Log the fallback and continue without raising an error
            logger.logger.warning(
                "Turn consumption failed but user is specialized premium – proceeding without consuming a turn",
                extra={"user_id": current_user.id},
            )
        elif not turn_result.success:
            track_tarot_reading(reading_type, time.time() - start_time, "insufficient_turns")
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail={
                    "message": "No turns available",
                    "remaining_free_turns": turn_result.remaining_free_turns,
                    "remaining_paid_turns": turn_result.remaining_paid_turns,
                    "total_remaining_turns": turn_result.total_remaining_turns,
                },
            )

        # Increment active users (simulate session tracking)
        active_users.inc()

        # Get spread if specified
        spread = None
        if request_data.spread_id:
            spread = db.query(Spread).filter(Spread.id == request_data.spread_id).first()
            if not spread:
                track_tarot_reading(reading_type, time.time() - start_time, "validation_error")
                raise ValidationError(
                    message="Spread not found",
                    details={"spread_id": request_data.spread_id},
                )
            # Use spread's card count, but allow override if num_cards is explicitly provided
            if request_data.num_cards == 3:  # Default value, use spread's count
                request_data.num_cards = spread.num_cards

        # Validate number of cards
        if request_data.num_cards < 1 or request_data.num_cards > 10:
            track_tarot_reading(reading_type, time.time() - start_time, "validation_error")
            raise ValidationError(
                message="Invalid number of cards",
                details={"num_cards": "Must be between 1 and 10"},
            )

        # Initialize TarotReader with user's favorite deck
        reader = TarotReader(db=db, deck_id=current_user.favorite_deck_id)

        # Draw cards with metrics tracking
        cards = reader.shuffle_and_draw(request_data.num_cards, spread=spread)

        # Format response and track individual cards
        response_cards = []
        for i, card in enumerate(cards):
            # Track each card drawn with position
            position_name = card.get("position", f"position_{i + 1}")
            track_card_drawn(card["name"], position_name)

            response_cards.append(
                CardResponse(
                    name=card["name"],
                    orientation=card["orientation"],
                    meaning=card["meaning"],
                    image_url=card.get("image_url"),
                    position=card.get("position"),
                    position_index=card.get("position_index", i),
                )
            )

        # Track successful reading
        duration = time.time() - start_time
        track_tarot_reading(reading_type, duration, "success")

        logger.logger.info(
            "Reading generated successfully",
            extra={
                "user_id": current_user.id,
                "num_cards": request_data.num_cards,
                "concern": request_data.concern,
                "duration": duration,
                "deck_id": current_user.favorite_deck_id,
            },
        )
        return response_cards

    except ValidationError:
        # Metrics already tracked above
        raise
    except Exception as e:
        # Track failed reading
        duration = time.time() - start_time
        track_tarot_reading(reading_type, duration, "error")

        logger.logger.error(
            "Error generating reading",
            extra={"user_id": current_user.id, "error": str(e)},
        )
        raise TarotAPIException(message="Error generating reading", details={"error": str(e)})
    finally:
        # Decrement active users
        active_users.dec()


@router.get("/spreads", response_model=list[SpreadListResponse])
async def get_spreads(db: Session = Depends(get_db)):
    """
    Get Available Tarot Spreads

    Retrieve a list of all available tarot spread templates.

    Returns:
        List[SpreadListResponse]: List of available spreads with basic information
    """
    spreads = db.query(Spread).order_by(Spread.num_cards, Spread.name).all()
    return spreads


@router.get("/spreads/{spread_id}", response_model=SpreadResponse)
async def get_spread(spread_id: int, db: Session = Depends(get_db)):
    """
    Get Specific Tarot Spread

    Retrieve detailed information about a specific tarot spread including positions.

    Args:
        spread_id (int): The ID of the spread to retrieve

    Returns:
        SpreadResponse: Detailed information about the spread

    Raises:
        ValidationError (404): Spread not found
    """
    spread = db.query(Spread).filter(Spread.id == spread_id).first()
    if not spread:
        raise ValidationError(message="Spread not found", details={"spread_id": spread_id})

    return SpreadResponse(
        id=spread.id,
        name=spread.name,
        description=spread.description,
        num_cards=spread.num_cards,
        positions=spread.get_positions(),
        created_at=spread.created_at,
    )
