from fastapi import APIRouter, Request

from schemas import TimezoneOption
from utils.rate_limiter import RATE_LIMITS, limiter
from utils.timezones import get_standard_timezones

router = APIRouter(prefix="/api/utilities", tags=["utilities"])


@router.get("/timezones", response_model=list[TimezoneOption])
@limiter.limit(RATE_LIMITS["default"])
async def get_timezone_options(request: Request):
    """Return a standardized list of supported IANA timezones for UI dropdowns."""
    return [TimezoneOption(value=tz, label=tz) for tz in get_standard_timezones()]
