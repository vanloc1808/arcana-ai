"""Celery tasks for Web Push notification delivery.

The ``process_due_reading_reminders`` task scans ``reading_reminders`` rows
whose ``reminder_date`` has elapsed and have not been sent yet, dispatches a
Web Push notification to each owning user's subscriptions, then marks the
reminder as sent. Scheduled via Celery Beat (see ``celery_app.py``).
"""

from __future__ import annotations

import logging
from datetime import UTC, datetime

from celery import current_task
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from celery_app import celery_app
from config import settings
from models import ReadingReminder
from services.web_push_service import is_configured as web_push_configured
from services.web_push_service import send_to_user as send_push_to_user

logger = logging.getLogger(__name__)

engine = create_engine(settings.SQLALCHEMY_DATABASE_URL.replace("sqlite+aiosqlite://", "sqlite://"))
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


_DEFAULT_TITLE = "ArcanaAI"
_DEFAULT_BODY = "A new tarot insight is waiting for you."


@celery_app.task(bind=True, name="process_due_reading_reminders")
def process_due_reading_reminders_task(self):
    """Push notifications for every overdue ``ReadingReminder`` row."""
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
            .limit(500)
            .all()
        )

        sent_users = 0
        sent_total = 0
        failed_total = 0
        for reminder in due:
            try:
                result = send_push_to_user(
                    db,
                    reminder.user_id,
                    _DEFAULT_TITLE,
                    reminder.message or _DEFAULT_BODY,
                    url=f"/journal?entry={reminder.journal_entry_id}" if reminder.journal_entry_id else "/reading",
                    tag=f"reminder-{reminder.id}",
                )
                if result.sent > 0:
                    sent_users += 1
                    sent_total += result.sent
                failed_total += result.failed
                reminder.is_sent = True
            except Exception as exc:  # noqa: BLE001
                logger.warning(
                    "Failed to push reminder",
                    extra={"reminder_id": reminder.id, "user_id": reminder.user_id, "error": str(exc)},
                )
                failed_total += 1
        db.commit()

        logger.info(
            "Processed due reading reminders",
            extra={
                "task_id": current_task.request.id if current_task and current_task.request else None,
                "due_count": len(due),
                "users_notified": sent_users,
                "pushes_sent": sent_total,
                "pushes_failed": failed_total,
            },
        )
        return {
            "status": "success",
            "due_count": len(due),
            "users_notified": sent_users,
            "pushes_sent": sent_total,
            "pushes_failed": failed_total,
        }
    finally:
        db.close()
