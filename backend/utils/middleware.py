"""
Custom middleware for the ArcanaAI API.

This module provides custom middleware components that enhance the FastAPI
application with additional functionality such as request logging, timing,
and monitoring capabilities.

Middleware Components:
    - RequestLoggingMiddleware: Logs all HTTP requests with timing and status information

The middleware is designed to provide:
    - Comprehensive request/response logging
    - Performance monitoring with timing metrics
    - Error tracking and debugging information
    - Client information capture
    - Structured logging for monitoring systems

Dependencies:
    - FastAPI for request/response handling
    - Starlette for middleware base classes
    - Custom error handlers for logging

Example:
    Add middleware to FastAPI application:
    ```python
    from utils.middleware import RequestLoggingMiddleware

    app = FastAPI()
    app.add_middleware(RequestLoggingMiddleware)
    ```

Author: ArcanaAI Development Team
Version: 1.0.0
"""

import time

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware

from .error_handlers import logger


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """
    HTTP Request Logging Middleware

    Custom middleware that logs all HTTP requests and responses with comprehensive
    information including timing, status codes, client details, and error information.
    This middleware provides essential monitoring and debugging capabilities for the API.

    Features:
        - Request/response timing measurement
        - Comprehensive request information logging
        - Client IP address capture
        - Error logging with full context
        - Structured logging for monitoring tools
        - Performance metrics for optimization

    Logging Information:
        Success logs include:
            - Process time in milliseconds
            - HTTP status code
            - Request method (GET, POST, etc.)
            - Full request URL
            - Client host/IP address

        Error logs include:
            - All success log information
            - Error message and type
            - Processing time before failure

    Example:
        ```python
        from fastapi import FastAPI
        from utils.middleware import RequestLoggingMiddleware

        app = FastAPI()
        app.add_middleware(RequestLoggingMiddleware)
        ```

    Note:
        This middleware should be added early in the middleware stack to capture
        timing information for the entire request processing pipeline.
    """

    async def dispatch(self, request: Request, call_next):
        """
        Process HTTP request and response with logging

        Handles the complete request/response cycle while capturing timing
        information and logging relevant details for monitoring and debugging.

        Args:
            request (Request): The incoming HTTP request object
            call_next (callable): The next middleware or route handler in the chain

        Returns:
            Response: The HTTP response object from the downstream handlers

        Raises:
            Exception: Re-raises any exceptions from downstream handlers after logging

        Process:
            1. Record start time for performance measurement
            2. Process request through downstream handlers
            3. Calculate processing time
            4. Log success/failure with comprehensive details
            5. Return response or re-raise exception
        """
        # Record start time for performance measurement
        start_time = time.time()

        # Process request through the middleware/handler chain
        try:
            # Call the next middleware or route handler
            response = await call_next(request)

            # Calculate total processing time
            process_time = time.time() - start_time
            status_code = response.status_code

            # Prepare comprehensive log details for successful requests
            log_details = {
                "process_time_ms": round(process_time * 1000, 2),
                "status_code": status_code,
                "method": request.method,
                "url": str(request.url),
                "client_host": request.client.host if request.client else None,
            }

            # Log successful request processing
            logger.logger.info("Request processed successfully", extra=log_details)

            return response

        except Exception as e:
            # Calculate processing time before failure
            process_time = time.time() - start_time

            # Prepare comprehensive log details for failed requests
            log_details = {
                "process_time_ms": round(process_time * 1000, 2),
                "method": request.method,
                "url": str(request.url),
                "client_host": request.client.host if request.client else None,
                "error": str(e),
                "error_type": type(e).__name__,
            }

            # Log failed request processing
            logger.logger.error("Request failed", extra=log_details)

            # Re-raise the exception to maintain normal error handling flow
            raise
