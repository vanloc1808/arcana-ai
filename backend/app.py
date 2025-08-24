"""
FastAPI application for the ArcanaAI API.

This module initializes the FastAPI application with all necessary middleware,
exception handlers, routers, and configuration. It serves as the main entry
point for the backend API service.

The application includes:
- JWT-based authentication
- Rate limiting
- CORS configuration
- Prometheus metrics collection
- Comprehensive error handling
- Database table creation
- Multiple routers for different features

Dependencies:
    - FastAPI for the web framework
    - SQLAlchemy for database operations
    - Prometheus for metrics collection
    - Redis for rate limiting and caching
    - Custom middleware and error handlers

Example:
    Run the application using uvicorn:
    ```bash
    uvicorn app:app --host 0.0.0.0 --port 8000 --reload
    ```

Author: ArcanaAI Development Team
Version: 1.0.0
"""

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded
from sqlalchemy.exc import IntegrityError, OperationalError, SQLAlchemyError

from config import settings
from database import Base, engine
from routers import admin, auth, changelog, chat, health, journal, sharing, subscription, support, tarot, tasks
from utils.error_handlers import (
    TarotAPIException,
    general_exception_handler,
    integrity_error_handler,
    operational_error_handler,
    sqlalchemy_exception_handler,
    tarot_exception_handler,
    validation_exception_handler,
)
from utils.metrics import setup_metrics
from utils.middleware import RequestLoggingMiddleware
from utils.rate_limiter import limiter, rate_limit_exceeded_handler

# Create database tables on startup
# This ensures all tables are created before the application starts
Base.metadata.create_all(bind=engine)

# Initialize FastAPI application with metadata
# https://stackoverflow.com/questions/73677919/how-to-disable-swagger-ui-documentation-in-fastapi-for-production-server
app = FastAPI(
    title="ArcanaAI API",
    description="An AI-powered tarot reading service with subscription management, "
    "chat functionality, and comprehensive tarot card interpretations",
    version="1.0.0",
    docs_url="/docs" if settings.FASTAPI_ENV == "local" else None,
    redoc_url="/redoc" if settings.FASTAPI_ENV == "local" else None,
    openapi_url="/openapi.json" if settings.FASTAPI_ENV == "local" else None,
)

# Configure rate limiting
# Add the limiter to the app state and register exception handler
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)

# Setup Prometheus metrics collection
# This enables monitoring and observability for the application
instrumentator = setup_metrics(app)

# Add custom middleware
# Request logging middleware must be added before CORS middleware
app.add_middleware(RequestLoggingMiddleware)

# Configure CORS (Cross-Origin Resource Sharing)
# This allows the frontend to communicate with the backend API
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # Local development
        "http://localhost:3001",  # Alternative local port
        "http://127.0.0.1:3000",  # Alternative localhost
        "https://arcanaai.nguyenvanloc.com",  # Production domain
        "https://www.arcanaai.nguyenvanloc.com",  # Production www domain
        "https://tarot-reader.nguyenvanloc.com",  # Tarot reader domain
        "https://www.tarot-reader.nguyenvanloc.com",  # Tarot reader www domain
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=[
        "Accept",
        "Accept-Language",
        "Content-Language",
        "Content-Type",
        "Authorization",
        "X-Requested-With",
        "X-Access-Token",
        "Cache-Control",
        "Pragma",
        "Origin",
        "DNT",
        "User-Agent",
        "Referer",
        "sec-ch-ua",
        "sec-ch-ua-mobile",
        "sec-ch-ua-platform",
    ],
    expose_headers=["X-Access-Token", "Access-Control-Expose-Headers"],
)

# Register exception handlers
# These handlers provide consistent error responses across the application
app.add_exception_handler(TarotAPIException, tarot_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(SQLAlchemyError, sqlalchemy_exception_handler)
app.add_exception_handler(IntegrityError, integrity_error_handler)
app.add_exception_handler(OperationalError, operational_error_handler)
app.add_exception_handler(Exception, general_exception_handler)

# Include API routers
# Each router handles a specific domain of functionality
app.include_router(auth.router)  # Authentication and user management
app.include_router(chat.router)  # Chat sessions and messaging
app.include_router(tarot.router)  # Tarot readings and card operations
app.include_router(tasks.router)  # Background tasks and job management
app.include_router(health.router)  # Health checks and system status
app.include_router(admin.router)  # Administrative functions
app.include_router(sharing.router)  # Reading sharing functionality
app.include_router(subscription.router)  # Subscription and payment management
app.include_router(journal.router)  # Advanced tarot journal and personal growth
app.include_router(support.router)  # Support ticket system with file uploads
app.include_router(changelog.router)  # Changelog and version information


@app.get("/")
async def root():
    """
    API Root Endpoint

    Welcome endpoint that provides basic information about the ArcanaAI API
    and links to interactive documentation.

    Returns:
        dict: API welcome information
            - message (str): Welcome message
            - docs_url (str): URL to Swagger UI documentation
            - redoc_url (str): URL to ReDoc documentation

    Example Response:
        ```json
        {
            "message": "Welcome to the ArcanaAI API",
            "docs_url": "/docs",
            "redoc_url": "/redoc"
        }
        ```

    Note:
        This endpoint does not require authentication and can be used for health checks.
    """
    return {
        "message": "Welcome to the ArcanaAI API",
        "docs_url": "/docs",
        "redoc_url": "/redoc",
    }
