"""
Database configuration and session management for the ArcanaAI API.

This module handles all database-related configuration including:
- SQLAlchemy engine creation with proper connection pooling
- Database session management with dependency injection
- Database connection URL configuration
- Connection pool optimization for production use

The database configuration supports multiple database backends through
SQLAlchemy, with optimized settings for both SQLite (development) and
PostgreSQL (production) databases.

Key Features:
    - Connection pooling for efficient database access
    - Automatic session cleanup with dependency injection
    - Database URL validation and normalization
    - Production-ready connection pool settings
    - Proper exception handling for database errors

Dependencies:
    - SQLAlchemy for ORM and database abstraction
    - Custom settings configuration

Example:
    Use the database session in FastAPI routes:
    ```python
    from database import get_db

    @app.get("/users")
    def get_users(db: Session = Depends(get_db)):
        return db.query(User).all()
    ```

Author: ArcanaAI Development Team
"""

import time
from collections.abc import Generator
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import create_engine, event
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import Session, sessionmaker

from config import settings
from utils.error_handlers import logger

# Load environment variables
load_dotenv(Path(".env"))

# Get database URL from environment variables
SQLALCHEMY_DATABASE_URL = settings.SQLALCHEMY_DATABASE_URL.replace("sqlite+pysqlite", "sqlite")

# Determine if we're using PostgreSQL
is_postgres = "postgres" in SQLALCHEMY_DATABASE_URL.lower()

# Configure connection pooling based on environment
if is_postgres:
    # Production PostgreSQL settings
    pool_settings = {
        "pool_pre_ping": True,  # Enable connection health checks
        "pool_size": 20,  # Increased pool size for production
        "max_overflow": 30,  # Allow more overflow connections
        "pool_timeout": 30,  # Connection timeout in seconds
        "pool_recycle": 1800,  # Recycle connections after 30 minutes
        "pool_use_lifo": True,  # Use LIFO for better connection reuse
        "echo": settings.DEBUG_SQL,  # Enable SQL echo only when DEBUG_SQL=true
    }
else:
    # Development SQLite settings
    pool_settings = {
        "pool_pre_ping": True,
        "pool_size": 5,
        "max_overflow": 10,
        "pool_timeout": 30,
        "pool_recycle": 1800,
        "echo": settings.DEBUG_SQL,  # Enable SQL echo only when DEBUG_SQL=true
    }

# Create database engine with connection parameters
engine = create_engine(SQLALCHEMY_DATABASE_URL, **pool_settings)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create base class for models
Base = declarative_base()


# Add SQL query logging
@event.listens_for(engine, "before_cursor_execute")
def before_cursor_execute(conn, cursor, statement, parameters, context, executemany):
    conn.info.setdefault("query_start_time", []).append(time.time())


@event.listens_for(engine, "after_cursor_execute")
def after_cursor_execute(conn, cursor, statement, parameters, context, executemany):
    total = time.time() - conn.info["query_start_time"].pop(-1)
    logger.logger.debug(
        "Database query executed",
        extra={
            "query": statement,
            "parameters": str(parameters),
            "execution_time_ms": round(total * 1000, 2),
        },
    )


def get_db() -> Generator[Session, None, None]:
    """
    Database Session Dependency

    Provides a database session for FastAPI route handlers using dependency injection.
    Ensures proper session lifecycle management with automatic cleanup.

    This function creates a new database session for each request and ensures
    it's properly closed after the request is completed, even if an exception occurs.

    Yields:
        Session: SQLAlchemy database session

    Example:
        Use in FastAPI route handlers:
        ```python
        @app.get("/users")
        def get_users(db: Session = Depends(get_db)):
            users = db.query(User).all()
            return users
        ```

    Note:
        The session is automatically closed after the request completes,
        ensuring no database connection leaks occur.

    Raises:
        SQLAlchemyError: If database connection or session creation fails
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
