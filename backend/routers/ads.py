import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from models import User, AdView
from routers.auth import get_current_user
from schemas import AdCompleteRequest, AdCompleteResponse
from services.subscription_service import SubscriptionService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["ads"])
subscription_service = SubscriptionService()


@router.post("/ads/complete", response_model=AdCompleteResponse)
async def complete_ad_view(
    request: AdCompleteRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Award one turn after the user completes watching an ad.

    Rate-limited to 5 ad views per day per user.
    """
    # Refresh user from DB to get latest ad counters
    db.refresh(current_user)

    # Reset daily counter if the date has rolled over
    current_user.reset_ad_turns_if_needed()

    if not current_user.can_earn_ad_turn():
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "message": "Daily ad limit reached. Come back tomorrow for more turns.",
                "ad_turns_earned_today": current_user.ad_turns_earned_today,
                "ad_turns_remaining_today": 0,
            },
        )

    try:
        # Award one turn (reuse existing paid-turn mechanism — ad turns never expire)
        current_user.add_paid_turns(1)
        current_user.ad_turns_earned_today = (current_user.ad_turns_earned_today or 0) + 1

        # Record the ad view
        ad_view = AdView(
            user_id=current_user.id,
            ad_provider=request.ad_provider,
            turns_awarded=1,
        )
        db.add(ad_view)

        # Log it as a subscription event so history stays consistent
        subscription_service.log_subscription_event(
            db=db,
            user=current_user,
            event_type="ad_view_completed",
            event_source="adsterra",
            subscription_status=current_user.subscription_status or "none",
            turns_affected=1,
            event_data={"ad_provider": request.ad_provider},
        )

        db.commit()
        db.refresh(current_user)

        logger.info(
            f"User {current_user.id} earned 1 turn from ad. "
            f"Daily total: {current_user.ad_turns_earned_today}"
        )

        return AdCompleteResponse(
            success=True,
            turns_awarded=1,
            total_turns=current_user.get_total_turns(),
            ad_turns_earned_today=current_user.ad_turns_earned_today,
            ad_turns_remaining_today=current_user.remaining_ad_turns_today(),
            message="Turn awarded! Enjoy your reading.",
        )

    except Exception as e:
        db.rollback()
        logger.error(f"Failed to award ad turn for user {current_user.id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to award turn. Please try again.",
        )


@router.get("/ads/status")
async def get_ad_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return how many ad-earned turns the user has left today."""
    db.refresh(current_user)
    current_user.reset_ad_turns_if_needed()
    db.commit()

    return {
        "ad_turns_earned_today": current_user.ad_turns_earned_today or 0,
        "ad_turns_remaining_today": current_user.remaining_ad_turns_today(),
        "daily_limit": User.AD_TURNS_DAILY_LIMIT,
    }
