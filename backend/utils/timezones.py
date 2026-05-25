"""Standard timezone options shared across backend and frontend."""

from zoneinfo import available_timezones


def get_standard_timezones() -> list[str]:
    """Return a stable, sorted list of IANA timezone names for UI selection."""
    return sorted(available_timezones())
