from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, Request
from sqlalchemy import desc, func
from sqlalchemy.orm import Session

from database import get_db
from models import SharedReading, User
from routers.auth import get_current_user
from schemas import (
    CardResponse,
    SharedReadingCreate,
    SharedReadingListResponse,
    SharedReadingResponse,
    SharedReadingStatsResponse,
)
from utils.error_handlers import ResourceNotFoundError, TarotAPIException, ValidationError, logger
from utils.rate_limiter import RATE_LIMITS, limiter

router = APIRouter(prefix="/sharing", tags=["sharing"])


@router.post("/create", response_model=dict)
@limiter.limit(RATE_LIMITS["auth"])
async def create_shared_reading(
    request: Request,
    sharing_data: SharedReadingCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Create Shared Reading

    Create a shareable link for a tarot reading with UUID-based access.

    Args:
        request (Request): FastAPI request object
        sharing_data (SharedReadingCreate): Data for creating shared reading
        current_user (User): Authenticated user
        db (Session): Database session

    Returns:
        dict: Contains the UUID and sharing URL for the reading

    Raises:
        ValidationError: If the data is invalid
        TarotAPIException: If creation fails
    """
    try:
        # Validate the cards data
        if not sharing_data.cards or len(sharing_data.cards) == 0:
            raise ValidationError(
                message="At least one card is required", details={"cards": "Cannot create empty reading"}
            )

        # Convert cards to JSON-serializable format
        cards_data = []
        for card in sharing_data.cards:
            card_dict = {
                "name": card.name,
                "orientation": card.orientation,
                "meaning": card.meaning,
                "image_url": card.image_url,
                "position": card.position,
                "position_index": card.position_index,
            }
            cards_data.append(card_dict)

        # Calculate expiration if specified
        expires_at = None
        if sharing_data.expires_in_days:
            expires_at = datetime.utcnow() + timedelta(days=sharing_data.expires_in_days)

        # Create shared reading
        shared_reading = SharedReading(
            title=sharing_data.title,
            concern=sharing_data.concern,
            spread_name=sharing_data.spread_name,
            deck_name=sharing_data.deck_name,
            expires_at=expires_at,
            user_id=current_user.id,
        )
        shared_reading.set_cards_data(cards_data)

        db.add(shared_reading)
        db.commit()
        db.refresh(shared_reading)

        # Get base URL from request
        base_url = str(request.base_url).rstrip("/")
        sharing_url = f"{base_url}/shared/{shared_reading.uuid}"

        logger.logger.info(
            "Shared reading created",
            extra={"user_id": current_user.id, "shared_reading_uuid": shared_reading.uuid, "title": sharing_data.title},
        )

        return {
            "uuid": shared_reading.uuid,
            "sharing_url": sharing_url,
            "expires_at": shared_reading.expires_at.isoformat() if shared_reading.expires_at else None,
            "message": "Reading shared successfully",
        }

    except ValidationError:
        raise
    except Exception as e:
        logger.logger.error("Error creating shared reading", extra={"user_id": current_user.id, "error": str(e)})
        raise TarotAPIException(message="Error creating shared reading", details={"error": str(e)})


@router.get("/{uuid}", response_model=SharedReadingResponse)
async def get_shared_reading(uuid: str, db: Session = Depends(get_db)):
    """
    Get Shared Reading

    Retrieve a shared reading by its UUID. Increments view count.

    Args:
        uuid (str): UUID of the shared reading
        db (Session): Database session

    Returns:
        SharedReadingResponse: The shared reading data

    Raises:
        ResourceNotFoundError: If reading not found or expired
    """
    try:
        # Get shared reading
        shared_reading = (
            db.query(SharedReading).filter(SharedReading.uuid == uuid, SharedReading.is_public is True).first()
        )

        if not shared_reading:
            raise ResourceNotFoundError(message="Shared reading not found", details={"uuid": uuid})

        # Check if expired
        if shared_reading.expires_at and shared_reading.expires_at < datetime.utcnow():
            raise ResourceNotFoundError(
                message="Shared reading has expired",
                details={"uuid": uuid, "expired_at": shared_reading.expires_at.isoformat()},
            )

        # Increment view count
        shared_reading.increment_view_count()
        db.commit()

        # Parse cards data
        cards_data = shared_reading.get_cards_data()
        cards = [CardResponse(**card) for card in cards_data]

        logger.logger.info(
            "Shared reading viewed", extra={"shared_reading_uuid": uuid, "view_count": shared_reading.view_count}
        )

        return SharedReadingResponse(
            uuid=shared_reading.uuid,
            title=shared_reading.title,
            concern=shared_reading.concern,
            cards=cards,
            spread_name=shared_reading.spread_name,
            deck_name=shared_reading.deck_name,
            created_at=shared_reading.created_at,
            expires_at=shared_reading.expires_at,
            is_public=shared_reading.is_public,
            view_count=shared_reading.view_count,
            creator_username=shared_reading.user.username,
        )

    except ResourceNotFoundError:
        raise
    except Exception as e:
        logger.logger.error("Error retrieving shared reading", extra={"uuid": uuid, "error": str(e)})
        raise TarotAPIException(message="Error retrieving shared reading", details={"error": str(e)})


@router.get("/user/readings", response_model=list[SharedReadingListResponse])
async def get_user_shared_readings(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db), limit: int = 20, offset: int = 0
):
    """
    Get User's Shared Readings

    Retrieve all shared readings created by the current user.

    Args:
        current_user (User): Authenticated user
        db (Session): Database session
        limit (int): Maximum number of readings to return
        offset (int): Number of readings to skip

    Returns:
        List[SharedReadingListResponse]: List of user's shared readings
    """
    try:
        shared_readings = (
            db.query(SharedReading)
            .filter(SharedReading.user_id == current_user.id)
            .order_by(desc(SharedReading.created_at))
            .offset(offset)
            .limit(limit)
            .all()
        )

        return [
            SharedReadingListResponse(
                uuid=reading.uuid,
                title=reading.title,
                created_at=reading.created_at,
                view_count=reading.view_count,
                is_public=reading.is_public,
            )
            for reading in shared_readings
        ]

    except Exception as e:
        logger.logger.error(
            "Error retrieving user shared readings", extra={"user_id": current_user.id, "error": str(e)}
        )
        raise TarotAPIException(message="Error retrieving shared readings", details={"error": str(e)})


@router.delete("/{uuid}")
async def delete_shared_reading(
    uuid: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """
    Delete Shared Reading

    Delete a shared reading. Only the creator can delete their readings.

    Args:
        uuid (str): UUID of the shared reading to delete
        current_user (User): Authenticated user
        db (Session): Database session

    Returns:
        dict: Success message

    Raises:
        ResourceNotFoundError: If reading not found
        ValidationError: If user doesn't own the reading
    """
    try:
        shared_reading = db.query(SharedReading).filter(SharedReading.uuid == uuid).first()

        if not shared_reading:
            raise ResourceNotFoundError(message="Shared reading not found", details={"uuid": uuid})

        if shared_reading.user_id != current_user.id:
            raise ValidationError(message="You can only delete your own shared readings", details={"uuid": uuid})

        db.delete(shared_reading)
        db.commit()

        logger.logger.info("Shared reading deleted", extra={"user_id": current_user.id, "shared_reading_uuid": uuid})

        return {"message": "Shared reading deleted successfully"}

    except (ResourceNotFoundError, ValidationError):
        raise
    except Exception as e:
        logger.logger.error(
            "Error deleting shared reading", extra={"user_id": current_user.id, "uuid": uuid, "error": str(e)}
        )
        raise TarotAPIException(message="Error deleting shared reading", details={"error": str(e)})


@router.get("/user/stats", response_model=SharedReadingStatsResponse)
async def get_user_sharing_stats(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Get User Sharing Statistics

    Get statistics about the user's shared readings.

    Args:
        current_user (User): Authenticated user
        db (Session): Database session

    Returns:
        SharedReadingStatsResponse: Statistics about shared readings
    """
    try:
        # Get total count and total views
        stats = (
            db.query(
                func.count(SharedReading.id).label("total_shared"),
                func.sum(SharedReading.view_count).label("total_views"),
            )
            .filter(SharedReading.user_id == current_user.id)
            .first()
        )

        total_shared = stats.total_shared or 0
        total_views = stats.total_views or 0

        # Get most viewed reading
        most_viewed = None
        if total_shared > 0:
            most_viewed_reading = (
                db.query(SharedReading)
                .filter(SharedReading.user_id == current_user.id)
                .order_by(desc(SharedReading.view_count))
                .first()
            )

            if most_viewed_reading:
                most_viewed = SharedReadingListResponse(
                    uuid=most_viewed_reading.uuid,
                    title=most_viewed_reading.title,
                    created_at=most_viewed_reading.created_at,
                    view_count=most_viewed_reading.view_count,
                    is_public=most_viewed_reading.is_public,
                )

        return SharedReadingStatsResponse(total_shared=total_shared, total_views=total_views, most_viewed=most_viewed)

    except Exception as e:
        logger.logger.error("Error retrieving sharing stats", extra={"user_id": current_user.id, "error": str(e)})
        raise TarotAPIException(message="Error retrieving sharing statistics", details={"error": str(e)})


@router.post("/{uuid}/toggle-privacy")
async def toggle_reading_privacy(
    uuid: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """
    Toggle Reading Privacy

    Toggle the public/private status of a shared reading.

    Args:
        uuid (str): UUID of the shared reading
        current_user (User): Authenticated user
        db (Session): Database session

    Returns:
        dict: Updated privacy status

    Raises:
        ResourceNotFoundError: If reading not found
        ValidationError: If user doesn't own the reading
    """
    try:
        shared_reading = db.query(SharedReading).filter(SharedReading.uuid == uuid).first()

        if not shared_reading:
            raise ResourceNotFoundError(message="Shared reading not found", details={"uuid": uuid})

        if shared_reading.user_id != current_user.id:
            raise ValidationError(message="You can only modify your own shared readings", details={"uuid": uuid})

        # Toggle privacy
        shared_reading.is_public = not shared_reading.is_public
        db.commit()

        logger.logger.info(
            "Shared reading privacy toggled",
            extra={"user_id": current_user.id, "shared_reading_uuid": uuid, "is_public": shared_reading.is_public},
        )

        return {
            "uuid": uuid,
            "is_public": shared_reading.is_public,
            "message": f"Reading is now {'public' if shared_reading.is_public else 'private'}",
        }

    except (ResourceNotFoundError, ValidationError):
        raise
    except Exception as e:
        logger.logger.error(
            "Error toggling reading privacy", extra={"user_id": current_user.id, "uuid": uuid, "error": str(e)}
        )
        raise TarotAPIException(message="Error updating reading privacy", details={"error": str(e)})
