"""Redis-based idempotency guard for Celery tasks.

Uses Redis ``SET NX EX`` to ensure a task payload is processed at most once
within a configurable TTL window. When the key already exists the task body
is skipped, preventing duplicate side-effects from worker crashes or
re-deliveries triggered by ``acks_late``.
"""

import redis

from config import settings

_idempotency_redis: redis.Redis | None = None


def _get_redis() -> redis.Redis:
    """Return the shared Redis client for idempotency checks.

    Connects lazily so the module doesn't fail to import when Redis is
    unavailable at startup (e.g. during testing).
    """
    global _idempotency_redis
    if _idempotency_redis is None:
        try:
            _idempotency_redis = redis.from_url(settings.REDIS_URL, socket_connect_timeout=2)
        except Exception:
            return None
    return _idempotency_redis


def check_and_set_idempotency_key(key: str, ttl: int = 86400) -> bool:
    """Atomically check and set an idempotency key.

    Args:
        key: A unique string identifying the payload (e.g.
            ``"email:send_welcome:vloc@gmail.com"``).
        ttl: How long the key should persist in Redis (seconds).

    Returns:
        ``True`` if the key was **not** previously set (i.e. this is the
        first attempt). ``False`` if the key already exists (duplicate).
        Also returns ``False`` when Redis is unreachable — tasks proceed
        without idempotency protection in that case.
    """
    r = _get_redis()
    if r is None:
        return True  # No Redis → no idempotency, let tasks run
    try:
        return bool(r.set(key, "1", nx=True, ex=ttl))
    except Exception:
        return True  # Transient Redis error → let the task run
