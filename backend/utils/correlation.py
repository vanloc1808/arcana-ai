"""Request correlation ID tracking using context variables.

Provides a thread-safe, async-safe correlation ID that flows through
middleware → route handlers → Celery tasks → Loguru logs, enabling
end-to-end request tracing across the entire system.
"""

import uuid
from contextvars import ContextVar

_correlation_id_var: ContextVar[str] = ContextVar("correlation_id", default="")


def get_correlation_id() -> str:
    """Return the current correlation ID, or an empty string if none is set."""
    return _correlation_id_var.get()


def set_correlation_id(cid: str | None = None) -> str:
    """Set the correlation ID for the current context.

    Args:
        cid: An explicit correlation ID to use. If ``None``, a new UUID4 is generated.

    Returns:
        The correlation ID that was set.
    """
    resolved = cid or str(uuid.uuid4())
    _correlation_id_var.set(resolved)
    return resolved


def _cid_header() -> dict[str, str]:
    """Build a ``headers`` dict carrying the current correlation ID, if any.

    Returns an empty dict when no correlation ID is set so that tasks not
    originating from an HTTP request don't inject an empty key.
    """
    cid = get_correlation_id()
    return {"correlation_id": cid} if cid else {}


def dispatch_task_with_correlation(task, args=None, kwargs=None, **apply_kwargs):
    """Dispatch a Celery task with the current correlation ID in headers.

    Args:
        task: A Celery task signature or function reference.
        args: Positional arguments for the task.
        kwargs: Keyword arguments for the task.
        **apply_kwargs: Additional keyword arguments forwarded to ``apply_async``.

    Returns:
        The ``AsyncResult`` from ``task.apply_async``.
    """
    if args is None:
        args = []
    if kwargs is None:
        kwargs = {}

    headers = apply_kwargs.pop("headers", {}) or {}
    cid = get_correlation_id()
    if cid:
        headers.setdefault("correlation_id", cid)

    return task.apply_async(args=args, kwargs=kwargs, headers=headers, **apply_kwargs)


def chain_task_with_correlation(task, *args, **kwargs):
    """Call ``task.delay(...)`` while forwarding the current correlation ID.

    This is a drop-in replacement for ``some_task.delay(...)`` inside Celery
    task bodies where ``apply_async`` kwargs aren't needed.
    """
    headers = _cid_header()
    if headers:
        return task.apply_async(args=args, kwargs=kwargs, headers=headers)
    return task.delay(*args, **kwargs)
