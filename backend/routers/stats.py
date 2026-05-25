"""User dashboard statistics endpoint.

Single-call alternative to fetching streak data and subscription history
separately. Returns everything the History tab needs.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session

from database import get_db
from models import User
from routers.auth import get_current_user
from schemas import UserDashboardStats
from services.streak_service import get_dashboard_stats
from utils.rate_limiter import limiter

router = APIRouter(prefix="/api/stats", tags=["stats"])


@router.get("/me", response_model=UserDashboardStats)
@limiter.limit("60/minute")
async def get_my_dashboard_stats(
    request: Request,
    period_days: int = Query(30, ge=1, le=3650, description="Window in days for usage breakdown and recent readings"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return aggregated dashboard statistics for the authenticated user.

    Combines lifetime totals (total readings, longest streak) with a
    configurable rolling-window breakdown (usage by context, recent
    readings log).  Default window is 30 days.
    """
    return get_dashboard_stats(db, current_user.id, period_days=period_days)
