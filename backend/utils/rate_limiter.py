"""
Rate limiting utilities for the ArcanaAI API.

This module provides rate limiting functionality to protect the API from abuse
and ensure fair usage across all users. It uses SlowAPI (a FastAPI-compatible
wrapper for python-limits) to implement token bucket rate limiting.

Key Features:
    - IP-based rate limiting using remote address
    - Configurable rate limits for different endpoint categories
    - Custom error handling for rate limit violations
    - JSON responses for exceeded rate limits
    - Integration with FastAPI exception handling

Rate Limit Categories:
    - default: General endpoints (100/minute)
    - auth: Authentication endpoints (5/minute) - stricter for security
    - tarot: Tarot reading endpoints (10/minute) - resource intensive
    - chat: Chat endpoints (20/minute) - moderate usage

Dependencies:
    - SlowAPI for rate limiting implementation
    - FastAPI for request/response handling
    - Redis (optional) for distributed rate limiting

Example:
    Apply rate limiting to an endpoint:
    ```python
    from utils.rate_limiter import limiter, RATE_LIMITS

    @router.post("/login")
    @limiter.limit(RATE_LIMITS["auth"])
    def login(request: Request, ...):
        return {"message": "Login successful"}
    ```

Security Note:
    Rate limiting is based on IP address, which provides protection against
    basic abuse but may not be sufficient for sophisticated attacks. Consider
    implementing user-based rate limiting for authenticated endpoints.

Author: ArcanaAI Development Team
Version: 1.0.0
"""

from fastapi import Request, Response
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

# Create a limiter instance with IP-based rate limiting
# Uses the remote address of the client as the key for rate limiting
limiter = Limiter(key_func=get_remote_address)

# Rate limit configuration dictionary
# Define different rate limits for different types of endpoints
# Format: "requests/time_period" (e.g., "100/minute", "5/hour", "1000/day")
RATE_LIMITS = {
    "default": "100/minute",  # Default rate limit for general endpoints
    "auth": "5/minute",  # Stricter limit for authentication endpoints (login, register)
    "tarot": "10/minute",  # Limit for tarot reading endpoints (resource intensive)
    "chat": "20/minute",  # Limit for chat endpoints (moderate usage)
    "upload": "5/minute",  # Strict limit for file upload endpoints
}


async def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded) -> Response:
    """
    Custom Exception Handler for Rate Limit Exceeded

    Handles rate limit violations by returning a structured JSON response
    with appropriate HTTP status code and error information. This provides
    a consistent API response format for rate limiting errors.

    Args:
        request (Request): The FastAPI request object that triggered the rate limit
        exc (RateLimitExceeded): The rate limit exceeded exception containing details

    Returns:
        Response: JSON response with error information and 429 status code

    Response Format:
        ```json
        {
            "error": "Rate limit exceeded",
            "detail": "1 per 1 minute"
        }
        ```

    HTTP Status:
        429 Too Many Requests - Standard status code for rate limiting

    Example:
        Register the handler with FastAPI:
        ```python
        from slowapi.errors import RateLimitExceeded
        from utils.rate_limiter import rate_limit_exceeded_handler

        app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)
        ```

    Note:
        The detail field contains the rate limit configuration that was exceeded,
        helping clients understand the limitation and adjust their request patterns.
    """
    return JSONResponse(status_code=429, content={"error": "Rate limit exceeded", "detail": str(exc)})
