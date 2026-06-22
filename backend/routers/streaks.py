"""Streaks and achievements endpoints."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from database import get_db
from models import User, UserAchievement
from routers.auth import get_current_user
from schemas import AchievementResponse, StreakProgressResponse, StreakResponse
from services.streak_service import get_progress_snapshot, list_all_achievements, recompute_from_history
from utils.openapi_responses import error_responses
from utils.rate_limiter import limiter

router = APIRouter(prefix="/api/streaks", tags=["streaks"])


def _serialize(db: Session, user_id: int) -> StreakProgressResponse:
    streak, _stats, _unlocked = get_progress_snapshot(db, user_id)

    today = datetime.now(UTC).date()
    is_active_today = streak.last_activity_date == today
    is_active_recent = streak.last_activity_date in (today, today - timedelta(days=1))
    current = streak.current_streak if is_active_recent else 0

    unlocks = {
        ua.code: ua.unlocked_at for ua in db.query(UserAchievement).filter(UserAchievement.user_id == user_id).all()
    }
    catalog = list_all_achievements()
    achievements = [
        AchievementResponse(
            code=item["code"],
            title=item["title"],
            description=item["description"],
            unlocked=item["code"] in unlocks,
            unlocked_at=unlocks.get(item["code"]),
        )
        for item in catalog
    ]

    return StreakProgressResponse(
        streak=StreakResponse(
            current_streak=current,
            longest_streak=streak.longest_streak,
            total_active_days=streak.total_active_days,
            last_activity_date=streak.last_activity_date,
            is_active_today=is_active_today,
        ),
        achievements=achievements,
    )


@router.get("/me", response_model=StreakProgressResponse, responses=error_responses(429))
@limiter.limit("60/minute")
async def get_my_progress(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return _serialize(db, current_user.id)


@router.post("/recompute", response_model=StreakProgressResponse, responses=error_responses(429))
@limiter.limit("3/hour")
async def recompute_my_streak(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Rebuild the user's streak and achievements from historical data."""
    recompute_from_history(db, current_user.id)
    db.commit()
    return _serialize(db, current_user.id)
