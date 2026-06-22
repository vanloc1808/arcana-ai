"""Reusable Pydantic models describing the API's error-response envelopes.

The ArcanaAI API returns errors in a small, consistent set of shapes produced by
the exception handlers registered in ``app.py`` (see ``utils/error_handlers.py``
and ``utils/rate_limiter.py``):

* :class:`ErrorResponse` -- the application envelope ``{"error", "details"}`` used
  by ``TarotAPIException`` and its subclasses, plus the database error handlers.
* :class:`DetailResponse` -- FastAPI's built-in ``{"detail"}`` envelope produced by
  ``HTTPException``.
* :class:`ValidationErrorResponse` -- the ``422`` envelope produced by the custom
  ``RequestValidationError`` handler.
* :class:`RateLimitResponse` -- the ``429`` envelope produced by the SlowAPI handler.

These models are referenced from per-endpoint ``responses=`` declarations and from
the OpenAPI post-processor in ``utils/openapi_responses.py`` so that ``/docs``,
``/redoc`` and ``/scalar`` show the real response body for every status code.
"""

from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class ErrorResponse(BaseModel):
    """Application error envelope returned by the ``TarotAPIException`` handlers."""

    error: str = Field(..., description="Human-readable error message.")
    details: Any | None = Field(
        default=None,
        description="Optional structured context about the error (object, string, or null).",
    )

    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {"error": "Resource not found", "details": {"reading_id": 123}},
            ]
        }
    )


class DetailResponse(BaseModel):
    """FastAPI's built-in error envelope returned by ``HTTPException``."""

    detail: str = Field(..., description="Human-readable error message.")

    model_config = ConfigDict(json_schema_extra={"examples": [{"detail": "Resource not found"}]})


class ValidationErrorItem(BaseModel):
    """A single field-level validation failure."""

    loc: list[Any] = Field(..., description="Location of the offending field, e.g. ['body', 'email'].")
    msg: str = Field(..., description="Why the field failed validation.")


class ValidationErrorResponse(BaseModel):
    """``422`` envelope produced by the request-validation handler."""

    error: str = Field(default="Validation error", description="Always 'Validation error'.")
    details: list[ValidationErrorItem] = Field(..., description="One entry per invalid field.")

    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "error": "Validation error",
                    "details": [{"loc": ["body", "email"], "msg": "value is not a valid email address"}],
                }
            ]
        }
    )


class RateLimitResponse(BaseModel):
    """``429`` envelope produced by the SlowAPI rate-limit handler."""

    error: str = Field(default="Rate limit exceeded", description="Always 'Rate limit exceeded'.")
    detail: str = Field(..., description="The limit that was exceeded, e.g. '5 per 1 minute'.")

    model_config = ConfigDict(
        json_schema_extra={"examples": [{"error": "Rate limit exceeded", "detail": "5 per 1 minute"}]}
    )
