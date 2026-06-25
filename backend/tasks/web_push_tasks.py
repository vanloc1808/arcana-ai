"""Celery tasks for Web Push notification delivery.

The ``process_due_reading_reminders`` task scans ``reading_reminders`` rows
whose ``reminder_date`` has elapsed and have not been sent yet, dispatches a
Web Push notification to each owning user's subscriptions, then marks the
reminder as sent. Scheduled via Celery Beat (see ``celery_app.py``).
"""

from __future__ import annotations

from collections import defaultdict
from datetime import UTC, datetime

from celery import current_task
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from celery_app import celery_app
from config import settings
from models import ReadingReminder
from services.web_push_service import is_configured as web_push_configured
from services.web_push_service import send_to_user as send_push_to_user
from utils.logging import logger

engine = create_engine(settings.SQLALCHEMY_DATABASE_URL.replace("sqlite+aiosqlite://", "sqlite://"))
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


_DEFAULT_TITLE = "ArcanaAI"
_DEFAULT_BODY = "A new tarot insight is waiting for you."

# After this many failed delivery attempts a reminder is marked sent so it
# stops being reprocessed every run. Pruning of dead (404/410) subscriptions
# happens in send_to_user, so this only bounds persistent soft failures.
MAX_DELIVERY_ATTEMPTS = 5


def _finalize_reminder(reminder, result, now) -> str:
    """Decide a reminder's fate after a delivery attempt.

    Returns one of: 'delivered', 'no_subscriptions', 'gave_up', 'retry'.
    A DeliveryResult with sent == failed == pruned == 0 means the user had no
    subscriptions at all (the send loop never ran).
    """
    reminder.delivery_attempts = (reminder.delivery_attempts or 0) + 1
    reminder.last_attempt_at = now

    if result is not None and result.sent > 0:
        reminder.is_sent = True
        return "delivered"

    no_subscriptions = result is not None and result.sent == 0 and result.failed == 0 and result.pruned == 0
    if no_subscriptions:
        # Nothing to deliver to — don't retry this row forever.
        reminder.is_sent = True
        return "no_subscriptions"

    if reminder.delivery_attempts >= MAX_DELIVERY_ATTEMPTS:
        reminder.is_sent = True
        return "gave_up"

    # Subscriptions exist but none accepted the push this run; try again later.
    return "retry"


@celery_app.task(bind=True, name="process_due_reading_reminders")
def process_due_reading_reminders_task(self):
    """Deliver web-push notifications for overdue ``ReadingReminder`` rows.

    Reminders are coalesced per user so a user with several due reminders in
    one run gets a single notification. A reminder is only marked sent when it
    is actually delivered, when the user has no push subscriptions, or after
    MAX_DELIVERY_ATTEMPTS — transient failures are left for the next run.
    """
    if not web_push_configured():
        return {"status": "skipped", "reason": "web_push_not_configured"}

    now = datetime.now(UTC)
    db = SessionLocal()
    try:
        due = (
            db.query(ReadingReminder)
            .filter(
                ReadingReminder.is_sent.is_(False),
                ReadingReminder.reminder_date <= now,
            )
            .order_by(ReadingReminder.user_id, ReadingReminder.reminder_date)
            .limit(500)
            .all()
        )

        # Group due reminders by user so each user receives one push per run.
        by_user: dict[int, list[ReadingReminder]] = defaultdict(list)
        for reminder in due:
            by_user[reminder.user_id].append(reminder)

        users_notified = 0
        pushes_sent = 0
        outcomes: dict[str, int] = defaultdict(int)

        for user_id, reminders in by_user.items():
            if len(reminders) == 1:
                single = reminders[0]
                title = _DEFAULT_TITLE
                body = single.message or _DEFAULT_BODY
                url = (
                    f"/journal?entry={single.journal_entry_id}"
                    if single.journal_entry_id
                    else "/reading"
                )
            else:
                title = _DEFAULT_TITLE
                body = f"You have {len(reminders)} tarot reminders waiting."
                url = "/journal"

            try:
                result = send_push_to_user(db, user_id, title, body, url=url, tag=f"reminders-{user_id}")
            except Exception as exc:  # noqa: BLE001
                logger.warning(
                    "Failed to push reminders for user",
                    extra={"user_id": user_id, "error": str(exc)},
                )
                result = None

            if result is not None and result.sent > 0:
                users_notified += 1
                pushes_sent += result.sent

            for reminder in reminders:
                outcome = _finalize_reminder(reminder, result, now)
                outcomes[outcome] += 1

        db.commit()

        logger.info(
            "Processed due reading reminders",
            extra={
                "task_id": current_task.request.id if current_task and current_task.request else None,
                "due_count": len(due),
                "users_notified": users_notified,
                "pushes_sent": pushes_sent,
                "outcomes": dict(outcomes),
            },
        )
        return {
            "status": "success",
            "due_count": len(due),
            "users_notified": users_notified,
            "pushes_sent": pushes_sent,
            "outcomes": dict(outcomes),
        }
    finally:
        db.close()
