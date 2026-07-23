"""Dead-letter handling for permanently failed Celery tasks.

Tasks that exhaust all retries are persisted to a Redis list so operators
can inspect and replay them later through the admin API.
"""

import json
from datetime import datetime, timezone

import redis

from celery_app import celery_app
from config import settings
from utils.logging import logger

DEAD_LETTER_REDIS_KEY = "arcana:dead_letter"


def _dead_letter_redis() -> redis.Redis:
    return redis.from_url(settings.REDIS_URL, socket_connect_timeout=2)


@celery_app.task(bind=True, name="log_failed_task", queue="dead_letter")
def log_failed_task(self, original_task_name: str, original_args: list, error: str):
    """Persist a permanently failed task to the dead-letter store.

    This task is routed to the ``dead_letter`` queue so that it does not
    compete with other work. Failed task metadata is pushed to a Redis list
    for inspection via ``GET /api/tasks/dead-letter``.
    """
    entry = {
        "original_task": original_task_name,
        "args": original_args,
        "error": error,
        "failed_at": datetime.now(timezone.utc).isoformat(),
    }
    try:
        r = _dead_letter_redis()
        r.lpush(DEAD_LETTER_REDIS_KEY, json.dumps(entry))
        logger.error(
            "Dead-letter task persisted",
            extra={"original_task": original_task_name, "error": error},
        )
    except Exception as exc:
        logger.exception("Failed to persist dead-letter entry: {}", exc)


def get_dead_letter_entries(limit: int = 100) -> list[dict]:
    """Return the most recent dead-letter entries (newest first)."""
    try:
        r = _dead_letter_redis()
        raw = r.lrange(DEAD_LETTER_REDIS_KEY, 0, limit - 1)
        return [json.loads(entry) for entry in raw]
    except Exception:
        return []


def replay_dead_letter_entry(index: int) -> dict | None:
    """Replay a dead-letter entry and remove it from the list.

    Args:
        index: The 0-based index in the dead-letter list (newest first).

    Returns:
        The replayed entry dict, or ``None`` if not found.
    """
    try:
        r = _dead_letter_redis()
        raw = r.lindex(DEAD_LETTER_REDIS_KEY, index)
        if raw is None:
            return None
        entry = json.loads(raw)
        task_name = entry["original_task"]
        celery_app.send_task(task_name, args=entry["args"])
        # Remove the specific entry using LREM
        r.lrem(DEAD_LETTER_REDIS_KEY, 1, raw)
        return entry
    except Exception as exc:
        logger.exception("Failed to replay dead-letter entry: {}", exc)
        return None
