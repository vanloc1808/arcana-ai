import os
import sys
from typing import Any

from loguru import logger

_CONFIGURED = False


def _flatten_standard_extra(record: dict[str, Any]) -> None:
    """Preserve stdlib-style ``extra={...}`` fields when logging through Loguru."""
    standard_extra = record["extra"].pop("extra", None)
    if isinstance(standard_extra, dict):
        record["extra"].update(standard_extra)


def configure_logging() -> None:
    global _CONFIGURED

    if _CONFIGURED:
        return

    logger.remove()
    logger.configure(patcher=_flatten_standard_extra)
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
