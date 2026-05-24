"""Web Push (VAPID) subscription and delivery endpoints."""

from __future__ import annotations

from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from config import settings
from database import get_db
from models import User, WebPushSubscription
from routers.auth import get_current_user
from schemas import (
    WebPushPublicKeyResponse,
    WebPushSubscribeRequest,
    WebPushSubscribeResponse,
    WebPushTestResponse,
    WebPushUnsubscribeRequest,
)
from services.web_push_service import is_configured, send_to_user
from utils.rate_limiter import limiter

router = APIRouter(prefix="/api/web-push", tags=["web-push"])


@router.get("/vapid-public-key", response_model=WebPushPublicKeyResponse)
@limiter.limit("60/minute")
async def get_vapid_public_key(request: Request):
    """Public VAPID key the browser needs to subscribe.

    Returns an empty ``public_key`` and ``configured=false`` when the server
    has no VAPID keypair set, so the frontend can hide the toggle.
    """
    return WebPushPublicKeyResponse(
        public_key=settings.WEBPUSH_PUBLIC_KEY,
        configured=is_configured(),
    )


@router.post("/subscribe", response_model=WebPushSubscribeResponse)
@limiter.limit("20/minute")
async def subscribe(
    request: Request,
    payload: WebPushSubscribeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Register or update a browser's Web Push subscription for the user."""
    if not is_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Web push notifications are not configured on this server.",
        )

    existing = (
        db.query(WebPushSubscription)
        .filter(
            WebPushSubscription.user_id == current_user.id,
            WebPushSubscription.endpoint == payload.endpoint,
        )
        .first()
    )
    if existing:
        existing.p256dh = payload.keys.p256dh
        existing.auth = payload.keys.auth
        existing.user_agent = payload.user_agent
        existing.last_used_at = datetime.now(UTC)
        db.commit()
        db.refresh(existing)
        return WebPushSubscribeResponse(id=existing.id, endpoint=existing.endpoint)

    sub = WebPushSubscription(
        user_id=current_user.id,
        endpoint=payload.endpoint,
        p256dh=payload.keys.p256dh,
        auth=payload.keys.auth,
        user_agent=payload.user_agent,
        last_used_at=datetime.now(UTC),
    )
    db.add(sub)
    db.commit()
    db.refresh(sub)
    return WebPushSubscribeResponse(id=sub.id, endpoint=sub.endpoint)


@router.post("/unsubscribe", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("20/minute")
async def unsubscribe(
    request: Request,
    payload: WebPushUnsubscribeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Remove a single subscription by endpoint."""
    deleted = (
        db.query(WebPushSubscription)
        .filter(
            WebPushSubscription.user_id == current_user.id,
            WebPushSubscription.endpoint == payload.endpoint,
        )
        .delete(synchronize_session=False)
    )
    db.commit()
    if deleted == 0:
        # Idempotent: silently succeed
        return None
    return None


@router.post("/test", response_model=WebPushTestResponse)
@limiter.limit("3/minute")
async def send_test_notification(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Send a test push to every subscription on this account."""
    if not is_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Web push notifications are not configured on this server.",
        )
    result = send_to_user(
        db,
        current_user.id,
        "ArcanaAI",
        "Push notifications are working — your daily card awaits.",
        url="/reading",
        tag="test",
    )
    db.commit()
    return WebPushTestResponse(sent=result.sent, failed=result.failed, pruned=result.pruned)
