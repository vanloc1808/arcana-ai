"""Helpers for documenting error responses in the OpenAPI schema.

FastAPI only documents the ``200`` (from ``response_model``) and ``422`` (from
request validation) responses by default. Every other status code an endpoint can
return is invisible to ``/openapi.json`` -- and therefore to ``/docs``, ``/redoc``
and ``/scalar`` -- unless it is declared via the ``responses=`` argument on the
route decorator.

This module provides two things:

* :func:`error_responses` -- a small DRY helper that builds a ``responses=`` mapping
  for the status codes an endpoint can return, complete with the correct response
  model and a concrete JSON example for each code. Use it on individual routes for
  endpoint-specific codes (``400``/``402``/``404``/``409``/``429``/...).
* :func:`setup_openapi` -- installs a cached ``app.openapi`` builder that augments
  the generated schema with the *universal* error responses (``500`` everywhere,
  ``401`` on every secured operation, ``403`` on admin operations) and rewrites the
  default ``422`` body to match what the API actually returns. This keeps the
  per-route declarations focused on what is specific to each endpoint.

The example bodies mirror the real envelopes emitted by the handlers in
``utils/error_handlers.py`` and ``utils/rate_limiter.py``.
"""

from collections.abc import Iterable
from typing import Any

from fastapi import FastAPI
from fastapi.openapi.utils import get_openapi

from schemas_errors import (
    DetailResponse,
    ErrorResponse,
    RateLimitResponse,
    ValidationErrorItem,
    ValidationErrorResponse,
)

JSON_MEDIA_TYPE = "application/json"

# Envelope styles for status codes that may be raised either via a custom
# ``TarotAPIException`` ({"error", "details"}) or a raw ``HTTPException`` ({"detail"}).
APP = "app"
DETAIL = "detail"

# --- Canonical example bodies (kept in sync with the registered handlers) ---------

_UNAUTHORIZED_EXAMPLE = {"error": "Invalid token", "details": {"error": "Could not validate credentials"}}
_FORBIDDEN_EXAMPLE = {"detail": "Admin access required"}
_CONFLICT_EXAMPLE = {"error": "Database integrity error", "details": "UNIQUE constraint failed: users.email"}
_VALIDATION_EXAMPLE = {
    "error": "Validation error",
    "details": [{"loc": ["body", "email"], "msg": "value is not a valid email address"}],
}
_RATE_LIMIT_EXAMPLE = {"error": "Rate limit exceeded", "detail": "5 per 1 minute"}
_SERVER_ERROR_EXAMPLE = {"error": "Internal server error", "details": "An unexpected error occurred"}

# Status codes whose envelope is deterministic regardless of how they are raised.
# Maps code -> (model, description, example).
_DETERMINISTIC: dict[int, tuple[type, str, dict[str, Any]]] = {
    401: (
        ErrorResponse,
        "Authentication failed -- the token is missing, malformed, or expired.",
        _UNAUTHORIZED_EXAMPLE,
    ),
    403: (DetailResponse, "The authenticated user lacks permission for this action.", _FORBIDDEN_EXAMPLE),
    409: (ErrorResponse, "The request conflicts with the current state (e.g. a duplicate).", _CONFLICT_EXAMPLE),
    422: (ValidationErrorResponse, "Request validation failed.", _VALIDATION_EXAMPLE),
    429: (RateLimitResponse, "Rate limit exceeded for this endpoint.", _RATE_LIMIT_EXAMPLE),
}

# Status codes that may use either envelope. Maps code -> {style: (model, description, example)}.
_AMBIGUOUS: dict[int, dict[str, tuple[type, str, dict[str, Any]]]] = {
    400: {
        APP: (
            ErrorResponse,
            "The request was malformed or violated a business rule.",
            {"error": "Chat session error", "details": {"reason": "Session is already closed"}},
        ),
        DETAIL: (
            DetailResponse,
            "The request was malformed or violated a business rule.",
            {"detail": "Invalid request"},
        ),
    },
    402: {
        DETAIL: (
            DetailResponse,
            "Payment required -- the user has no reading turns remaining.",
            {"detail": "No turns remaining. Please upgrade your subscription or buy more turns."},
        ),
        APP: (
            ErrorResponse,
            "Payment required -- the user has no reading turns remaining.",
            {"error": "No turns remaining", "details": {"turns": 0}},
        ),
    },
    404: {
        APP: (
            ErrorResponse,
            "The requested resource does not exist.",
            {"error": "Resource not found", "details": {"id": 123}},
        ),
        DETAIL: (DetailResponse, "The requested resource does not exist.", {"detail": "Resource not found"}),
    },
    413: {
        DETAIL: (DetailResponse, "The uploaded file exceeds the maximum allowed size.", {"detail": "File too large"}),
        APP: (
            ErrorResponse,
            "The uploaded file exceeds the maximum allowed size.",
            {"error": "File too large", "details": {"max_size_mb": 1}},
        ),
    },
    500: {
        APP: (ErrorResponse, "An unexpected server error occurred.", _SERVER_ERROR_EXAMPLE),
        DETAIL: (DetailResponse, "An unexpected server error occurred.", {"detail": "Internal server error"}),
    },
    502: {
        APP: (
            ErrorResponse,
            "An upstream or external service failed.",
            {"error": "External service error", "details": {"service": "openai"}},
        ),
        DETAIL: (DetailResponse, "An upstream or external service failed.", {"detail": "External service error"}),
    },
    503: {
        APP: (
            ErrorResponse,
            "The service is temporarily unavailable.",
            {"error": "Service temporarily unavailable", "details": {"retry_after": 30}},
        ),
        DETAIL: (
            DetailResponse,
            "The service is temporarily unavailable.",
            {"detail": "Service temporarily unavailable"},
        ),
    },
}


def _spec_for(code: int, style: str) -> tuple[type, str, dict[str, Any]]:
    """Return ``(model, description, example)`` for a status code and envelope style."""
    if code in _DETERMINISTIC:
        return _DETERMINISTIC[code]
    if code in _AMBIGUOUS:
        by_style = _AMBIGUOUS[code]
        return by_style.get(style) or next(iter(by_style.values()))
    raise KeyError(f"No canonical response is defined for status code {code}")


def _json_content(example: Any = None, examples: dict[str, Any] | None = None) -> dict[str, Any]:
    """Build the ``application/json`` content block from a single or named examples."""
    if examples is not None:
        return {JSON_MEDIA_TYPE: {"examples": examples}}
    return {JSON_MEDIA_TYPE: {"example": example}}


def _entry(
    model: type,
    description: str,
    example: Any = None,
    examples: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Build a ``responses`` entry that carries a model and one or more JSON examples."""
    return {"model": model, "description": description, "content": _json_content(example, examples)}


def error_responses(
    *codes: int,
    style: str = APP,
    overrides: dict[int, dict[str, Any]] | None = None,
) -> dict[int, dict[str, Any]]:
    """Build a ``responses=`` mapping for the given error status codes.

    Args:
        *codes: HTTP status codes the endpoint can return (e.g. ``404, 429``).
        style: Envelope to use for codes that may be raised either way -- ``"app"``
            for the ``{"error", "details"}`` envelope (custom exceptions) or
            ``"detail"`` for FastAPI's ``{"detail"}`` envelope (``HTTPException``).
        overrides: Optional per-code overrides. Each value may set ``description``,
            ``model``, ``example``, or ``examples`` (a map of named OpenAPI examples),
            e.g. ``{404: {"description": "Reading not found", "example": {"detail": "..."}}}``.

    Returns:
        A mapping suitable for splatting into a route decorator's ``responses=``.
    """
    overrides = overrides or {}
    out: dict[int, dict[str, Any]] = {}
    for code in codes:
        model, description, example = _spec_for(code, style)
        override = overrides.get(code, {})
        out[code] = _entry(
            override.get("model", model),
            override.get("description", description),
            override.get("example", example),
            override.get("examples"),
        )
    return out


# --- Global post-processor --------------------------------------------------------

_ERROR_MODELS: tuple[type, ...] = (
    ErrorResponse,
    DetailResponse,
    ValidationErrorResponse,
    ValidationErrorItem,
    RateLimitResponse,
)

_HTTP_METHODS = {"get", "post", "put", "delete", "patch", "options", "head"}


def _ref_entry(model: type, description: str, example: dict[str, Any]) -> dict[str, Any]:
    """Build a raw OpenAPI response object that references a component schema."""
    return {
        "description": description,
        "content": {
            JSON_MEDIA_TYPE: {
                "schema": {"$ref": f"#/components/schemas/{model.__name__}"},
                "example": example,
            }
        },
    }


def _is_default_validation_response(response: dict[str, Any]) -> bool:
    """Return True if a 422 response is FastAPI's auto-generated ``HTTPValidationError``."""
    schema = response.get("content", {}).get(JSON_MEDIA_TYPE, {}).get("schema", {})
    return str(schema.get("$ref", "")).endswith("HTTPValidationError")


def _ensure_error_components(schema: dict[str, Any]) -> None:
    """Make sure every shared error model is present under ``components.schemas``."""
    components = schema.setdefault("components", {}).setdefault("schemas", {})
    for model in _ERROR_MODELS:
        model_schema = model.model_json_schema(ref_template="#/components/schemas/{model}")
        for name, sub_schema in model_schema.pop("$defs", {}).items():
            components.setdefault(name, sub_schema)
        components.setdefault(model.__name__, model_schema)


def _route_requires_admin(route: Any) -> bool:
    """Return True if a route depends on the ``get_admin_user`` dependency.

    Detected by callable name (rather than identity) to avoid importing the auth
    module here, which would create a circular import.
    """
    dependant = getattr(route, "dependant", None)
    if dependant is None:
        return False
    stack = list(getattr(dependant, "dependencies", []))
    while stack:
        dep = stack.pop()
        call = getattr(dep, "call", None)
        if call is not None and getattr(call, "__name__", "") == "get_admin_user":
            return True
        stack.extend(getattr(dep, "dependencies", []))
    return False


def _iter_api_routes(routes: Any) -> Any:
    """Yield every ``APIRoute`` reachable from ``routes``.

    Recent FastAPI versions keep included routers as ``_IncludedRouter`` wrappers in
    ``app.routes`` rather than flattening their routes, so descend into each
    wrapper's ``original_router`` to reach the real endpoints.
    """
    from fastapi.routing import APIRoute

    for route in routes:
        if isinstance(route, APIRoute):
            yield route
        nested = getattr(route, "original_router", route)
        sub = getattr(nested, "routes", None)
        if sub and sub is not routes:
            yield from _iter_api_routes(sub)


def _admin_operations(app: FastAPI) -> set[tuple[str, str]]:
    """Return the ``(method, path)`` pairs whose route is gated behind admin auth."""
    admin_ops: set[tuple[str, str]] = set()
    for route in _iter_api_routes(app.routes):
        if _route_requires_admin(route):
            for method in route.methods or []:
                admin_ops.add((method.lower(), route.path))
    return admin_ops


def _augment_operation(path: str, method: str, operation: dict[str, Any], admin_ops: set[tuple[str, str]]) -> None:
    """Add the universal error responses to a single operation, never overwriting."""
    responses = operation.setdefault("responses", {})

    # Rewrite FastAPI's auto-generated 422 so it matches what the validation handler
    # actually returns. A 422 declared explicitly on the route is left untouched.
    existing_422 = responses.get("422")
    if existing_422 and _is_default_validation_response(existing_422):
        responses["422"] = _ref_entry(ValidationErrorResponse, "Request validation failed.", _VALIDATION_EXAMPLE)

    # Every operation can fail with an unhandled server error.
    responses.setdefault(
        "500", _ref_entry(ErrorResponse, "An unexpected server error occurred.", _SERVER_ERROR_EXAMPLE)
    )

    # Secured operations can fail authentication. ``openapi_extra={"x-optional-auth": True}``
    # opts an endpoint out (used by routes that accept anonymous callers).
    if operation.get("security") and not operation.pop("x-optional-auth", False):
        responses.setdefault(
            "401",
            _ref_entry(
                ErrorResponse,
                "Authentication failed -- the token is missing, malformed, or expired.",
                _UNAUTHORIZED_EXAMPLE,
            ),
        )

    # Admin-gated operations (any router) can fail authorization.
    if (method, path) in admin_ops:
        responses.setdefault("403", _ref_entry(DetailResponse, "Admin access required.", _FORBIDDEN_EXAMPLE))


def setup_openapi(app: FastAPI) -> None:
    """Install a cached ``app.openapi`` builder that documents universal error responses.

    Call this once after all routers have been registered. The builder mirrors
    FastAPI's own ``openapi()`` implementation and then augments each operation, so
    per-route ``responses=`` declarations always take precedence over the universal
    ones added here.
    """

    def custom_openapi() -> dict[str, Any]:
        if app.openapi_schema:
            return app.openapi_schema

        schema = get_openapi(
            title=app.title,
            version=app.version,
            openapi_version=app.openapi_version,
            summary=app.summary,
            description=app.description,
            routes=app.routes,
            tags=app.openapi_tags,
            servers=app.servers,
        )

        _ensure_error_components(schema)
        admin_ops = _admin_operations(app)
        for path, path_item in schema.get("paths", {}).items():
            for method, operation in path_item.items():
                if method.lower() in _HTTP_METHODS and isinstance(operation, dict):
                    _augment_operation(path, method.lower(), operation, admin_ops)

        app.openapi_schema = schema
        return schema

    app.openapi = custom_openapi


def documented_status_codes(operation: dict[str, Any]) -> Iterable[str]:
    """Return the documented status codes for an operation (handy in tests)."""
    return operation.get("responses", {}).keys()
