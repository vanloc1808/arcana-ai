from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.security import HTTPBearer
from sqlalchemy import desc, func, or_
from sqlalchemy.orm import Session

from database import get_db
from models import Card, ChatSession, Deck, Message, SharedReading, Spread, User
from routers.auth import get_current_user
from schemas import (
    AdminCardCreate,
    AdminCardResponse,
    AdminCardUpdate,
    AdminChatSessionResponse,
    AdminDashboardStats,
    AdminDeckCreate,
    AdminDeckResponse,
    AdminDeckUpdate,
    AdminMessageResponse,
    AdminSearchRequest,
    AdminSharedReadingResponse,
    AdminSpreadCreate,
    AdminSpreadResponse,
    AdminSpreadUpdate,
    AdminUserResponse,
    AdminUserUpdate,
)
from utils.avatar_utils import avatar_manager

router = APIRouter(prefix="/admin", tags=["Admin"])
security = HTTPBearer()


def build_admin_user_response(user: User, base_url: str = "") -> AdminUserResponse:
    """Helper function to build AdminUserResponse with all fields"""
    # Get avatar URL
    avatar_url = avatar_manager.get_avatar_url(user.avatar_filename, base_url)

    return AdminUserResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        full_name=user.full_name,
        created_at=user.created_at,
        is_active=user.is_active,
        is_admin=user.is_admin or False,
        is_specialized_premium=user.is_specialized_premium or False,
        favorite_deck_id=user.favorite_deck_id,
        # Subscription and turn fields (read-only)
        subscription_status=user.subscription_status or "none",
        number_of_free_turns=user.number_of_free_turns or 0,
        number_of_paid_turns=user.number_of_paid_turns or 0,
        total_turns=user.get_total_turns(),
        last_free_turns_reset=user.last_free_turns_reset,
        lemon_squeezy_customer_id=user.lemon_squeezy_customer_id,
        # Avatar
        avatar_url=avatar_url,
        # Counts
        chat_sessions_count=len(user.chat_sessions),
        shared_readings_count=len(user.shared_readings),
    )


# Admin authentication middleware
async def get_admin_user(current_user: User = Depends(get_current_user)):
    """Ensure the current user is an admin"""
    if not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return current_user


# Dashboard
@router.get("/dashboard", response_model=AdminDashboardStats)
async def get_dashboard_stats(request: Request, db: Session = Depends(get_db), admin_user: User = Depends(get_admin_user)):
    """Get admin dashboard statistics"""

    # Get counts
    total_users = db.query(User).count()
    active_users = db.query(User).filter(User.is_active is True).count()
    total_chat_sessions = db.query(ChatSession).count()
    total_messages = db.query(Message).count()
    total_cards = db.query(Card).count()
    total_decks = db.query(Deck).count()
    total_spreads = db.query(Spread).count()
    total_shared_readings = db.query(SharedReading).count()
    total_views = db.query(func.sum(SharedReading.view_count)).scalar() or 0

    # Get recent data (last 7 days)
    week_ago = datetime.utcnow() - timedelta(days=7)

    recent_users = db.query(User).filter(User.created_at >= week_ago).order_by(desc(User.created_at)).limit(5).all()

    recent_chat_sessions = (
        db.query(ChatSession)
        .join(User)
        .filter(ChatSession.created_at >= week_ago)
        .order_by(desc(ChatSession.created_at))
        .limit(5)
        .all()
    )

    recent_shared_readings = (
        db.query(SharedReading)
        .join(User)
        .filter(SharedReading.created_at >= week_ago)
        .order_by(desc(SharedReading.created_at))
        .limit(5)
        .all()
    )

    return AdminDashboardStats(
        total_users=total_users,
        active_users=active_users,
        total_chat_sessions=total_chat_sessions,
        total_messages=total_messages,
        total_cards=total_cards,
        total_decks=total_decks,
        total_spreads=total_spreads,
        total_shared_readings=total_shared_readings,
        total_views=total_views,
        recent_users=[build_admin_user_response(user, str(request.base_url).rstrip('/')) for user in recent_users],
        recent_chat_sessions=[
            AdminChatSessionResponse(
                id=session.id,
                title=session.title,
                created_at=session.created_at,
                user_id=session.user_id,
                username=session.user.username,
                messages_count=len(session.messages),
            )
            for session in recent_chat_sessions
        ],
        recent_shared_readings=[
            AdminSharedReadingResponse(
                id=reading.id,
                uuid=reading.uuid,
                title=reading.title,
                concern=reading.concern,
                cards_data=reading.get_cards_data(),
                spread_name=reading.spread_name,
                deck_name=reading.deck_name,
                created_at=reading.created_at,
                expires_at=reading.expires_at,
                is_public=reading.is_public,
                view_count=reading.view_count,
                user_id=reading.user_id,
                username=reading.user.username,
            )
            for reading in recent_shared_readings
        ],
    )


# Search functionality
@router.post("/search")
async def admin_search(
    search_request: AdminSearchRequest, request: Request, db: Session = Depends(get_db), admin_user: User = Depends(get_admin_user)
):
    """Search across different models"""

    query = f"%{search_request.query}%"

    if search_request.model_type == "users":
        results = (
            db.query(User)
            .filter(or_(User.username.ilike(query), User.email.ilike(query), User.full_name.ilike(query)))
            .offset(search_request.offset)
            .limit(search_request.limit)
            .all()
        )

        return [build_admin_user_response(user, str(request.base_url).rstrip('/')) for user in results]

    elif search_request.model_type == "chat_sessions":
        results = (
            db.query(ChatSession)
            .join(User)
            .filter(or_(ChatSession.title.ilike(query), User.username.ilike(query)))
            .offset(search_request.offset)
            .limit(search_request.limit)
            .all()
        )

        return [
            AdminChatSessionResponse(
                id=session.id,
                title=session.title,
                created_at=session.created_at,
                user_id=session.user_id,
                username=session.user.username,
                messages_count=len(session.messages),
            )
            for session in results
        ]

    elif search_request.model_type == "messages":
        results = (
            db.query(Message)
            .join(ChatSession)
            .join(User)
            .filter(or_(Message.content.ilike(query), User.username.ilike(query)))
            .offset(search_request.offset)
            .limit(search_request.limit)
            .all()
        )

        return [
            AdminMessageResponse(
                id=message.id,
                content=message.content,
                role=message.role,
                created_at=message.created_at,
                chat_session_id=message.chat_session_id,
                chat_session_title=message.chat_session.title,
                username=message.chat_session.user.username,
                cards_count=len(message.card_associations),
            )
            for message in results
        ]

    elif search_request.model_type == "cards":
        results = (
            db.query(Card)
            .outerjoin(Deck)
            .filter(or_(Card.name.ilike(query), Card.suit.ilike(query), Card.rank.ilike(query), Deck.name.ilike(query)))
            .offset(search_request.offset)
            .limit(search_request.limit)
            .all()
        )

        return [
            AdminCardResponse(
                id=card.id,
                name=card.name,
                suit=card.suit,
                rank=card.rank,
                image_url=card.image_url,
                description_short=card.description_short,
                description_upright=card.description_upright,
                description_reversed=card.description_reversed,
                element=card.element,
                astrology=card.astrology,
                numerology=card.numerology,
                deck_id=card.deck_id,
                deck_name=card.deck.name if card.deck else None,
                message_associations_count=len(card.message_associations),
            )
            for card in results
        ]

    elif search_request.model_type == "decks":
        results = (
            db.query(Deck)
            .filter(or_(Deck.name.ilike(query), Deck.description.ilike(query)))
            .offset(search_request.offset)
            .limit(search_request.limit)
            .all()
        )

        return [
            AdminDeckResponse(
                id=deck.id,
                name=deck.name,
                description=deck.description,
                created_at=deck.created_at,
                cards_count=len(deck.cards),
            )
            for deck in results
        ]

    elif search_request.model_type == "spreads":
        results = (
            db.query(Spread)
            .filter(or_(Spread.name.ilike(query), Spread.description.ilike(query)))
            .offset(search_request.offset)
            .limit(search_request.limit)
            .all()
        )

        return [
            AdminSpreadResponse(
                id=spread.id,
                name=spread.name,
                description=spread.description,
                num_cards=spread.num_cards,
                positions=spread.get_positions(),
                created_at=spread.created_at,
            )
            for spread in results
        ]

    elif search_request.model_type == "shared_readings":
        results = (
            db.query(SharedReading)
            .join(User)
            .filter(
                or_(SharedReading.title.ilike(query), SharedReading.concern.ilike(query), User.username.ilike(query))
            )
            .offset(search_request.offset)
            .limit(search_request.limit)
            .all()
        )

        return [
            AdminSharedReadingResponse(
                id=reading.id,
                uuid=reading.uuid,
                title=reading.title,
                concern=reading.concern,
                cards_data=reading.get_cards_data(),
                spread_name=reading.spread_name,
                deck_name=reading.deck_name,
                created_at=reading.created_at,
                expires_at=reading.expires_at,
                is_public=reading.is_public,
                view_count=reading.view_count,
                user_id=reading.user_id,
                username=reading.user.username,
            )
            for reading in results
        ]


# User Management
@router.get("/users", response_model=list[AdminUserResponse])
async def list_users(
    request: Request,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_admin_user),
):
    """List all users with pagination"""
    users = db.query(User).offset(skip).limit(limit).all()

    return [build_admin_user_response(user, str(request.base_url).rstrip('/')) for user in users]


@router.get("/users/{user_id}", response_model=AdminUserResponse)
async def get_user(user_id: int, request: Request, db: Session = Depends(get_db), admin_user: User = Depends(get_admin_user)):
    """Get a specific user by ID"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    return build_admin_user_response(user, str(request.base_url).rstrip('/'))


@router.put("/users/{user_id}", response_model=AdminUserResponse)
async def update_user(
    user_id: int,
    user_update: AdminUserUpdate,
    request: Request,
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_admin_user),
):
    """Update a user"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    update_data = user_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(user, field, value)

    db.commit()
    db.refresh(user)

    return build_admin_user_response(user, str(request.base_url).rstrip('/'))


@router.delete("/users/{user_id}")
async def delete_user(user_id: int, db: Session = Depends(get_db), admin_user: User = Depends(get_admin_user)):
    """Delete a user"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    db.delete(user)
    db.commit()

    return {"message": "User deleted successfully"}


# Chat Session Management
@router.get("/chat-sessions", response_model=list[AdminChatSessionResponse])
async def list_chat_sessions(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_admin_user),
):
    """List all chat sessions with pagination"""
    sessions = db.query(ChatSession).join(User).offset(skip).limit(limit).all()

    return [
        AdminChatSessionResponse(
            id=session.id,
            title=session.title,
            created_at=session.created_at,
            user_id=session.user_id,
            username=session.user.username,
            messages_count=len(session.messages),
        )
        for session in sessions
    ]


@router.get("/chat-sessions/{session_id}", response_model=AdminChatSessionResponse)
async def get_chat_session(session_id: int, db: Session = Depends(get_db), admin_user: User = Depends(get_admin_user)):
    """Get a specific chat session by ID"""
    session = db.query(ChatSession).join(User).filter(ChatSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")

    return AdminChatSessionResponse(
        id=session.id,
        title=session.title,
        created_at=session.created_at,
        user_id=session.user_id,
        username=session.user.username,
        messages_count=len(session.messages),
    )


@router.delete("/chat-sessions/{session_id}")
async def delete_chat_session(
    session_id: int, db: Session = Depends(get_db), admin_user: User = Depends(get_admin_user)
):
    """Delete a chat session"""
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")

    db.delete(session)
    db.commit()

    return {"message": "Chat session deleted successfully"}


# Message Management
@router.get("/messages", response_model=list[AdminMessageResponse])
async def list_messages(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_admin_user),
):
    """List all messages with pagination"""
    messages = db.query(Message).join(ChatSession).join(User).offset(skip).limit(limit).all()

    return [
        AdminMessageResponse(
            id=message.id,
            content=message.content,
            role=message.role,
            created_at=message.created_at,
            chat_session_id=message.chat_session_id,
            chat_session_title=message.chat_session.title,
            username=message.chat_session.user.username,
            cards_count=len(message.card_associations),
        )
        for message in messages
    ]


@router.get("/messages/{message_id}", response_model=AdminMessageResponse)
async def get_message(message_id: int, db: Session = Depends(get_db), admin_user: User = Depends(get_admin_user)):
    """Get a specific message by ID"""
    message = db.query(Message).join(ChatSession).join(User).filter(Message.id == message_id).first()
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")

    return AdminMessageResponse(
        id=message.id,
        content=message.content,
        role=message.role,
        created_at=message.created_at,
        chat_session_id=message.chat_session_id,
        chat_session_title=message.chat_session.title,
        username=message.chat_session.user.username,
        cards_count=len(message.card_associations),
    )


@router.delete("/messages/{message_id}")
async def delete_message(message_id: int, db: Session = Depends(get_db), admin_user: User = Depends(get_admin_user)):
    """Delete a message"""
    message = db.query(Message).filter(Message.id == message_id).first()
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")

    db.delete(message)
    db.commit()

    return {"message": "Message deleted successfully"}


# Card Management
@router.get("/cards", response_model=list[AdminCardResponse])
async def list_cards(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_admin_user),
):
    """List all cards with pagination"""
    cards = db.query(Card).outerjoin(Deck).offset(skip).limit(limit).all()

    return [
        AdminCardResponse(
            id=card.id,
            name=card.name,
            suit=card.suit,
            rank=card.rank,
            image_url=card.image_url,
            description_short=card.description_short,
            description_upright=card.description_upright,
            description_reversed=card.description_reversed,
            element=card.element,
            astrology=card.astrology,
            numerology=card.numerology,
            deck_id=card.deck_id,
            deck_name=card.deck.name if card.deck else None,
            message_associations_count=len(card.message_associations),
        )
        for card in cards
    ]


@router.get("/cards/{card_id}", response_model=AdminCardResponse)
async def get_card(card_id: int, db: Session = Depends(get_db), admin_user: User = Depends(get_admin_user)):
    """Get a specific card by ID"""
    card = db.query(Card).outerjoin(Deck).filter(Card.id == card_id).first()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")

    return AdminCardResponse(
        id=card.id,
        name=card.name,
        suit=card.suit,
        rank=card.rank,
        image_url=card.image_url,
        description_short=card.description_short,
        description_upright=card.description_upright,
        description_reversed=card.description_reversed,
        element=card.element,
        astrology=card.astrology,
        numerology=card.numerology,
        deck_id=card.deck_id,
        deck_name=card.deck.name if card.deck else None,
        message_associations_count=len(card.message_associations),
    )


@router.post("/cards", response_model=AdminCardResponse)
async def create_card(
    card_create: AdminCardCreate, db: Session = Depends(get_db), admin_user: User = Depends(get_admin_user)
):
    """Create a new card"""
    card = Card(**card_create.model_dump())
    db.add(card)
    db.commit()
    db.refresh(card)

    return AdminCardResponse(
        id=card.id,
        name=card.name,
        suit=card.suit,
        rank=card.rank,
        image_url=card.image_url,
        description_short=card.description_short,
        description_upright=card.description_upright,
        description_reversed=card.description_reversed,
        element=card.element,
        astrology=card.astrology,
        numerology=card.numerology,
        deck_id=card.deck_id,
        deck_name=card.deck.name if card.deck else None,
        message_associations_count=len(card.message_associations),
    )


@router.put("/cards/{card_id}", response_model=AdminCardResponse)
async def update_card(
    card_id: int,
    card_update: AdminCardUpdate,
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_admin_user),
):
    """Update a card"""
    card = db.query(Card).filter(Card.id == card_id).first()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")

    update_data = card_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(card, field, value)

    db.commit()
    db.refresh(card)

    return AdminCardResponse(
        id=card.id,
        name=card.name,
        suit=card.suit,
        rank=card.rank,
        image_url=card.image_url,
        description_short=card.description_short,
        description_upright=card.description_upright,
        description_reversed=card.description_reversed,
        element=card.element,
        astrology=card.astrology,
        numerology=card.numerology,
        deck_id=card.deck_id,
        deck_name=card.deck.name if card.deck else None,
        message_associations_count=len(card.message_associations),
    )


@router.delete("/cards/{card_id}")
async def delete_card(card_id: int, db: Session = Depends(get_db), admin_user: User = Depends(get_admin_user)):
    """Delete a card"""
    card = db.query(Card).filter(Card.id == card_id).first()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")

    db.delete(card)
    db.commit()

    return {"message": "Card deleted successfully"}


# Deck Management
@router.get("/decks", response_model=list[AdminDeckResponse])
async def list_decks(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_admin_user),
):
    """List all decks with pagination"""
    decks = db.query(Deck).offset(skip).limit(limit).all()

    return [
        AdminDeckResponse(
            id=deck.id,
            name=deck.name,
            description=deck.description,
            created_at=deck.created_at,
            cards_count=len(deck.cards),
        )
        for deck in decks
    ]


@router.get("/decks/{deck_id}", response_model=AdminDeckResponse)
async def get_deck(deck_id: int, db: Session = Depends(get_db), admin_user: User = Depends(get_admin_user)):
    """Get a specific deck by ID"""
    deck = db.query(Deck).filter(Deck.id == deck_id).first()
    if not deck:
        raise HTTPException(status_code=404, detail="Deck not found")

    return AdminDeckResponse(
        id=deck.id,
        name=deck.name,
        description=deck.description,
        created_at=deck.created_at,
        cards_count=len(deck.cards),
    )


@router.post("/decks", response_model=AdminDeckResponse)
async def create_deck(
    deck_create: AdminDeckCreate, db: Session = Depends(get_db), admin_user: User = Depends(get_admin_user)
):
    """Create a new deck"""
    deck = Deck(**deck_create.model_dump())
    db.add(deck)
    db.commit()
    db.refresh(deck)

    return AdminDeckResponse(
        id=deck.id, name=deck.name, description=deck.description, created_at=deck.created_at, cards_count=0
    )


@router.put("/decks/{deck_id}", response_model=AdminDeckResponse)
async def update_deck(
    deck_id: int,
    deck_update: AdminDeckUpdate,
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_admin_user),
):
    """Update a deck"""
    deck = db.query(Deck).filter(Deck.id == deck_id).first()
    if not deck:
        raise HTTPException(status_code=404, detail="Deck not found")

    update_data = deck_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(deck, field, value)

    db.commit()
    db.refresh(deck)

    return AdminDeckResponse(
        id=deck.id,
        name=deck.name,
        description=deck.description,
        created_at=deck.created_at,
        cards_count=len(deck.cards),
    )


@router.delete("/decks/{deck_id}")
async def delete_deck(deck_id: int, db: Session = Depends(get_db), admin_user: User = Depends(get_admin_user)):
    """Delete a deck"""
    deck = db.query(Deck).filter(Deck.id == deck_id).first()
    if not deck:
        raise HTTPException(status_code=404, detail="Deck not found")

    db.delete(deck)
    db.commit()

    return {"message": "Deck deleted successfully"}


# Spread Management
@router.get("/spreads", response_model=list[AdminSpreadResponse])
async def list_spreads(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_admin_user),
):
    """List all spreads with pagination"""
    spreads = db.query(Spread).offset(skip).limit(limit).all()

    return [
        AdminSpreadResponse(
            id=spread.id,
            name=spread.name,
            description=spread.description,
            num_cards=spread.num_cards,
            positions=spread.get_positions(),
            created_at=spread.created_at,
        )
        for spread in spreads
    ]


@router.get("/spreads/{spread_id}", response_model=AdminSpreadResponse)
async def get_spread(spread_id: int, db: Session = Depends(get_db), admin_user: User = Depends(get_admin_user)):
    """Get a specific spread by ID"""
    spread = db.query(Spread).filter(Spread.id == spread_id).first()
    if not spread:
        raise HTTPException(status_code=404, detail="Spread not found")

    return AdminSpreadResponse(
        id=spread.id,
        name=spread.name,
        description=spread.description,
        num_cards=spread.num_cards,
        positions=spread.get_positions(),
        created_at=spread.created_at,
    )


@router.post("/spreads", response_model=AdminSpreadResponse)
async def create_spread(
    spread_create: AdminSpreadCreate, db: Session = Depends(get_db), admin_user: User = Depends(get_admin_user)
):
    """Create a new spread"""
    spread = Spread(**spread_create.model_dump())
    spread.set_positions(spread_create.positions)
    db.add(spread)
    db.commit()
    db.refresh(spread)

    return AdminSpreadResponse(
        id=spread.id,
        name=spread.name,
        description=spread.description,
        num_cards=spread.num_cards,
        positions=spread.get_positions(),
        created_at=spread.created_at,
    )


@router.put("/spreads/{spread_id}", response_model=AdminSpreadResponse)
async def update_spread(
    spread_id: int,
    spread_update: AdminSpreadUpdate,
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_admin_user),
):
    """Update a spread"""
    spread = db.query(Spread).filter(Spread.id == spread_id).first()
    if not spread:
        raise HTTPException(status_code=404, detail="Spread not found")

    update_data = spread_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if field == "positions" and value is not None:
            spread.set_positions(value)
        else:
            setattr(spread, field, value)

    db.commit()
    db.refresh(spread)

    return AdminSpreadResponse(
        id=spread.id,
        name=spread.name,
        description=spread.description,
        num_cards=spread.num_cards,
        positions=spread.get_positions(),
        created_at=spread.created_at,
    )


@router.delete("/spreads/{spread_id}")
async def delete_spread(spread_id: int, db: Session = Depends(get_db), admin_user: User = Depends(get_admin_user)):
    """Delete a spread"""
    spread = db.query(Spread).filter(Spread.id == spread_id).first()
    if not spread:
        raise HTTPException(status_code=404, detail="Spread not found")

    db.delete(spread)
    db.commit()

    return {"message": "Spread deleted successfully"}


# Shared Reading Management
@router.get("/shared-readings", response_model=list[AdminSharedReadingResponse])
async def list_shared_readings(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_admin_user),
):
    """List all shared readings with pagination"""
    readings = db.query(SharedReading).join(User).offset(skip).limit(limit).all()

    return [
        AdminSharedReadingResponse(
            id=reading.id,
            uuid=reading.uuid,
            title=reading.title,
            concern=reading.concern,
            cards_data=reading.get_cards_data(),
            spread_name=reading.spread_name,
            deck_name=reading.deck_name,
            created_at=reading.created_at,
            expires_at=reading.expires_at,
            is_public=reading.is_public,
            view_count=reading.view_count,
            user_id=reading.user_id,
            username=reading.user.username,
        )
        for reading in readings
    ]


@router.get("/shared-readings/{reading_id}", response_model=AdminSharedReadingResponse)
async def get_shared_reading(
    reading_id: int, db: Session = Depends(get_db), admin_user: User = Depends(get_admin_user)
):
    """Get a specific shared reading by ID"""
    reading = db.query(SharedReading).join(User).filter(SharedReading.id == reading_id).first()
    if not reading:
        raise HTTPException(status_code=404, detail="Shared reading not found")

    return AdminSharedReadingResponse(
        id=reading.id,
        uuid=reading.uuid,
        title=reading.title,
        concern=reading.concern,
        cards_data=reading.get_cards_data(),
        spread_name=reading.spread_name,
        deck_name=reading.deck_name,
        created_at=reading.created_at,
        expires_at=reading.expires_at,
        is_public=reading.is_public,
        view_count=reading.view_count,
        user_id=reading.user_id,
        username=reading.user.username,
    )


@router.delete("/shared-readings/{reading_id}")
async def delete_shared_reading(
    reading_id: int, db: Session = Depends(get_db), admin_user: User = Depends(get_admin_user)
):
    """Delete a shared reading"""
    reading = db.query(SharedReading).filter(SharedReading.id == reading_id).first()
    if not reading:
        raise HTTPException(status_code=404, detail="Shared reading not found")

    db.delete(reading)
    db.commit()

    return {"message": "Shared reading deleted successfully"}
