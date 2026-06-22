"""Tests that the generated OpenAPI schema documents error responses for every endpoint.

These guard the documentation that powers ``/docs``, ``/redoc`` and ``/scalar``:
every operation should document more than FastAPI's defaults, the universal error
responses should be injected, and the 422 body should match the API's real shape.
"""

from app import app

HTTP_METHODS = {"get", "post", "put", "delete", "patch"}
DEFAULT_ONLY = {"200", "422"}


def _operations():
    """Yield ``(method, path, operation)`` for every documented operation."""
    schema = app.openapi()
    for path, item in schema.get("paths", {}).items():
        for method, operation in item.items():
            if method.lower() in HTTP_METHODS:
                yield method.lower(), path, operation


def test_every_operation_documents_more_than_defaults():
    """No endpoint should be left documenting only 200/422."""
    thin = [
        f"{method.upper()} {path}"
        for method, path, operation in _operations()
        if set(operation.get("responses", {})) <= DEFAULT_ONLY
    ]
    assert not thin, f"Operations documenting only {sorted(DEFAULT_ONLY)}: {thin}"


def test_every_operation_documents_500():
    """The universal 500 response is injected everywhere."""
    missing = [
        f"{method.upper()} {path}"
        for method, path, operation in _operations()
        if "500" not in operation.get("responses", {})
    ]
    assert not missing, f"Operations missing 500: {missing}"


# Endpoints that accept anonymous callers via get_optional_current_user; they carry a
# security scheme but never return 401 (an invalid token is treated as anonymous).
OPTIONAL_AUTH_PATHS = {"/tarot/featured-cards", "/tarot/card-of-the-day"}


def test_secured_operations_document_401():
    """Operations with a security requirement document 401 (unless opted out)."""
    missing = [
        f"{method.upper()} {path}"
        for method, path, operation in _operations()
        if operation.get("security") and path not in OPTIONAL_AUTH_PATHS and "401" not in operation.get("responses", {})
    ]
    assert not missing, f"Secured operations missing 401: {missing}"


def test_error_models_registered_in_components():
    """The shared error schemas are present so the $ref-based responses resolve."""
    schemas = app.openapi()["components"]["schemas"]
    for name in ("ErrorResponse", "DetailResponse", "ValidationErrorResponse", "RateLimitResponse"):
        assert name in schemas, f"Missing error schema component: {name}"


def test_validation_response_uses_app_envelope():
    """The 422 body matches the validation handler's envelope, not HTTPValidationError."""
    schema = app.openapi()
    ref = schema["paths"]["/auth/register"]["post"]["responses"]["422"]["content"]["application/json"]["schema"]["$ref"]
    assert ref.endswith("ErrorResponse"), ref


def test_optional_auth_endpoints_do_not_document_401():
    """Anonymous-friendly endpoints must not advertise a 401."""
    schema = app.openapi()
    for path in ("/tarot/featured-cards", "/tarot/card-of-the-day"):
        responses = schema["paths"][path]["get"]["responses"]
        assert "401" not in responses, f"{path} should not document 401"
        # And the opt-out marker must not leak into the published schema.
        assert "x-optional-auth" not in schema["paths"][path]["get"]


def test_representative_endpoint_specific_codes():
    """Spot-check that key endpoints expose their domain-specific status codes."""
    schema = app.openapi()
    cases = {
        ("post", "/auth/token"): {"401", "429"},
        ("post", "/tarot/reading"): {"402", "429"},
        ("get", "/admin/users/{user_id}"): {"403", "404"},
        ("get", "/api/journal/entries/{entry_id}"): {"404"},
        ("post", "/api/web-push/subscribe"): {"503"},
    }
    for (method, path), expected in cases.items():
        documented = set(schema["paths"][path][method]["responses"])
        assert expected <= documented, f"{method.upper()} {path} missing {expected - documented}"
