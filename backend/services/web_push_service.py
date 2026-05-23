"""Web Push (VAPID) delivery service.

Wraps ``pywebpush`` so callers can send notifications by user_id without
worrying about VAPID keys, encryption, or dead-subscription cleanup.
Failed deliveries with a 404/410 response remove the stale subscription.

Caller (sync) example::

    sent, failed = send_to_user(db, user_id, "Title", "Body", url="/reading")
"""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass

from pywebpush import WebPushException, webpush
from sqlalchemy.orm import Session

from config import settings
from models import WebPushSubscription

logger = logging.getLogger(__name__)

_DEAD_SUBSCRIPTION_STATUSES = {404, 410}


@dataclass
class DeliveryResult:
    sent: int
    failed: int
    pruned: int


def _vapid_claims() -> dict[str, str]:
    return {"sub": settings.WEBPUSH_SUBJECT}


def is_configured() -> bool:
    return bool(settings.WEBPUSH_PUBLIC_KEY and settings.WEBPUSH_PRIVATE_KEY)


def _payload(title: str, body: str, url: str | None, tag: str | None) -> str:
    return json.dumps(
        {
            "title": title,
            "body": body,
            "url": url or "/",
            "tag": tag,
        }
    )


def send_to_subscription(
    subscription: WebPushSubscription, title: str, body: str, url: str | None = None, tag: str | None = None
) -> bool:
    """Send to one subscription. Returns True on 2xx, False otherwise.

    Caller should remove dead subscriptions; this function does not touch the DB.
    """
    if not is_configured():
        logger.warning("Web push not configured; skipping send")
        return False

    try:
        webpush(
            subscription_info={
                "endpoint": subscription.endpoint,
                "keys": {"p256dh": subscription.p256dh, "auth": subscription.auth},
            },
            data=_payload(title, body, url, tag),
            vapid_private_key=settings.WEBPUSH_PRIVATE_KEY,
            vapid_claims=_vapid_claims(),
        )
        return True
    except WebPushException as exc:
        status_code = getattr(getattr(exc, "response", None), "status_code", None)
        logger.warning(
            "Web push delivery failed",
            extra={"endpoint": subscription.endpoint[:80], "status_code": status_code, "error": str(exc)},
        )
        return False


def send_to_user(
    db: Session, user_id: int, title: str, body: str, url: str | None = None, tag: str | None = None
) -> DeliveryResult:
    """Send a notification to every active subscription owned by ``user_id``.

    Dead subscriptions (404/410) are pruned from the DB. Caller is responsible
    for committing the surrounding transaction.
    """
    if not is_configured():
        return DeliveryResult(sent=0, failed=0, pruned=0)

    subs = db.query(WebPushSubscription).filter(WebPushSubscription.user_id == user_id).all()
    sent = failed = pruned = 0
    for sub in subs:
        try:
            webpush(
                subscription_info={
                    "endpoint": sub.endpoint,
                    "keys": {"p256dh": sub.p256dh, "auth": sub.auth},
                },
                data=_payload(title, body, url, tag),
                vapid_private_key=settings.WEBPUSH_PRIVATE_KEY,
                vapid_claims=_vapid_claims(),
            )
            sent += 1
        except WebPushException as exc:
            status_code = getattr(getattr(exc, "response", None), "status_code", None)
            if status_code in _DEAD_SUBSCRIPTION_STATUSES:
                db.delete(sub)
                pruned += 1
            failed += 1
            logger.warning(
                "Web push delivery failed",
                extra={"user_id": user_id, "status_code": status_code, "error": str(exc)},
            )
    return DeliveryResult(sent=sent, failed=failed, pruned=pruned)
