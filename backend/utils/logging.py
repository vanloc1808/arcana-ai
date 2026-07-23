import os
import sys
from typing import Any

from loguru import logger

_CONFIGURED = False


def _record_patcher(record: dict[str, Any]) -> None:
    """Combined patcher: flatten stdlib extra + inject correlation ID."""
    # Preserve stdlib-style ``extra={...}`` fields
    standard_extra = record["extra"].pop("extra", None)
    if isinstance(standard_extra, dict):
        record["extra"].update(standard_extra)

    # Inject correlation ID for request tracing
    from utils.correlation import get_correlation_id

    cid = get_correlation_id()
    if cid:
        record["extra"]["correlation_id"] = cid


def configure_logging() -> None:
    global _CONFIGURED

    if _CONFIGURED:
        return

    logger.remove()
    logger.configure(patcher=_record_patcher)
    logger.add(
        sys.stderr,
        level=os.environ.get("LOG_LEVEL", "INFO").upper(),
        format=(
            "{time:YYYY-MM-DD HH:mm:ss.SSS} | {level: <8} | "
            "{name}:{function}:{line} - {message} | {extra}"
        ),
        backtrace=False,
        diagnose=False,
    )
    _CONFIGURED = True


configure_logging()
