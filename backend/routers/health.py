"""
Health check endpoints for the ArcanaAI API.

This module provides health monitoring and diagnostic endpoints that can be used
by monitoring systems, load balancers, and deployment tools to check the
application's health status.

Endpoints:
    - GET /health/: Basic application health check
    - GET /health/db: Database connectivity health check
    - GET /health/test-500: Error testing endpoint (local environment only)

The health endpoints are designed to:
    - Provide quick response times for monitoring systems
    - Detect database connectivity issues
    - Enable testing of error handling and alerting systems
    - Return structured JSON responses with clear status indicators

Dependencies:
    - FastAPI for routing
    - SQLAlchemy for database health checks
    - Custom error handlers for logging

Usage:
    These endpoints are typically called by:
    - Kubernetes liveness and readiness probes
    - Load balancer health checks
    - Monitoring systems like Prometheus
    - CI/CD pipelines for deployment validation

Example:
    ```bash
    curl -f http://api.example.com/health/
    curl -f http://api.example.com/health/db
    ```

Author: ArcanaAI Development Team
Version: 1.0.0
"""

import traceback

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session

from config import settings
from database import get_db
from utils.error_handlers import logger

# Initialize health router with prefix and tags for OpenAPI documentation
router = APIRouter(prefix="/health", tags=["health"])


@router.get("/")
async def health_check():
    """
    Basic Application Health Check

    Performs a basic health check to verify that the API service is running
    and responding to requests. This endpoint has minimal dependencies and
    should respond quickly for monitoring systems.

    Returns:
        dict: Health status information
            - status (str): Always "ok" if the service is running
            - message (str): Human-readable health message

    Response Codes:
        - 200: Service is healthy and responding
        - 5xx: Service is experiencing issues (handled by global error handlers)

    Example Response:
        ```json
        {
            "status": "ok",
            "message": "Application is healthy"
        }
        ```

    Note:
        This endpoint does not check external dependencies like databases
        or third-party services. Use /health/db for database-specific checks.
    """
    return {"status": "ok", "message": "Application is healthy"}


@router.get("/db")
async def check_db_health(db: Session = Depends(get_db)):
    """
    Database Connectivity Health Check

    Verifies that the application can successfully connect to and query the database.
    This endpoint performs a simple SQL query to test database connectivity and
    response time.

    Args:
        db (Session): Database session dependency injection

    Returns:
        dict: Database health status
            - status (str): "healthy" or "unhealthy"
            - database (str): "connected" or "disconnected"
            - error (str, optional): Error message if database is unhealthy

    Response Codes:
        - 200: Database is healthy and accessible
        - 200: Database is unhealthy (returns unhealthy status in JSON)

    Example Responses:
        Healthy database:
        ```json
        {
            "status": "healthy",
            "database": "connected"
        }
        ```

        Unhealthy database:
        ```json
        {
            "status": "unhealthy",
            "database": "disconnected",
            "error": "Connection timeout"
        }
        ```

    Note:
        This endpoint always returns HTTP 200, even for database failures.
        Check the "status" field in the response to determine actual health.
        Database errors are logged for monitoring and debugging.
    """
    try:
        # Execute a simple SQL query to test database connectivity
        # This query should work with any SQL database (SQLite, PostgreSQL, etc.)
        db.execute(text("SELECT 1"))
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        # Log the error with full context for debugging
        logger.logger.error(
            "Database health check failed",
            extra={
                "error": str(e),
                "error_type": type(e).__name__,
                "traceback": traceback.format_exc(),
            },
        )
        # Return unhealthy status but still HTTP 200 for monitoring systems
        return {"status": "unhealthy", "database": "disconnected", "error": str(e)}


@router.get("/test-500")
async def test_500_error():
    """
    Error Testing Endpoint

    This endpoint intentionally triggers a 500 Internal Server Error
    by performing division by zero. It's designed for testing error handling,
    logging, and alerting systems (like Telegram notifications).

    Security Note:
        This endpoint is only available when FASTAPI_ENV=local to prevent
        abuse in production environments.

    ⚠️ WARNING:
        - This endpoint will trigger error alerts if monitoring is configured
        - Only use this endpoint for testing purposes
        - Not available in production environments

    Returns:
        This endpoint never returns successfully - it always raises an exception

    Raises:
        HTTPException:
            - 404 if not in local environment
        ZeroDivisionError:
            - Always raised due to division by zero when in local environment

    Response Codes:
        - 404: Endpoint not available (not in local environment)
        - 500: Internal server error (intentional, for testing)

    Example Usage:
        ```bash
        # This will return 404 in production
        curl -X GET "http://api.example.com/health/test-500"

        # This will return 500 in local environment
        FASTAPI_ENV=local curl -X GET "http://localhost:8000/health/test-500"
        ```

    Note:
        - Use this endpoint to verify that error handling works correctly
        - Verify that error alerts (Telegram, email, etc.) are functioning
        - Test monitoring system responses to 500 errors
        - Validate that error logging captures sufficient detail
    """
    # Security check: only allow access in local development environment
    if settings.FASTAPI_ENV != "local":
        raise HTTPException(
            status_code=404,
            detail="Endpoint not found. This endpoint is only available in local environment.",
        )

    # Intentionally trigger a ZeroDivisionError for testing
    # This will be caught by the global exception handler and logged
    result = 1 / 0
    return {"result": result}  # This line will never be reached
