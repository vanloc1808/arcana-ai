import os
import sys
import time
from pathlib import Path

from celery import Celery
from celery.schedules import crontab
from celery.signals import task_failure, task_postrun, task_prerun, task_retry
from dotenv import load_dotenv

from config import settings
from utils.metrics import record_celery_failure, record_celery_task

# Load environment variables
load_dotenv()

# Add current directory to Python path to ensure tasks can be imported
current_dir = str(Path(__file__).resolve().parent)
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

# Configure Celery
celery_app = Celery(
    "tarot_tasks",
    broker=os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/0"),
    backend=os.getenv("CELERY_RESULT_BACKEND", "redis://localhost:6379/0"),
    include=["tasks.email_tasks", "tasks.notification_tasks", "tasks.journal_tasks", "tasks.web_push_tasks"],
)

# Celery configuration
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=30 * 60,  # 30 minutes
    task_soft_time_limit=25 * 60,  # 25 minutes
    worker_prefetch_multiplier=1,
    worker_max_tasks_per_child=1000,
    # Task routing
    task_routes={
        "tasks.email_tasks.*": {"queue": "email"},
        "tasks.notification_tasks.*": {"queue": "notifications"},
        "tasks.web_push_tasks.*": {"queue": "notifications"},
    },
    # Task retry configuration
    task_default_retry_delay=60,  # 1 minute
    task_max_retries=3,
    # Task discovery
    imports=("tasks.email_tasks", "tasks.notification_tasks", "tasks.journal_tasks", "tasks.web_push_tasks"),
    # Periodic task schedule
    beat_schedule={
        "reset-monthly-free-turns": {
            "task": "reset_monthly_free_turns",
            "schedule": crontab(hour=0, minute=1, day_of_month=1),  # 1st of every month at 00:01 UTC
            "options": {"queue": "notifications"},
        },
        "process-due-reading-reminders": {
            "task": "process_due_reading_reminders",
            "schedule": crontab(minute=0),  # Top of every hour
            "options": {"queue": "notifications"},
        },
    },
)


def _queue_name(task=None, request=None) -> str:
    task_request = getattr(task, "request", None) or request
    delivery_info = getattr(task_request, "delivery_info", {}) or {}
    return delivery_info.get("routing_key") or delivery_info.get("exchange") or "unknown"


def _task_name(sender) -> str:
    return getattr(sender, "name", "unknown")


@task_prerun.connect
def track_task_start(sender=None, task_id=None, task=None, **kwargs):
    if task is not None:
        task.request._arcana_task_start_time = time.perf_counter()
    record_celery_task(
        env=settings.FASTAPI_ENV,
        queue=_queue_name(task),
        task_name=_task_name(sender),
        status="started",
    )


@task_postrun.connect
def track_task_done(sender=None, task_id=None, task=None, state=None, **kwargs):
    started = getattr(getattr(task, "request", None), "_arcana_task_start_time", None)
    duration = time.perf_counter() - started if started else None
    task_status = "success" if state == "SUCCESS" else str(state or "unknown").lower()
    record_celery_task(
        env=settings.FASTAPI_ENV,
        queue=_queue_name(task),
        task_name=_task_name(sender),
        status=task_status,
        duration=duration,
    )


@task_failure.connect
def track_task_failure(sender=None, task_id=None, exception=None, task=None, **kwargs):
    record_celery_failure(
        env=settings.FASTAPI_ENV,
        queue=_queue_name(task or sender),
        task_name=_task_name(sender),
        error_type=type(exception).__name__ if exception else "unknown",
    )


@task_retry.connect
def track_task_retry(sender=None, request=None, reason=None, **kwargs):
    record_celery_task(
        env=settings.FASTAPI_ENV,
        queue=_queue_name(request=request),
        task_name=_task_name(sender),
        status="retry",
    )


# Explicitly import tasks to ensure they're registered
