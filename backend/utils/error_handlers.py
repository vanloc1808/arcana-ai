import json
import logging
from datetime import datetime
from typing import Any

from fastapi import Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError, OperationalError, SQLAlchemyError

from config import settings
from utils.telegram_alerts import is_telegram_configured, send_500_error_alert


# Configure structured logging
class StructuredLogger:
    """Structured logger for the Tarot API, outputs logs in JSON format."""

    def __init__(self):
        """Initializes the structured logger and sets up the JSON formatter."""
        self.logger = logging.getLogger("tarot_api")
        self.logger.setLevel(logging.INFO)

        # Create JSON formatter
        class JsonFormatter(logging.Formatter):
            def format(self, record):
                log_data = {
                    "timestamp": datetime.utcnow().isoformat(),
                    "level": record.levelname,
                    "message": record.getMessage(),
                    "module": record.module,
                    "function": record.funcName,
                    "line": record.lineno,
                }

                # Add extra fields if they exist
                if hasattr(record, "extra"):
                    log_data.update(record.extra)

                return json.dumps(log_data)

        # Add JSON handler
        handler = logging.StreamHandler()
        handler.setFormatter(JsonFormatter())
        self.logger.addHandler(handler)

    def log_request(self, request: Request, response: Any = None, error: Exception | None = None):
        """Logs an HTTP request and its outcome.

        Args:
            request (Request): The FastAPI request object.
            response (Any, optional): The response object.
            error (Exception, optional): Any error that occurred.
        """
        extra = {
            "method": request.method,
            "url": str(request.url),
            "client_host": request.client.host if request.client else None,
            "status_code": getattr(response, "status_code", None) if response else None,
        }

        if error:
            extra["error"] = str(error)
            self.logger.error("Request failed", extra=extra)
        else:
            self.logger.info("Request processed", extra=extra)


# Initialize logger
logger = StructuredLogger()


# Custom exceptions
class TarotAPIException(Exception):
    """Base exception for Tarot API errors.

    Attributes:
        message (str): Error message.
        status_code (int): HTTP status code.
        details (dict): Additional error details.
    """

    def __init__(
        self,
        message: str,
        status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
        details: dict = None,
    ):
        self.message = message
        self.status_code = status_code
        self.details = details or {}
        super().__init__(self.message)


class AuthenticationError(TarotAPIException):
    """Exception for authentication failures (HTTP 401)."""

    def __init__(self, message: str = "Authentication failed", details: dict = None):
        super().__init__(message, status.HTTP_401_UNAUTHORIZED, details)


class ValidationError(TarotAPIException):
    """Exception for validation errors (HTTP 422)."""

    def __init__(self, message: str = "Validation error", details: dict = None):
        super().__init__(message, status.HTTP_422_UNPROCESSABLE_ENTITY, details)


class DatabaseError(TarotAPIException):
    """Exception for general database errors (HTTP 500)."""

    def __init__(self, message: str = "Database error", details: dict = None):
        super().__init__(message, status.HTTP_500_INTERNAL_SERVER_ERROR, details)


# Additional custom exceptions
class ResourceNotFoundError(TarotAPIException):
    """Exception for resource not found errors (HTTP 404)."""

    def __init__(self, message: str = "Resource not found", details: dict = None):
        super().__init__(message, status.HTTP_404_NOT_FOUND, details)


class UserNotFoundError(TarotAPIException):
    """Exception for user not found errors (HTTP 401)."""

    def __init__(self, message: str = "User not found", details: dict = None):
        super().__init__(message, status.HTTP_401_UNAUTHORIZED, details)


class PermissionDeniedError(TarotAPIException):
    """Exception for permission denied errors (HTTP 403)."""

    def __init__(self, message: str = "Permission denied", details: dict = None):
        super().__init__(message, status.HTTP_403_FORBIDDEN, details)


class RateLimitError(TarotAPIException):
    """Exception for rate limit exceeded errors (HTTP 429)."""

    def __init__(self, message: str = "Rate limit exceeded", details: dict = None):
        super().__init__(message, status.HTTP_429_TOO_MANY_REQUESTS, details)


class ServiceUnavailableError(TarotAPIException):
    """Exception for service temporarily unavailable errors (HTTP 503)."""

    def __init__(self, message: str = "Service temporarily unavailable", details: dict = None):
        super().__init__(message, status.HTTP_503_SERVICE_UNAVAILABLE, details)


class ExternalServiceError(TarotAPIException):
    """Exception for external service errors (HTTP 502)."""

    def __init__(self, message: str = "External service error", details: dict = None):
        super().__init__(message, status.HTTP_502_BAD_GATEWAY, details)


# Chat-specific exceptions
class ChatSessionError(TarotAPIException):
    """Exception for chat session errors (HTTP 400)."""

    def __init__(self, message: str = "Chat session error", details: dict = None):
        super().__init__(message, status.HTTP_400_BAD_REQUEST, details)


class MessageGenerationError(TarotAPIException):
    """Exception for message generation errors (HTTP 500)."""

    def __init__(self, message: str = "Error generating message", details: dict = None):
        super().__init__(message, status.HTTP_500_INTERNAL_SERVER_ERROR, details)


class IntentDetectionError(TarotAPIException):
    """Exception for intent detection errors (HTTP 500)."""

    def __init__(self, message: str = "Error detecting message intent", details: dict = None):
        super().__init__(message, status.HTTP_500_INTERNAL_SERVER_ERROR, details)


class RateLimitExceededError(TarotAPIException):
    """Exception for rate limit exceeded errors (HTTP 429)."""

    def __init__(self, message: str = "Rate limit exceeded", details: dict = None):
        super().__init__(message, status.HTTP_429_TOO_MANY_REQUESTS, details)


async def extract_request_payload(request: Request) -> dict[str, Any] | None:
    """
    Extract request payload/body for debugging purposes.

    Args:
        request (Request): FastAPI Request object.

    Returns:
        Optional[Dict[str, Any]]: Dict containing request payload or None if unable to extract.
    """
    try:
        # Try to get JSON body
        content_type = request.headers.get("content-type", "").lower()

        if "application/json" in content_type:
            # Clone the request body since it can only be read once
            body = await request.body()
            if body:
                return json.loads(body.decode("utf-8"))
        elif "application/x-www-form-urlencoded" in content_type:
            # Handle form data
            form_data = await request.form()
            return dict(form_data)
        elif "multipart/form-data" in content_type:
            # Handle multipart form data (files, etc.)
            form_data = await request.form()
            result = {}
            for key, value in form_data.items():
                if hasattr(value, "filename"):  # File upload
                    result[key] = f"<FILE: {value.filename}>"
                else:
                    result[key] = str(value)
            return result
        else:
            # Handle query parameters
            if request.query_params:
                return dict(request.query_params)

    except Exception as e:
        logger.logger.warning(f"Failed to extract request payload: {e}")

    return None


def get_safe_headers(request: Request) -> dict[str, str]:
    """
    Extract safe headers for debugging (excluding sensitive information).

    Args:
        request (Request): FastAPI Request object.

    Returns:
        Dict[str, str]: Dict containing safe headers.
    """
    safe_headers = {}
    sensitive_headers = {"authorization", "cookie", "x-api-key", "x-auth-token"}

    for key, value in request.headers.items():
        if key.lower() not in sensitive_headers:
            safe_headers[key] = value

    return safe_headers


# Exception handlers
async def tarot_exception_handler(request: Request, exc: TarotAPIException):
    logger.log_request(request, error=exc)

    # Send Telegram alert for 500 errors only if Telegram is configured
    if exc.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR and is_telegram_configured(
        settings.TELEGRAM_BOT_TOKEN, settings.TELEGRAM_CHAT_ID
    ):
        request_payload = await extract_request_payload(request)
        request_headers = get_safe_headers(request)

        send_500_error_alert(
            request_method=request.method,
            request_url=str(request.url),
            error=exc,
            telegram_bot_token=settings.TELEGRAM_BOT_TOKEN,
            chat_id=settings.TELEGRAM_CHAT_ID,
            client_host=request.client.host if request.client else None,
            request_payload=request_payload,
            request_headers=request_headers,
        )

    return JSONResponse(
        status_code=exc.status_code,
        content={"error": exc.message, "details": exc.details},
    )


async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.log_request(request, error=exc)
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": "Validation error",
            "details": [{"loc": err["loc"], "msg": err["msg"]} for err in exc.errors()],
        },
    )


async def sqlalchemy_exception_handler(request: Request, exc: SQLAlchemyError):
    logger.log_request(request, error=exc)

    # Send Telegram alert for database errors only if Telegram is configured
    if is_telegram_configured(settings.TELEGRAM_BOT_TOKEN, settings.TELEGRAM_CHAT_ID):
        request_payload = await extract_request_payload(request)
        request_headers = get_safe_headers(request)

        send_500_error_alert(
            request_method=request.method,
            request_url=str(request.url),
            error=exc,
            telegram_bot_token=settings.TELEGRAM_BOT_TOKEN,
            chat_id=settings.TELEGRAM_CHAT_ID,
            client_host=request.client.host if request.client else None,
            request_payload=request_payload,
            request_headers=request_headers,
        )

    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"error": "Database error", "details": str(exc)},
    )


async def general_exception_handler(request: Request, exc: Exception):
    logger.log_request(request, error=exc)

    # Send Telegram alert for general exceptions only if Telegram is configured
    if is_telegram_configured(settings.TELEGRAM_BOT_TOKEN, settings.TELEGRAM_CHAT_ID):
        request_payload = await extract_request_payload(request)
        request_headers = get_safe_headers(request)

        send_500_error_alert(
            request_method=request.method,
            request_url=str(request.url),
            error=exc,
            telegram_bot_token=settings.TELEGRAM_BOT_TOKEN,
            chat_id=settings.TELEGRAM_CHAT_ID,
            client_host=request.client.host if request.client else None,
            request_payload=request_payload,
            request_headers=request_headers,
        )

    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"error": "Internal server error", "details": str(exc)},
    )


# Additional exception handlers
async def integrity_error_handler(request: Request, exc: IntegrityError):
    logger.log_request(request, error=exc)
    return JSONResponse(
        status_code=status.HTTP_409_CONFLICT,
        content={"error": "Database integrity error", "details": str(exc)},
    )


async def operational_error_handler(request: Request, exc: OperationalError):
    logger.log_request(request, error=exc)
    return JSONResponse(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        content={"error": "Database operational error", "details": str(exc)},
    )
