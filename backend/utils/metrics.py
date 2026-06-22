import time
from collections.abc import Awaitable, Callable

from fastapi import FastAPI, Request, Response
from prometheus_client import CONTENT_TYPE_LATEST, Counter, Gauge, Histogram, generate_latest
from starlette.responses import Response as StarletteResponse

PROJECT = "arcana-ai"
COMPONENT = "backend"
COMMON_LABELS = ["project", "component", "env"]

http_requests_total = Counter(
    "arcana_http_requests_total",
    "HTTP requests handled by ArcanaAI.",
    COMMON_LABELS + ["method", "handler", "status"],
)
http_request_duration_seconds = Histogram(
    "arcana_http_request_duration_seconds",
    "HTTP request latency in seconds.",
    COMMON_LABELS + ["method", "handler"],
    buckets=(0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10),
)

tarot_readings_total = Counter(
    "arcana_tarot_readings_total",
    "Tarot reading attempts by type and outcome.",
    COMMON_LABELS + ["reading_type", "status"],
)
tarot_reading_duration_seconds = Histogram(
    "arcana_tarot_reading_duration_seconds",
    "Tarot reading duration in seconds.",
    COMMON_LABELS + ["reading_type"],
    buckets=(0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30, 60),
)

auth_attempts_total = Counter(
    "arcana_auth_attempts_total",
    "Authentication and account-management attempts",
    COMMON_LABELS + ["action", "status"],
)

db_queries_total = Counter(
    "arcana_db_queries_total",
    "Database queries attempts.",
    COMMON_LABELS + ["operation", "table", "status"],
)
db_query_duration_seconds = Histogram(
    "arcana_db_query_duration_seconds",
    "Database query duration in seconds",
    COMMON_LABELS + ["operation", "table"],
    buckets=(0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10),
)

openai_requests_total = Counter(
    "arcana_openai_requests_total",
    "OpenAI requests by model, operation, and outcome.",
    COMMON_LABELS + ["model", "operation", "status"],
)
openai_request_duration_seconds = Histogram(
    "arcana_openai_request_duration_seconds",
    "OpenAI request duration in seconds.",
    COMMON_LABELS + ["model", "operation"],
    buckets=(0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30, 60),
)
openai_tokens_total = Counter(
    "arcana_openai_tokens_total",
    "OpenAI token usage.",
    COMMON_LABELS + ["model", "token_type"],
)
openai_cost_usd_total = Counter(
    "arcana_openai_cost_usd_total",
    "Estimated OpenAI cost in USD.",
    COMMON_LABELS + ["model"],
)
openai_errors_total = Counter(
    "arcana_openai_errors_total",
    "OpenAI errors by model and normalized error type.",
    COMMON_LABELS + ["model", "error_type"],
)

chat_messages_total = Counter(
    "arcana_chat_messages_total",
    "Chat messages sent and received.",
    COMMON_LABELS + ["role", "status"],
)
chat_conversations_total = Counter(
    "arcana_chat_conversations_total",
    "Chat conversation lifecycle events.",
    COMMON_LABELS + ["source", "status"],
)
chat_conversations_active = Gauge(
    "arcana_chat_conversations_active",
    "Currently active chat conversations.",
    COMMON_LABELS,
)

application_errors_total = Counter(
    "arcana_application_errors_total",
    "Application errors by normalized type and handler.",
    COMMON_LABELS + ["error_type", "handler"],
)

celery_tasks_total = Counter(
    "arcana_celery_tasks_total",
    "Celery task executions by queue, task, and outcome.",
    COMMON_LABELS + ["queue", "task_name", "status"],
)
celery_task_duration_seconds = Histogram(
    "arcana_celery_task_duration_seconds",
    "Celery task runtime in seconds.",
    COMMON_LABELS + ["queue", "task_name"],
    buckets=(0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30, 60, 300, 900),
)
celery_task_failures_total = Counter(
    "arcana_celery_task_failures_total",
    "Celery task failures by normalized error type.",
    COMMON_LABELS + ["queue", "task_name", "error_type"],
)

payments_total = Counter(
    "arcana_payments_total",
    "Payment events by provider, event type, and outcome.",
    COMMON_LABELS + ["provider", "event_type", "status"],
)
payment_amount_usd_total = Counter(
    "arcana_payment_amount_usd_total",
    "Successful payment amount in USD.",
    COMMON_LABELS + ["provider", "status"],
)

email_send_total = Counter(
    "arcana_email_send_total",
    "Email sends by type and outcome.",
    COMMON_LABELS + ["email_type", "status"],
)
email_send_duration_seconds = Histogram(
    "arcana_email_send_duration_seconds",
    "Email send duration in seconds.",
    COMMON_LABELS + ["email_type"],
    buckets=(0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30, 60),
)


def _handler_name(request: Request) -> str:
    """Return the name of the route handler for the given request."""
    route = request.scope.get("route")
    return getattr(route, "path", request.url.path)


def setup_metrics(app: FastAPI, env: str) -> None:
    """Setup Prometheus metrics for the FastAPI application."""

    @app.middleware("http")
    async def prometheus_http_metrics(
        request: Request,
        call_next: Callable[[Request], Awaitable[Response]],
    ) -> Response:
        """Implement the middleware to collect Prometheus metrics for HTTP requests."""
        if request.url.path == "/metrics":
            return await call_next(request)

        start = time.perf_counter()
        response = await call_next(request)
        duration = time.perf_counter() - start
        handler = _handler_name(request)
        status = str(response.status_code)

        http_requests_total.labels(
            project=PROJECT,
            component=COMPONENT,
            env=env,
            method=request.method,
            handler=handler,
            status=status,
        ).inc()

        http_request_duration_seconds.labels(
            project=PROJECT,
            component=COMPONENT,
            env=env,
            method=request.method,
            handler=handler,
        ).observe(duration)

        return response

    @app.get("/metrics", include_in_schema=False)
    async def metrics() -> StarletteResponse:
        """Implement endpoint to serve Prometheus metrics."""
        return StarletteResponse(
            content=generate_latest(),
            media_type=CONTENT_TYPE_LATEST,
        )


def base_labels(env: str) -> dict[str, str]:
    """Return a dictionary of base labels for Prometheus metrics."""
    return {"project": PROJECT, "component": COMPONENT, "env": env}


def record_tarot_reading(
    env: str,
    reading_type: str,
    status: str,
    duration: float,
) -> None:
    """Record a tarot reading attempt in Prometheus metrics."""
    labels = base_labels(env)
    tarot_readings_total.labels(
        **labels,
        reading_type=reading_type,
        status=status,
    ).inc()
    tarot_reading_duration_seconds.labels(
        **labels,
        reading_type=reading_type,
    ).observe(duration)


def record_auth_attempt(env: str, action: str, status: str) -> None:
    """Record an authentication or account-management attempt."""
    auth_attempts_total.labels(
        **base_labels(env),
        action=action,
        status=status,
    ).inc()


def record_db_query(
    env: str,
    operation: str,
    table: str,
    status: str,
    duration: float,
) -> None:
    """Record a database query attempt and duration."""
    labels = base_labels(env)
    db_queries_total.labels(
        **labels,
        operation=operation,
        table=table,
        status=status,
    ).inc()
    db_query_duration_seconds.labels(
        **labels,
        operation=operation,
        table=table,
    ).observe(duration)


def record_openai_request(
    env: str,
    model: str,
    operation: str,
    status: str,
    duration: float,
    prompt_tokens: int = 0,
    completion_tokens: int = 0,
    cost_usd: float = 0.0,
    error_type: str | None = None,
) -> None:
    """Record an OpenAI request, including optional tokens, cost, and error type."""
    labels = base_labels(env)
    openai_requests_total.labels(
        **labels,
        model=model,
        operation=operation,
        status=status,
    ).inc()
    openai_request_duration_seconds.labels(
        **labels,
        model=model,
        operation=operation,
    ).observe(duration)

    if prompt_tokens > 0:
        openai_tokens_total.labels(
            **labels,
            model=model,
            token_type="prompt",
        ).inc(prompt_tokens)
    if completion_tokens > 0:
        openai_tokens_total.labels(
            **labels,
            model=model,
            token_type="completion",
        ).inc(completion_tokens)
    if cost_usd > 0:
        openai_cost_usd_total.labels(
            **labels,
            model=model,
        ).inc(cost_usd)
    if error_type:
        openai_errors_total.labels(
            **labels,
            model=model,
            error_type=error_type,
        ).inc()


def record_chat_message(env: str, role: str, status: str) -> None:
    """Record a chat message processed by the backend."""
    chat_messages_total.labels(
        **base_labels(env),
        role=role,
        status=status,
    ).inc()


def record_chat_conversation(env: str, source: str, status: str) -> None:
    """Record a chat conversation lifecycle event."""
    chat_conversations_total.labels(
        **base_labels(env),
        source=source,
        status=status,
    ).inc()


def set_active_chat_conversations(env: str, count: int) -> None:
    """Set the current active chat conversation gauge."""
    chat_conversations_active.labels(**base_labels(env)).set(count)


def increment_active_chat_conversations(env: str, amount: int = 1) -> None:
    """Increase the active chat conversation gauge."""
    chat_conversations_active.labels(**base_labels(env)).inc(amount)


def decrement_active_chat_conversations(env: str, amount: int = 1) -> None:
    """Decrease the active chat conversation gauge."""
    chat_conversations_active.labels(**base_labels(env)).dec(amount)


def record_application_error(env: str, error_type: str, handler: str) -> None:
    """Record an application error with normalized labels."""
    application_errors_total.labels(
        **base_labels(env),
        error_type=error_type,
        handler=handler,
    ).inc()


def record_celery_task(
    env: str,
    queue: str,
    task_name: str,
    status: str,
    duration: float | None = None,
) -> None:
    """Record a Celery task state and optional runtime."""
    labels = base_labels(env)
    celery_tasks_total.labels(
        **labels,
        queue=queue,
        task_name=task_name,
        status=status,
    ).inc()
    if duration is not None:
        celery_task_duration_seconds.labels(
            **labels,
            queue=queue,
            task_name=task_name,
        ).observe(duration)


def record_celery_failure(
    env: str,
    queue: str,
    task_name: str,
    error_type: str,
) -> None:
    """Record a Celery task failure with a normalized error type."""
    celery_task_failures_total.labels(
        **base_labels(env),
        queue=queue,
        task_name=task_name,
        error_type=error_type,
    ).inc()


def record_payment_event(
    env: str,
    provider: str,
    event_type: str,
    status: str,
    amount_usd: float = 0.0,
) -> None:
    """Record a payment event and optional successful amount."""
    labels = base_labels(env)
    payments_total.labels(
        **labels,
        provider=provider,
        event_type=event_type,
        status=status,
    ).inc()
    if amount_usd > 0:
        payment_amount_usd_total.labels(
            **labels,
            provider=provider,
            status=status,
        ).inc(amount_usd)


def record_email_send(
    env: str,
    email_type: str,
    status: str,
    duration: float,
) -> None:
    """Record an email send attempt and duration."""
    labels = base_labels(env)
    email_send_total.labels(
        **labels,
        email_type=email_type,
        status=status,
    ).inc()
    email_send_duration_seconds.labels(
        **labels,
        email_type=email_type,
    ).observe(duration)
