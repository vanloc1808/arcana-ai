"""
Prometheus metrics for the Tarot API application.
"""

import time
from collections.abc import Callable

from fastapi import FastAPI
from prometheus_client import Counter, Gauge, Histogram, Info
from prometheus_fastapi_instrumentator import Instrumentator

# Application info metric
app_info = Info("tarot_app", "Tarot application information")

# Request counters
tarot_requests_total = Counter(
    "tarot_requests_total", "Total number of tarot-related requests", ["endpoint", "method", "status"]
)

# Reading-specific metrics
tarot_readings_total = Counter(
    "tarot_readings_total", "Total number of tarot readings performed", ["reading_type", "status"]
)

tarot_reading_duration = Histogram(
    "tarot_reading_duration_seconds",
    "Duration of tarot readings in seconds",
    ["reading_type"],
    buckets=[0.1, 0.5, 1.0, 2.0, 5.0, 10.0, 30.0, 60.0],
)

# Card-related metrics
tarot_cards_drawn = Counter("tarot_cards_drawn_total", "Total number of tarot cards drawn", ["card_name", "position"])

# User activity metrics
active_users = Gauge("tarot_active_users", "Number of currently active users")

# Authentication metrics
auth_requests_total = Counter(
    "tarot_auth_requests_total",
    "Total authentication requests",
    ["action", "status"],  # action: login, register, logout
)

# Database metrics
database_queries_total = Counter(
    "tarot_database_queries_total", "Total database queries", ["operation", "table", "status"]
)

database_query_duration = Histogram(
    "tarot_database_query_duration_seconds",
    "Database query duration in seconds",
    ["operation", "table"],
    buckets=[0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1.0],
)

# AI/OpenAI API metrics
openai_requests_total = Counter("tarot_openai_requests_total", "Total OpenAI API requests", ["model", "status"])

openai_tokens_used = Counter(
    "tarot_openai_tokens_used_total",
    "Total OpenAI tokens used",
    ["model", "type"],  # type: prompt, completion
)

# Error metrics
application_errors_total = Counter(
    "tarot_application_errors_total", "Total application errors", ["error_type", "endpoint"]
)

# Chat/conversation metrics
chat_messages_total = Counter(
    "tarot_chat_messages_total",
    "Total chat messages processed",
    ["message_type", "status"],  # message_type: user, assistant
)

chat_conversations_active = Gauge("tarot_chat_conversations_active", "Number of active chat conversations")


def setup_metrics(app: FastAPI) -> Instrumentator:
    """
    Set up Prometheus metrics for the FastAPI application.

    Args:
        app: FastAPI application instance

    Returns:
        Configured Instrumentator instance
    """
    # Set application info
    app_info.info({"version": "1.0.0", "name": "ArcanaAI API", "environment": "production"})

    # Create instrumentator with custom configuration
    instrumentator = Instrumentator(
        should_group_status_codes=False,
        should_ignore_untemplated=True,
        should_group_untemplated=True,
        should_instrument_requests_inprogress=True,
        excluded_handlers=["/metrics", "/health", "/docs", "/redoc", "/openapi.json"],
        inprogress_name="tarot_requests_inprogress",
        inprogress_labels=True,
    )

    # Initialize and expose metrics
    instrumentator.instrument(app)
    instrumentator.expose(app, endpoint="/metrics")

    return instrumentator


# Utility functions for custom metrics
def track_tarot_reading(reading_type: str, duration: float, status: str = "success"):
    """Track a tarot reading completion."""
    tarot_readings_total.labels(reading_type=reading_type, status=status).inc()
    tarot_reading_duration.labels(reading_type=reading_type).observe(duration)


def track_card_drawn(card_name: str, position: str = "unknown"):
    """Track a tarot card being drawn."""
    tarot_cards_drawn.labels(card_name=card_name, position=position).inc()


def track_auth_request(action: str, status: str):
    """Track authentication requests."""
    auth_requests_total.labels(action=action, status=status).inc()


def track_database_query(operation: str, table: str, duration: float, status: str = "success"):
    """Track database query execution."""
    database_queries_total.labels(operation=operation, table=table, status=status).inc()
    database_query_duration.labels(operation=operation, table=table).observe(duration)


def track_openai_request(model: str, status: str, prompt_tokens: int = 0, completion_tokens: int = 0):
    """Track OpenAI API requests and token usage."""
    openai_requests_total.labels(model=model, status=status).inc()
    if prompt_tokens > 0:
        openai_tokens_used.labels(model=model, type="prompt").inc(prompt_tokens)
    if completion_tokens > 0:
        openai_tokens_used.labels(model=model, type="completion").inc(completion_tokens)


def track_application_error(error_type: str, endpoint: str):
    """Track application errors."""
    application_errors_total.labels(error_type=error_type, endpoint=endpoint).inc()


def track_chat_message(message_type: str, status: str = "success"):
    """Track chat message processing."""
    chat_messages_total.labels(message_type=message_type, status=status).inc()


# Context managers for timing operations
class MetricsTimer:
    """Context manager for timing operations with automatic metric recording."""

    def __init__(self, metric_func: Callable, *args, **kwargs):
        self.metric_func = metric_func
        self.args = args
        self.kwargs = kwargs
        self.start_time = None

    def __enter__(self):
        self.start_time = time.time()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.start_time:
            duration = time.time() - self.start_time
            self.metric_func(*self.args, duration=duration, **self.kwargs)
