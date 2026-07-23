"""Exponential backoff with jitter for Celery task retries.

Replaces the flat ``countdown=60`` retry pattern with exponential backoff
that prevents thundering herds when multiple tasks fail simultaneously.
"""

import random


def compute_backoff(retries: int, base_seconds: float = 60, max_seconds: float = 3600) -> float:
    """Return a jittered retry delay using exponential backoff.

    Args:
        retries: The number of retries already attempted (0-based).
        base_seconds: The base delay before the first retry.
        max_seconds: The maximum delay cap.

    Returns:
        A float representing the number of seconds to delay,
        suitable for passing to ``self.retry(countdown=...)``.
    """
    delay = min(base_seconds * (2**retries), max_seconds)
    jitter = random.uniform(0, delay * 0.3)
    return delay + jitter
