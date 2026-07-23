import json
import random
import time
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from fastapi.responses import StreamingResponse
from sqlalchemy import or_
from sqlalchemy.orm import Session

from config import settings
from database import get_db
from models import Card, DailyCardPull, Spread, User
from routers.auth import get_current_user, get_optional_current_user
from schemas import (
    CardOfTheDayResponse,
    CardResponse,
    CompatibilityInterpretRequest,
    CompatibilityInterpretResponse,
    CompatibilityReadingRequest,
    CompatibilityReadingResponse,
    FeaturedCardResponse,
    LibraryCardResponse,
    ReadingRequest,
    SpreadListResponse,
    SpreadResponse,
)
from services.streak_service import record_activity as record_streak_activity
from services.subscription_service import SubscriptionService
from tarot_reader import TarotReader
from utils.error_handlers import TarotAPIException, ValidationError, logger
from utils.metrics import record_tarot_reading
from utils.rate_limiter import RATE_LIMITS, limiter

router = APIRouter(prefix="/api/tarot", tags=["tarot"])


DEFAULT_DECK_ID = 1


@router.get("/featured-cards", response_model=list[FeaturedCardResponse])
async def get_featured_cards(
    count: int = 3,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_optional_current_user),
):
    """Return a random selection of Major Arcana cards for the homepage.

    When the request is authenticated, cards are drawn from the user's
    favorite deck; otherwise the default deck is used.
    """
    deck_id = (current_user.favorite_deck_id if current_user else None) or DEFAULT_DECK_ID
    major_arcana = db.query(Card).filter(Card.suit == "Major Arcana", Card.deck_id == deck_id).all()
    if not major_arcana:
        major_arcana = db.query(Card).filter(Card.suit == "Major Arcana").all()
    if not major_arcana:
        return []
    count = max(1, min(count, len(major_arcana)))
    selected = random.sample(major_arcana, count)
    return [
        FeaturedCardResponse(
            name=card.name,
            image_url=card.image_url,
            description_upright=card.description_upright,
            element=card.element,
        )
        for card in selected
    ]


@router.get("/card-of-the-day", response_model=CardOfTheDayResponse)
async def get_card_of_the_day(
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_optional_current_user),
):
    """Return today's deterministic Major Arcana card from the user's favorite deck.

    The same card is returned for every request made on the same calendar day
    for a given deck. When the request is unauthenticated, the default deck is
    used. Falls back to any Major Arcana card if the favorite deck has none.
    """
    deck_id = (current_user.favorite_deck_id if current_user else None) or DEFAULT_DECK_ID

    major_arcana = (
        db.query(Card)
        .filter(Card.suit == "Major Arcana", Card.deck_id == deck_id)
        .order_by(Card.numerology.asc().nullslast(), Card.id.asc())
        .all()
    )
    if not major_arcana:
        major_arcana = db.query(Card).filter(Card.suit == "Major Arcana").order_by(Card.id.asc()).all()
    if not major_arcana:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No Major Arcana cards available",
        )

    today = date.today()
    day_of_year = today.timetuple().tm_yday
    card = major_arcana[day_of_year % len(major_arcana)]

    if current_user is not None:
        try:
            existing = (
                db.query(DailyCardPull)
                .filter(DailyCardPull.user_id == current_user.id, DailyCardPull.pull_date == today)
                .first()
            )
            if existing is None:
                db.add(DailyCardPull(user_id=current_user.id, pull_date=today, card_id=card.id))
                db.flush()
                record_streak_activity(db, current_user.id)
            db.commit()
        except Exception as exc:  # noqa: BLE001
            db.rollback()
            logger.logger.warning(
                "Failed to record daily card pull",
                extra={"error": str(exc), "user_id": current_user.id},
            )

    return CardOfTheDayResponse(
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
    )


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
    reading_status = "error"

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
            reading_status = "insufficient_turns"
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail={
                    "message": "No turns available",
                    "remaining_free_turns": turn_result.remaining_free_turns,
                    "remaining_paid_turns": turn_result.remaining_paid_turns,
                    "total_remaining_turns": turn_result.total_remaining_turns,
                },
            )

        # Get spread if specified
        spread = None
        if request_data.spread_id:
            spread = db.query(Spread).filter(Spread.id == request_data.spread_id).first()
            if not spread:
                reading_status = "validation_error"
                raise ValidationError(
                    message="Spread not found",
                    details={"spread_id": request_data.spread_id},
                )
            # Use spread's card count, but allow override if num_cards is explicitly provided
            if request_data.num_cards == 3:  # Default value, use spread's count
                request_data.num_cards = spread.num_cards
                reading_type = f"{request_data.num_cards}_card"

        # Validate number of cards
        if request_data.num_cards < 1 or request_data.num_cards > 10:
            reading_status = "validation_error"
            raise ValidationError(
                message="Invalid number of cards",
                details={"num_cards": "Must be between 1 and 10"},
            )

        # Initialize TarotReader with user's favorite deck
        reader = TarotReader(db=db, deck_id=current_user.favorite_deck_id)

        # Draw cards
        cards = reader.shuffle_and_draw(request_data.num_cards, spread=spread)

        # Format response
        response_cards = []
        for i, card in enumerate(cards):
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

        duration = time.time() - start_time

        try:
            record_streak_activity(db, current_user.id)
            db.commit()
        except Exception as streak_exc:  # noqa: BLE001
            db.rollback()
            logger.logger.warning(
                "Failed to record streak activity for reading",
                extra={"error": str(streak_exc), "user_id": current_user.id},
            )

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
        reading_status = "success"
        return response_cards

    except ValidationError:
        raise
    except Exception as e:
        logger.logger.error(
            "Error generating reading",
            extra={"user_id": current_user.id, "error": str(e)},
        )
        raise TarotAPIException(message="Error generating reading", details={"error": str(e)})
    finally:
        record_tarot_reading(
            env=settings.FASTAPI_ENV,
            reading_type=reading_type,
            status=reading_status,
            duration=time.time() - start_time,
        )


COMPATIBILITY_SPREAD_NAME = "Relationship Cross"
_PERSON_A_POSITION_INDEX = 0
_PERSON_B_POSITION_INDEX = 1


def _personalize_position(position_name: str, person_a_name: str, person_b_name: str, index: int) -> str:
    if index == _PERSON_A_POSITION_INDEX:
        return f"{position_name} — {person_a_name}"
    if index == _PERSON_B_POSITION_INDEX:
        return f"{position_name} — {person_b_name}"
    return position_name


@router.post("/compatibility", response_model=CompatibilityReadingResponse)
@limiter.limit(RATE_LIMITS["tarot"])
async def get_compatibility_reading(
    request: Request,
    request_data: CompatibilityReadingRequest,
    response: Response,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Draw a relationship-focused tarot reading for two people.

    Uses the Relationship Cross spread (You / Them / Connection / Challenge /
    Outcome). The two person-position labels are personalized with the
    provided names. Consumes one turn (same as a standard reading).
    """
    start_time = time.time()
    reading_type = "compatibility"
    reading_status = "error"

    try:
        spread = db.query(Spread).filter(Spread.name == COMPATIBILITY_SPREAD_NAME).first()
        if not spread:
            reading_status = "not_found"
            logger.logger.error(
                "Compatibility spread not configured",
                extra={"spread_name": COMPATIBILITY_SPREAD_NAME},
            )
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail={
                    "message": "Compatibility readings are currently unavailable. Please try again later.",
                    "spread_name": COMPATIBILITY_SPREAD_NAME,
                },
            )
        subscription_service = SubscriptionService()
        turn_result = subscription_service.consume_user_turn(db, current_user, usage_context="reading")

        if not turn_result.success and current_user.is_specialized_premium:
            logger.logger.warning(
                "Turn consumption failed but user is specialized premium - proceeding",
                extra={"user_id": current_user.id},
            )
        elif not turn_result.success:
            reading_status = "insufficient_turns"
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail={
                    "message": "No turns available",
                    "remaining_free_turns": turn_result.remaining_free_turns,
                    "remaining_paid_turns": turn_result.remaining_paid_turns,
                    "total_remaining_turns": turn_result.total_remaining_turns,
                },
            )

        reader = TarotReader(db=db, deck_id=current_user.favorite_deck_id)
        drawn = reader.shuffle_and_draw(spread.num_cards, spread=spread)

        person_a_name = request_data.person_a.name
        person_b_name = request_data.person_b.name
        response_cards = []
        for i, card in enumerate(drawn):
            position_name = card.get("position", f"Card {i + 1}")
            personalized = _personalize_position(position_name, person_a_name, person_b_name, i)
            response_cards.append(
                CardResponse(
                    name=card["name"],
                    orientation=card["orientation"],
                    meaning=card["meaning"],
                    image_url=card.get("image_url"),
                    position=personalized,
                    position_index=card.get("position_index", i),
                )
            )

        duration = time.time() - start_time

        try:
            record_streak_activity(db, current_user.id)
            db.commit()
        except Exception as streak_exc:  # noqa: BLE001
            db.rollback()
            logger.logger.warning(
                "Failed to record streak activity for compatibility reading",
                extra={"error": str(streak_exc), "user_id": current_user.id},
            )

        logger.logger.info(
            "Compatibility reading generated",
            extra={
                "user_id": current_user.id,
                "person_a": person_a_name,
                "person_b": person_b_name,
                "duration": duration,
            },
        )
        reading_status = "success"

        return CompatibilityReadingResponse(
            person_a=request_data.person_a,
            person_b=request_data.person_b,
            focus=request_data.focus,
            spread_name=spread.name,
            cards=response_cards,
            remaining_free_turns=turn_result.remaining_free_turns,
            remaining_paid_turns=turn_result.remaining_paid_turns,
            total_remaining_turns=turn_result.total_remaining_turns,
        )

    except HTTPException:
        raise
    except Exception as e:  # noqa: BLE001
        logger.logger.error(
            "Error generating compatibility reading",
            extra={"user_id": current_user.id, "error": str(e)},
        )
        raise TarotAPIException(message="Error generating compatibility reading", details={"error": str(e)})
    finally:
        record_tarot_reading(
            env=settings.FASTAPI_ENV,
            reading_type=reading_type,
            status=reading_status,
            duration=time.time() - start_time,
        )


@router.post("/compatibility/interpret", response_model=CompatibilityInterpretResponse)
@limiter.limit(RATE_LIMITS["tarot"])
async def interpret_compatibility_reading(
    request: Request,
    request_data: CompatibilityInterpretRequest,
    response: Response,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Generate the AI interpretation for an already-drawn compatibility reading.

    Split from the draw endpoint so the client can render the cards (and the
    draw animation) immediately, then stream/show the interpretation once it's
    ready. Does not consume a turn — the turn was spent on the draw.
    """
    if not request_data.cards:
        raise ValidationError(message="No cards provided for interpretation", details={})

    try:
        reader = TarotReader(db=db, deck_id=current_user.favorite_deck_id)
        interpretation = await reader.create_compatibility_reading(
            person_a=request_data.person_a.name,
            person_b=request_data.person_b.name,
            cards=[card.model_dump() for card in request_data.cards],
            focus=request_data.focus,
        )
        return CompatibilityInterpretResponse(interpretation=interpretation)
    except Exception as e:  # noqa: BLE001
        logger.logger.error(
            "Error interpreting compatibility reading",
            extra={"user_id": current_user.id, "error": str(e)},
        )
        raise TarotAPIException(message="Error interpreting compatibility reading", details={"error": str(e)})


@router.post("/compatibility/interpret/stream")
@limiter.limit(RATE_LIMITS["tarot"])
async def stream_compatibility_interpretation(
    request: Request,
    request_data: CompatibilityInterpretRequest,
    response: Response,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Stream the AI interpretation for an already-drawn compatibility reading via SSE."""
    if not request_data.cards:
        raise ValidationError(message="No cards provided for interpretation", details={})

    async def generate():
        try:
            reader = TarotReader(db=db, deck_id=current_user.favorite_deck_id)
            async for chunk in reader.stream_compatibility_reading(
                person_a=request_data.person_a.name,
                person_b=request_data.person_b.name,
                cards=[card.model_dump() for card in request_data.cards],
                focus=request_data.focus,
            ):
                yield f"data: {json.dumps({'type': 'content_chunk', 'content': chunk})}\n\n"
            yield f"data: {json.dumps({'type': 'done'})}\n\n"
        except Exception as e:
            logger.logger.error(
                "Error streaming compatibility interpretation",
                extra={"user_id": current_user.id, "error": str(e)},
            )
            yield f"data: {json.dumps({'type': 'error', 'error': str(e)})}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
        },
    )


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


@router.get("/library", response_model=list[LibraryCardResponse])
async def get_library_cards(
    suit: str | None = Query(None, description="Filter by suit (e.g. 'Major Arcana', 'Cups')"),
    search: str | None = Query(None, description="Search by card name or rank"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return all cards for the Arcana Library, optionally filtered by suit or search term."""
    deck_id = current_user.favorite_deck_id or DEFAULT_DECK_ID

    query = db.query(Card).filter(Card.deck_id == deck_id)

    if suit:
        query = query.filter(Card.suit.ilike(f"%{suit}%"))
    if search:
        query = query.filter(or_(Card.name.ilike(f"%{search}%"), Card.rank.ilike(f"%{search}%")))

    cards = query.order_by(Card.suit, Card.numerology.asc().nullslast(), Card.id).all()

    # Fallback: if favorite deck has no cards, use any deck
    if not cards:
        query = db.query(Card)
        if suit:
            query = query.filter(Card.suit.ilike(f"%{suit}%"))
        if search:
            query = query.filter(or_(Card.name.ilike(f"%{search}%"), Card.rank.ilike(f"%{search}%")))
        cards = query.order_by(Card.suit, Card.numerology.asc().nullslast(), Card.id).all()

    return cards
