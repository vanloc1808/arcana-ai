import os
import sys
from pathlib import Path

from celery import Celery
from celery.schedules import crontab
from dotenv import load_dotenv

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
    include=["tasks.email_tasks", "tasks.notification_tasks", "tasks.journal_tasks"],
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
    },
    # Task retry configuration
    task_default_retry_delay=60,  # 1 minute
    task_max_retries=3,
    # Task discovery
    imports=("tasks.email_tasks", "tasks.notification_tasks", "tasks.journal_tasks"),
    # Periodic task schedule
    beat_schedule={
        "reset-monthly-free-turns": {
            "task": "reset_monthly_free_turns",
            "schedule": crontab(hour=0, minute=1, day_of_month=1),  # 1st of every month at 00:01 UTC
            "options": {"queue": "notifications"},
        },
    },
)

# Explicitly import tasks to ensure they're registered
