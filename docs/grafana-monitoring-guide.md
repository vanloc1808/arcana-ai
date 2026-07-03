# ArcanaAI Metrics Implementation Guide

ArcanaAI no longer owns or runs Prometheus, Grafana, alert rules, or dashboard provisioning from this repository. The central monitoring stack is deployed from the standalone `central-monitoring` repo.

This guide documents the ArcanaAI application metrics exposed by the backend and Celery services, and how to wire those producer endpoints into the central stack.

## 1. Architecture

ArcanaAI is only a metrics producer. Prometheus and Grafana live elsewhere:

```text
ArcanaAI services                   central-monitoring repo
tarot-backend:8000/metrics    ->    Prometheus     ->     Grafana
tarot-celery-worker:8001/metrics
tarot-celery-beat:8001/metrics
```

Current intended labels for ArcanaAI series:

```promql
project="arcana-ai"
component=~"backend|celery"
env="production"
```

Do not add Prometheus, Grafana, node-exporter, cAdvisor, or dashboard provisioning back to this repo. Keep those in `central-monitoring`.

## 2. Pull Mode vs Push Mode

Use pull mode when ArcanaAI and `central-monitoring` run on the same VPS and share the Docker `localnet` network.

1. ArcanaAI exposes internal Prometheus endpoints from `tarot-backend:8000`, `tarot-celery-worker:8001`, and `tarot-celery-beat:8001`.
2. The central Prometheus scrape config, in `central-monitoring`, targets those service names over the shared Docker network.
3. The application metrics include labels such as `project="arcana-ai"`, `component="backend"`, and `component="celery"`.
4. No public ArcanaAI metrics endpoint is required.

Use push mode only when ArcanaAI runs on a different host from central Prometheus.

1. A local agent from `central-monitoring` runs near ArcanaAI.
2. The agent scrapes ArcanaAI locally.
3. The agent remote-writes samples to central Prometheus using the central repo's authenticated ingest endpoint.

For the current same-VPS setup, prefer pull mode over push mode.

## 3. What `/metrics` Should Expose

Expose only Prometheus text format at each metrics endpoint:

```http
GET /metrics
```

The endpoint should include:

- Process/runtime metrics from `prometheus_client`, if useful.
- Backend HTTP request counters and latency histograms from `tarot-backend:8000/metrics`.
- Tarot reading counters and latency histograms.
- Auth success/failure counters.
- Database query counters and latency histograms.
- OpenAI request, token, cost, latency, and error counters.
- Chat message and conversation counters/gauges.
- Application error counters.
- Celery task counters and duration histograms from `tarot-celery-worker:8001/metrics`.
- Payment counters and email counters; email counters are emitted by Celery tasks and scraped from Celery metrics.

Do not expose user identifiers, emails, request IDs, raw prompts, card question text, payment IDs, or any other sensitive/high-cardinality data as metric labels.

## 4. Manual FastAPI Instrumentation

Add Prometheus support explicitly when you are ready:

```bash
cd backend
uv add prometheus-client
```

Create a small metrics module. Keep names stable and labels low-cardinality:

```python
# backend/utils/metrics.py
import time
from collections.abc import Awaitable, Callable

from fastapi import FastAPI, Request, Response
from prometheus_client import CONTENT_TYPE_LATEST, Counter, Gauge, Histogram, generate_latest
from starlette.responses import Response as StarletteResponse

PROJECT = "arcana-ai"
COMPONENT = "backend"

http_requests_total = Counter(
    "arcana_http_requests_total",
    "HTTP requests handled by ArcanaAI.",
    ["project", "component", "env", "method", "handler", "status"],
)

http_request_duration_seconds = Histogram(
    "arcana_http_request_duration_seconds",
    "HTTP request latency in seconds.",
    ["project", "component", "env", "method", "handler"],
    buckets=(0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10),
)


def _handler_name(request: Request) -> str:
    route = request.scope.get("route")
    return getattr(route, "path", request.url.path)


def setup_metrics(app: FastAPI, env: str) -> None:
    @app.middleware("http")
    async def prometheus_http_metrics(
        request: Request,
        call_next: Callable[[Request], Awaitable[Response]],
    ) -> Response:
        if request.url.path == "/metrics":
            return await call_next(request)

        start = time.perf_counter()
        response = await call_next(request)
        duration = time.perf_counter() - start
        handler = _handler_name(request)
        status = str(response.status_code)

        http_requests_total.labels(PROJECT, COMPONENT, env, request.method, handler, status).inc()
        http_request_duration_seconds.labels(PROJECT, COMPONENT, env, request.method, handler).observe(duration)
        return response

    @app.get("/metrics", include_in_schema=False)
    async def metrics() -> StarletteResponse:
        return StarletteResponse(generate_latest(), media_type=CONTENT_TYPE_LATEST)
```

Then call it from `backend/app.py` after the FastAPI app is created:

```python
from utils.metrics import setup_metrics

setup_metrics(app, env=settings.FASTAPI_ENV)
```

At this point, generic HTTP metrics are covered. The next step is to define
the domain metrics below and record them beside the code that knows the
business outcome. For example, HTTP middleware knows that `POST /tarot/reading`
returned `200`, but `backend/routers/tarot.py` knows whether that request was a
three-card reading, a compatibility reading, an insufficient-turns failure, or
a successful card draw.

## 5. Metrics To Define Now

Add these definitions in `backend/utils/metrics.py` below the HTTP metrics you
already created. Keep `project`, `component`, and `env` on every ArcanaAI
application metric so central dashboards can filter with
`project="arcana-ai"` and `component="backend"`.

```python
COMMON_LABELS = ["project", "component", "env"]

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
    "Authentication and account-management attempts.",
    COMMON_LABELS + ["action", "status"],
)

db_queries_total = Counter(
    "arcana_db_queries_total",
    "Database query attempts.",
    COMMON_LABELS + ["operation", "table", "status"],
)
db_query_duration_seconds = Histogram(
    "arcana_db_query_duration_seconds",
    "Database query duration in seconds.",
    COMMON_LABELS + ["operation", "table"],
    buckets=(0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5),
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
    buckets=(0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30, 60),
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
    "Chat messages processed.",
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
```

Optional helper functions can keep call sites compact and consistent:

```python
def base_labels(env: str) -> dict[str, str]:
    return {"project": PROJECT, "component": COMPONENT, "env": env}


def record_tarot_reading(env: str, reading_type: str, status: str, duration: float) -> None:
    labels = base_labels(env)
    tarot_readings_total.labels(**labels, reading_type=reading_type, status=status).inc()
    tarot_reading_duration_seconds.labels(**labels, reading_type=reading_type).observe(duration)
```

## 6. Where To Record Each Metric

Use this as the implementation checklist. The metric belongs at the code path
that has the most accurate outcome and label context.

| Area | Primary files | Record |
|---|---|---|
| HTTP | `backend/utils/metrics.py` middleware | `arcana_http_requests_total`, `arcana_http_request_duration_seconds` for every non-`/metrics` request |
| Tarot readings | `backend/routers/tarot.py` | `arcana_tarot_readings_total`, `arcana_tarot_reading_duration_seconds` in `/tarot/reading` and `/tarot/compatibility` |
| Tarot interpretation | `backend/routers/tarot.py`, `backend/tarot_reader.py` | OpenAI metrics for compatibility interpretation and stream paths; use tarot metrics only for the card draw/read event |
| Auth | `backend/routers/auth.py` | `arcana_auth_attempts_total` for `register`, `login`, `refresh`, `forgot_password`, and `reset_password` |
| Database | `backend/database.py` SQLAlchemy engine events, or service-level wrappers where table is known | `arcana_db_queries_total`, `arcana_db_query_duration_seconds`; use `operation=select|insert|update|delete|other` and `table=unknown` if parsing table safely is not worth it |
| OpenAI | `backend/tarot_reader.py`, `backend/routers/chat.py` | `arcana_openai_requests_total`, `arcana_openai_request_duration_seconds`, `arcana_openai_tokens_total`, `arcana_openai_cost_usd_total`, `arcana_openai_errors_total` |
| Chat | `backend/routers/chat.py` | `arcana_chat_messages_total`, `arcana_chat_conversations_total`, `arcana_chat_conversations_active` |
| Application errors | `backend/utils/error_handlers.py` | `arcana_application_errors_total` from normalized exception classes and route handlers |
| Celery | `backend/celery_app.py` signals, or each module in `backend/tasks/` | `arcana_celery_tasks_total`, `arcana_celery_task_duration_seconds`, `arcana_celery_task_failures_total` |
| Payments | `backend/routers/subscription.py`, `backend/services/subscription_service.py` | `arcana_payments_total`, `arcana_payment_amount_usd_total` for Lemon Squeezy checkout/webhooks and Ethereum payments |
| Email | `backend/tasks/email_tasks.py`, legacy direct send paths in `backend/routers/auth.py` if still used | `arcana_email_send_total`, `arcana_email_send_duration_seconds` |

Suggested status values:

- Business outcomes: `success`, `error`, `validation_error`, `insufficient_turns`, `not_found`, `rejected`, `queued`.
- HTTP status: keep the numeric status string, such as `200`, `401`, `500`.
- Celery status: `started`, `success`, `failure`, `retry`, `revoked`.
- Payment status: `created`, `paid`, `failed`, `refunded`, `ignored`, `signature_error`.

Suggested operation values:

- OpenAI: `chat_message`, `tarot_interpretation`, `compatibility_interpretation`, `title_generation`.
- Auth: `register`, `login`, `refresh`, `forgot_password`, `reset_password`.
- Email: `password_reset`, `welcome`, `reading_reminder`, `system_notification`, `bulk_notification`.
- Payments: `checkout_created`, `webhook_received`, `subscription_created`, `subscription_updated`, `order_created`, `ethereum_payment`.

## 7. Copy-Ready Implementation Snippets

These examples use the helper functions in `backend/utils/metrics.py`. Keep the
imports local to the file where the metric is recorded. Do not attach raw user
data, request IDs, prompts, emails, payment IDs, or exception messages to
labels.

### 7.1 Tarot Reading Metrics

File: `backend/routers/tarot.py`

Metrics covered:

- `arcana_tarot_readings_total`
- `arcana_tarot_reading_duration_seconds`

At the top of the file, add `settings` and `record_tarot_reading` beside the
existing imports:

```python
from config import settings
from utils.metrics import record_tarot_reading
```

In `get_reading`, after the existing `start_time = ...` line, add:

```python
reading_type = f"{request_data.num_cards}_card"
reading_status = "error"
```

In `get_reading`, before the `raise HTTPException(...)` for no turns, add:

```python
reading_status = "insufficient_turns"
```

In `get_reading`, before the `raise ValidationError(...)` for a missing spread
or invalid card count, add:

```python
reading_status = "validation_error"
```

In `get_reading`, immediately after `request_data.num_cards = spread.num_cards`,
add:

```python
reading_type = f"{request_data.num_cards}_card"
```

In `get_reading`, immediately before `return response_cards`, add:

```python
reading_status = "success"
```

In `get_reading`, add a `finally` block after the existing `except` blocks:

```python
finally:
    record_tarot_reading(
        env=settings.FASTAPI_ENV,
        reading_type=reading_type,
        status=reading_status,
        duration=time.time() - start_time,
    )
```

In `get_compatibility_reading`, after the existing `start_time = ...` line, add:

```python
reading_type = "compatibility"
reading_status = "error"
```

In `get_compatibility_reading`, move the configured spread lookup inside the
existing `try` block if it is currently above it. Before the
`TarotAPIException` raised for a missing compatibility spread, add:

```python
reading_status = "not_found"
```

In `get_compatibility_reading`, before the `raise HTTPException(...)` for no
turns, add:

```python
reading_status = "insufficient_turns"
```

In `get_compatibility_reading`, immediately before returning
`CompatibilityReadingResponse(...)`, add:

```python
reading_status = "success"
```

In `get_compatibility_reading`, add a `finally` block after the existing
`except` blocks:

```python
finally:
    record_tarot_reading(
        env=settings.FASTAPI_ENV,
        reading_type=reading_type,
        status=reading_status,
        duration=time.time() - start_time,
    )
```

Use these status labels:

- `success`: cards were drawn and returned.
- `insufficient_turns`: the user had no available turn.
- `validation_error`: bad card count, missing spread, or invalid request data.
- `not_found`: required configured spread is missing.
- `error`: unexpected failure.

### 7.2 Auth Metrics

File: `backend/routers/auth.py`

Metric covered:

- `arcana_auth_attempts_total`

At the top of the file, add the helper import beside the existing imports:

```python
from config import settings
from utils.metrics import record_auth_attempt
```

In `register`, after the user is created and before the success `return`, add:

```python
record_auth_attempt(settings.FASTAPI_ENV, action="register", status="success")
```

In `register`, before raising validation errors such as duplicate username or
email, add:

```python
record_auth_attempt(settings.FASTAPI_ENV, action="register", status="validation_error")
```

In `register`, inside the generic exception path and before re-raising, add:

```python
record_auth_attempt(settings.FASTAPI_ENV, action="register", status="error")
```

In `login`, before raising invalid-user or invalid-password errors, add:

```python
record_auth_attempt(settings.FASTAPI_ENV, action="login", status="rejected")
```

In `login`, immediately before returning the token response, add:

```python
record_auth_attempt(settings.FASTAPI_ENV, action="login", status="success")
```

In `login`, inside the unexpected exception path and before re-raising, add:

```python
record_auth_attempt(settings.FASTAPI_ENV, action="login", status="error")
```

Use the same placement pattern for `refresh`, `forgot_password`, and
`reset_password`: record `success` before the success return, `rejected` for
bad credentials/tokens, `validation_error` for malformed input, and `error` for
unexpected exceptions.

### 7.3 OpenAI Metrics

Files: `backend/tarot_reader.py`, `backend/routers/chat.py`

Metrics covered:

- `arcana_openai_requests_total`
- `arcana_openai_request_duration_seconds`
- `arcana_openai_tokens_total`
- `arcana_openai_cost_usd_total`
- `arcana_openai_errors_total`

At the top of the file that makes the OpenAI/LangChain call, add any missing
imports:

```python
import time

from config import settings
from utils.metrics import record_openai_request
```

This repo has two OpenAI call shapes:

- `backend/tarot_reader.py` builds a LangChain `chain`, then calls
  `chain.astream(...)` or `chain.ainvoke(...)`.
- `backend/routers/chat.py` calls `llm.bind_tools(...).invoke(...)` and
  `llm.astream(...)` directly.

Use `settings.OPENAI_MODEL` for the model label. The older
`settings.OPENAI_MODEL_NAME` name is not used in this repo.
Cost metrics are only recorded when token usage is available and the optional
`OPENAI_INPUT_COST_USD_PER_1M_TOKENS` and
`OPENAI_OUTPUT_COST_USD_PER_1M_TOKENS` settings are configured.

In `backend/tarot_reader.py`, in `create_reading`, immediately after:

```python
chain = prompt | self.llm | self.output_parser
```

add:

```python
start_time = time.perf_counter()
model = settings.OPENAI_MODEL
operation = "tarot_interpretation"
```

Replace only the existing streaming loop shown below with a `try` / `except` /
`else` wrapper. Keep the existing payload exactly as it is:

```python
try:
    async for chunk in chain.astream({"concern": concern, "cards": cards_text}):
        yield chunk
        await asyncio.sleep(0)
except Exception as exc:
    record_openai_request(
        env=settings.FASTAPI_ENV,
        model=model,
        operation=operation,
        status="error",
        duration=time.perf_counter() - start_time,
        error_type=type(exc).__name__,
    )
    raise
else:
    record_openai_request(
        env=settings.FASTAPI_ENV,
        model=model,
        operation=operation,
        status="success",
        duration=time.perf_counter() - start_time,
    )
```

In `backend/tarot_reader.py`, in `stream_compatibility_reading`, immediately
after:

```python
chain = prompt | self.llm | self.output_parser
```

add:

```python
start_time = time.perf_counter()
model = settings.OPENAI_MODEL
operation = "compatibility_interpretation"
```

Then replace only the existing streaming loop shown below with a `try` /
`except` / `else` wrapper. Keep this existing payload exactly:

```python
try:
    async for chunk in chain.astream(
        {
            "person_a": person_a,
            "person_b": person_b,
            "focus_line": focus_line,
            "cards": cards_text,
        }
    ):
        yield chunk
        await asyncio.sleep(0)
except Exception as exc:
    record_openai_request(
        env=settings.FASTAPI_ENV,
        model=model,
        operation=operation,
        status="error",
        duration=time.perf_counter() - start_time,
        error_type=type(exc).__name__,
    )
    raise
else:
    record_openai_request(
        env=settings.FASTAPI_ENV,
        model=model,
        operation=operation,
        status="success",
        duration=time.perf_counter() - start_time,
    )
```

In `backend/tarot_reader.py`, in `create_compatibility_reading`, immediately
before:

```python
result = await chain.ainvoke(
    {
        "person_a": person_a,
        "person_b": person_b,
        "focus_line": focus_line,
        "cards": cards_text,
    }
)
```

add:

```python
start_time = time.perf_counter()
model = settings.OPENAI_MODEL
operation = "compatibility_interpretation"
```

Then wrap that single assignment in `try` / `except` / `else`. Keep the
existing payload exactly:

```python
try:
    result = await chain.ainvoke(
        {
            "person_a": person_a,
            "person_b": person_b,
            "focus_line": focus_line,
            "cards": cards_text,
        }
    )
except Exception as exc:
    record_openai_request(
        env=settings.FASTAPI_ENV,
        model=model,
        operation=operation,
        status="error",
        duration=time.perf_counter() - start_time,
        error_type=type(exc).__name__,
    )
    raise
else:
    record_openai_request(
        env=settings.FASTAPI_ENV,
        model=model,
        operation=operation,
        status="success",
        duration=time.perf_counter() - start_time,
    )
```

Keep the existing `logger.info("Compatibility reading generation completed")`
and `return result` after this wrapper.

In `backend/routers/chat.py`, immediately before each direct model call, add
the same timer and label setup:

```python
start_time = time.perf_counter()
model = settings.OPENAI_MODEL
operation = "chat_message"
```

Direct model-call anchors in `backend/routers/chat.py` are:

- `llm_response = llm.bind_tools(available_tools).invoke(messages_for_llm)`
- `llm_response = llm.bind_tools([DRAW_CARDS_TOOL]).invoke(messages_for_llm)`
- `async for chunk in llm.astream(messages_for_llm):`

Immediately after each successful `.invoke(...)` call returns, add:

```python
usage = getattr(llm_response, "usage_metadata", {}) or {}
prompt_tokens = int(usage.get("input_tokens", 0))
completion_tokens = int(usage.get("output_tokens", 0))
record_openai_request(
    env=settings.FASTAPI_ENV,
    model=model,
    operation=operation,
    status="success",
    duration=time.perf_counter() - start_time,
    prompt_tokens=prompt_tokens,
    completion_tokens=completion_tokens,
)
```

Wrap each `.invoke(...)` call in `try` / `except`, and inside `except Exception
as exc:` add this before re-raising:

```python
record_openai_request(
    env=settings.FASTAPI_ENV,
    model=model,
    operation=operation,
    status="error",
    duration=time.perf_counter() - start_time,
    error_type=type(exc).__name__,
)
```

For the `llm.astream(messages_for_llm)` streaming block, use the same
`try` / `except` / `else` wrapper shown for `chain.astream(...)`. Streaming
chunks usually do not expose token usage, so record latency and request status
there, and leave token/cost fields at their default values unless you later
instrument a lower-level response that exposes usage metadata.

Recommended `operation` values:

- `chat_message` for normal chat replies.
- `tarot_interpretation` for reading interpretation generation.
- `compatibility_interpretation` for relationship reading interpretation.
- `title_generation` for chat rename/title tool flows.

### 7.4 Chat Metrics

File: `backend/routers/chat.py`

Metrics covered:

- `arcana_chat_messages_total`
- `arcana_chat_conversations_total`
- `arcana_chat_conversations_active`

At the top of the file, add the helpers beside the existing imports:

```python
from config import settings
from utils.metrics import (
    decrement_active_chat_conversations,
    increment_active_chat_conversations,
    record_chat_conversation,
    record_chat_message,
    set_active_chat_conversations,
)
```

In the session creation endpoint, immediately after the `db.commit()` that
persists the new session, add:

```python
record_chat_conversation(settings.FASTAPI_ENV, source="api", status="created")
increment_active_chat_conversations(settings.FASTAPI_ENV)
```

In the same endpoint, inside its exception path and before re-raising, add:

```python
record_chat_conversation(settings.FASTAPI_ENV, source="api", status="error")
```

In the message endpoint, after the user's message is persisted successfully,
add:

```python
record_chat_message(settings.FASTAPI_ENV, role="user", status="success")
```

In the message endpoint, after the assistant response is persisted successfully,
add:

```python
record_chat_message(settings.FASTAPI_ENV, role="assistant", status="success")
```

In the message endpoint, inside the exception path before re-raising, add:

```python
record_chat_message(settings.FASTAPI_ENV, role="assistant", status="error")
```

In the delete-session endpoint, after the delete/soft-delete commit succeeds,
add:

```python
record_chat_conversation(settings.FASTAPI_ENV, source="api", status="deleted")
decrement_active_chat_conversations(settings.FASTAPI_ENV)
```

If you compute active conversation count directly, add this immediately after
that query:

```python
set_active_chat_conversations(settings.FASTAPI_ENV, active_count)
```

### 7.5 Database Metrics

File: `backend/database.py`

Metrics covered:

- `arcana_db_queries_total`
- `arcana_db_query_duration_seconds`

At the top of the file, add any missing imports beside the existing SQLAlchemy
and settings imports:

```python
import time

from sqlalchemy import event

from config import settings
from utils.metrics import record_db_query
```

Immediately after the existing `engine = create_engine(...)` statement, add a
listener that stores the query start time:

```python
@event.listens_for(engine, "before_cursor_execute")
def track_db_query_start(conn, cursor, statement, parameters, context, executemany):
    context._arcana_query_start_time = time.perf_counter()
```

Immediately after `track_db_query_start`, add the success recorder:

```python
@event.listens_for(engine, "after_cursor_execute")
def track_db_query_success(conn, cursor, statement, parameters, context, executemany):
    started = getattr(context, "_arcana_query_start_time", None)
    duration = time.perf_counter() - started if started else 0.0
    statement_text = (statement or "").strip()
    operation = statement_text.split(maxsplit=1)[0].lower() if statement_text else "unknown"

    record_db_query(
        env=settings.FASTAPI_ENV,
        operation=operation,
        table="unknown",
        status="success",
        duration=duration,
    )
```

Immediately after `track_db_query_success`, add the failure recorder:

```python
@event.listens_for(engine, "handle_error")
def track_db_query_error(exception_context):
    statement_text = (getattr(exception_context, "statement", None) or "").strip()
    operation = statement_text.split(maxsplit=1)[0].lower() if statement_text else "unknown"

    record_db_query(
        env=settings.FASTAPI_ENV,
        operation=operation,
        table="unknown",
        status="error",
        duration=0.0,
    )
```

If you prefer service-level DB metrics instead of SQLAlchemy engine events, add
`record_db_query(...)` immediately after the specific query succeeds and inside
the same block's exception path before re-raising.

Use `table="unknown"` unless you can safely derive a bounded table name. Do not
parse arbitrary SQL into labels if it can create high-cardinality values.

### 7.6 Application Error Metrics

File: `backend/utils/error_handlers.py`

Metric covered:

- `arcana_application_errors_total`

At the top of the file, add the helper import beside the existing settings
import:

```python
from utils.metrics import record_application_error
```

In `general_exception_handler`, immediately before the existing
`return JSONResponse(...)`, add:

```python
route = request.scope.get("route")
handler = getattr(route, "path", request.url.path)
record_application_error(
    env=settings.FASTAPI_ENV,
    error_type=type(exc).__name__,
    handler=handler,
)
```

In custom handlers such as validation, authentication, or database exception
handlers, use the same placement: add `record_application_error(...)`
immediately before the handler returns its `JSONResponse`.

Use normalized `error_type` values such as `ValidationError`,
`AuthenticationError`, `OperationalError`, or `SQLAlchemyError`. Do not use raw
exception messages as labels.

### 7.7 Celery Metrics

File: `backend/celery_app.py`

Metrics covered:

- `arcana_celery_tasks_total`
- `arcana_celery_task_duration_seconds`
- `arcana_celery_task_failures_total`

At the top of the file, add these imports beside the existing Celery imports:

```python
import time

from celery.signals import task_failure, task_postrun, task_prerun, task_retry

from config import settings
from utils.metrics import record_celery_failure, record_celery_task
```

Immediately after the existing `celery_app.conf.update(...)` block, add this
queue-label helper:

```python
def _queue_name(task) -> str:
    delivery_info = getattr(getattr(task, "request", None), "delivery_info", {}) or {}
    return delivery_info.get("routing_key") or delivery_info.get("exchange") or "unknown"
```

Immediately after `_queue_name`, add the task-start signal:

```python
@task_prerun.connect
def track_task_start(sender=None, task_id=None, task=None, **kwargs):
    task.request._arcana_task_start_time = time.perf_counter()
    record_celery_task(
        env=settings.FASTAPI_ENV,
        queue=_queue_name(task),
        task_name=sender.name,
        status="started",
    )
```

Immediately after `track_task_start`, add the task-completion signal:

```python
@task_postrun.connect
def track_task_done(sender=None, task_id=None, task=None, state=None, **kwargs):
    started = getattr(task.request, "_arcana_task_start_time", None)
    duration = time.perf_counter() - started if started else None
    status = "success" if state == "SUCCESS" else str(state or "unknown").lower()

    record_celery_task(
        env=settings.FASTAPI_ENV,
        queue=_queue_name(task),
        task_name=sender.name,
        status=status,
        duration=duration,
    )
```

Immediately after `track_task_done`, add the task-failure signal:

```python
@task_failure.connect
def track_task_failure(sender=None, task_id=None, exception=None, task=None, **kwargs):
    record_celery_failure(
        env=settings.FASTAPI_ENV,
        queue=_queue_name(task),
        task_name=sender.name,
        error_type=type(exception).__name__ if exception else "unknown",
    )
```

Immediately after `track_task_failure`, add the retry signal:

```python
@task_retry.connect
def track_task_retry(sender=None, request=None, reason=None, **kwargs):
    delivery_info = getattr(request, "delivery_info", {}) or {}
    queue = delivery_info.get("routing_key") or delivery_info.get("exchange") or "unknown"

    record_celery_task(
        env=settings.FASTAPI_ENV,
        queue=queue,
        task_name=sender.name,
        status="retry",
    )
```

Keep `queue` and `task_name` bounded. Use the Celery queue name and task name,
not task IDs or argument values.

### 7.8 Payment Metrics

Files: `backend/routers/subscription.py`,
`backend/services/subscription_service.py`

Metrics covered:

- `arcana_payments_total`
- `arcana_payment_amount_usd_total`

At the top of `backend/routers/subscription.py`, add the helper import beside
the existing settings/service imports:

```python
from config import settings
from utils.metrics import record_payment_event
```

In `create_checkout_session`, immediately after this statement succeeds:

```python
checkout_url = await subscription_service.create_checkout_url(current_user, request.product_variant, db)
```

add:

```python
record_payment_event(
    settings.FASTAPI_ENV,
    provider="lemon_squeezy",
    event_type="checkout_created",
    status="created",
)
```

In `create_checkout_session`, inside `except ValueError as e:` and before
`raise HTTPException(...)`, add:

```python
record_payment_event(
    settings.FASTAPI_ENV,
    provider="lemon_squeezy",
    event_type="checkout_created",
    status="validation_error",
)
```

In `create_checkout_session`, inside `except Exception as e:` and before
`raise HTTPException(...)`, add:

```python
record_payment_event(
    settings.FASTAPI_ENV,
    provider="lemon_squeezy",
    event_type="checkout_created",
    status="error",
)
```

In `handle_lemon_squeezy_webhook`, immediately after `event_data = json.loads(payload)`,
add:

```python
event_name = event_data.get("meta", {}).get("event_name", "unknown")
record_payment_event(
    settings.FASTAPI_ENV,
    provider="lemon_squeezy",
    event_type=event_name,
    status="received",
)
```

In `handle_lemon_squeezy_webhook`, before the invalid-signature
`raise HTTPException(...)`, add:

```python
record_payment_event(
    settings.FASTAPI_ENV,
    provider="lemon_squeezy",
    event_type="webhook_received",
    status="signature_error",
)
```

In `handle_lemon_squeezy_webhook`, immediately after
`subscription_service.process_webhook_event(db, event_data)` succeeds, add:

```python
amount_usd = extract_amount_usd(event_data)
record_payment_event(
    settings.FASTAPI_ENV,
    provider="lemon_squeezy",
    event_type=event_name,
    status="paid" if event_name == "order_created" else "success",
    amount_usd=amount_usd,
)
```

Add `extract_amount_usd(event_data)` as a small local helper only if the service
does not already expose a normalized amount. It should return `None` when the
webhook does not include a purchase amount.

In `handle_lemon_squeezy_webhook`, inside `except json.JSONDecodeError:` and
before `raise HTTPException(...)`, add:

```python
record_payment_event(
    settings.FASTAPI_ENV,
    provider="lemon_squeezy",
    event_type="webhook_received",
    status="invalid_json",
)
```

In `handle_lemon_squeezy_webhook`, inside the generic `except Exception:` and
before `raise HTTPException(...)`, add:

```python
record_payment_event(
    settings.FASTAPI_ENV,
    provider="lemon_squeezy",
    event_type=locals().get("event_name", "webhook_received"),
    status="error",
)
```

In `process_ethereum_payment`, immediately after the `if not result["success"]:`
block and before `return EthereumPaymentResponse(...)`, add:

```python
record_payment_event(
    settings.FASTAPI_ENV,
    provider="ethereum",
    event_type="ethereum_payment",
    status="paid",
    amount_usd=amount_usd,
)
```

In `process_ethereum_payment`, before the `raise HTTPException(...)` for failed
verification, add the same metric with `status="verification_failed"` and no
`amount_usd`.

In `process_ethereum_payment`, inside the generic `except Exception as e:` and
before `raise HTTPException(...)`, add the same metric with `status="error"`
and no `amount_usd`.

### 7.9 Email Metrics

File: `backend/tasks/email_tasks.py`

Metrics covered:

- `arcana_email_send_total`
- `arcana_email_send_duration_seconds`

At the top of the file, add any missing imports beside the existing task
imports:

```python
import time

from utils.metrics import record_email_send
```

For each task function, set a bounded `email_type` near the start of the
function body:

```python
email_type = "password_reset"
```

Use one of these values:

- `password_reset` in `send_password_reset_email_task`.
- `welcome` in `send_welcome_email_task`.
- `reading_reminder` in `send_reminder_email_task`.
- `system_notification` in `send_system_notification_email_task`.
- `bulk_notification` in `send_bulk_notification_email_task`.

Immediately before each `_send_email_sync(message)` call, add:

```python
start_time = time.perf_counter()
```

Immediately after each `_send_email_sync(message)` call succeeds, add:

```python
record_email_send(
    env=settings.FASTAPI_ENV,
    email_type=email_type,
    status="success",
    duration=time.perf_counter() - start_time,
)
```

Inside each task's `except Exception as e:` block, before `raise self.retry(...)`,
add:

```python
record_email_send(
    env=settings.FASTAPI_ENV,
    email_type=email_type,
    status="error",
    duration=time.perf_counter() - start_time,
)
```

For bulk email tasks that send inside a loop, put `start_time` immediately
before each per-recipient `_send_email_sync(message)` call so one slow recipient
does not distort every email duration.

## 8. Recommended Metric Names

Use the `arcana_` prefix for application metrics.

| Area | Metric | Type | Suggested labels |
|---|---|---|---|
| HTTP request count | `arcana_http_requests_total` | Counter | `project`, `component`, `env`, `method`, `handler`, `status` |
| HTTP latency | `arcana_http_request_duration_seconds` | Histogram | `project`, `component`, `env`, `method`, `handler` |
| Tarot readings count | `arcana_tarot_readings_total` | Counter | `project`, `component`, `env`, `reading_type`, `status` |
| Tarot readings latency | `arcana_tarot_reading_duration_seconds` | Histogram | `project`, `component`, `env`, `reading_type` |
| Auth success/failure | `arcana_auth_attempts_total` | Counter | `project`, `component`, `env`, `action`, `status` |
| DB query count | `arcana_db_queries_total` | Counter | `project`, `component`, `env`, `operation`, `table`, `status` |
| DB query latency | `arcana_db_query_duration_seconds` | Histogram | `project`, `component`, `env`, `operation`, `table` |
| OpenAI requests | `arcana_openai_requests_total` | Counter | `project`, `component`, `env`, `model`, `operation`, `status` |
| OpenAI latency | `arcana_openai_request_duration_seconds` | Histogram | `project`, `component`, `env`, `model`, `operation` |
| OpenAI tokens | `arcana_openai_tokens_total` | Counter | `project`, `component`, `env`, `model`, `token_type` |
| OpenAI cost | `arcana_openai_cost_usd_total` | Counter | `project`, `component`, `env`, `model` |
| OpenAI errors | `arcana_openai_errors_total` | Counter | `project`, `component`, `env`, `model`, `error_type` |
| Chat messages | `arcana_chat_messages_total` | Counter | `project`, `component`, `env`, `role`, `status` |
| Chat conversations | `arcana_chat_conversations_total` | Counter | `project`, `component`, `env`, `source`, `status` |
| Active chat conversations | `arcana_chat_conversations_active` | Gauge | `project`, `component`, `env` |
| Application errors | `arcana_application_errors_total` | Counter | `project`, `component`, `env`, `error_type`, `handler` |
| Celery task count | `arcana_celery_tasks_total` | Counter | `project`, `component`, `env`, `queue`, `task_name`, `status` |
| Celery task duration | `arcana_celery_task_duration_seconds` | Histogram | `project`, `component`, `env`, `queue`, `task_name` |
| Celery failures | `arcana_celery_task_failures_total` | Counter | `project`, `component`, `env`, `queue`, `task_name`, `error_type` |
| Payments | `arcana_payments_total` | Counter | `project`, `component`, `env`, `provider`, `event_type`, `status` |
| Payment amount | `arcana_payment_amount_usd_total` | Counter | `project`, `component`, `env`, `provider`, `status` |
| Email sending | `arcana_email_send_total` | Counter | `project`, `component`, `env`, `email_type`, `status` |
| Email latency | `arcana_email_send_duration_seconds` | Histogram | `project`, `component`, `env`, `email_type` |

## 9. Label Conventions

Use labels that have a small, bounded set of values:

- Good: `project`, `component`, `env`, `status`, `method`, `handler`, `reading_type`, `model`, `operation`, `provider`, `email_type`, `queue`, `task_name`.
- Bad: `user_id`, `email`, `request_id`, `session_id`, raw prompt text, raw question text, card names, payment IDs, exception messages, URLs with IDs.

Prefer normalized values:

- `handler="/tarot/reading"` instead of a full path with IDs.
- `status="success"` or `status="error"` for business events.
- `status="200"` for HTTP status codes.
- `reading_type="three_card"`, `reading_type="compatibility"`, or another fixed enum.
- `model="gpt-4.1-mini"` or another bounded model name.

## 10. Example PromQL

All examples use central labels:

```promql
project="arcana-ai", component="backend"
```

API request rate:

```promql
sum by (handler, method) (
  rate(arcana_http_requests_total{project="arcana-ai", component="backend"}[$__rate_interval])
)
```

API p95 latency:

```promql
histogram_quantile(
  0.95,
  sum by (le, handler) (
    rate(arcana_http_request_duration_seconds_bucket{project="arcana-ai", component="backend"}[$__rate_interval])
  )
)
```

HTTP error rate:

```promql
sum(rate(arcana_http_requests_total{project="arcana-ai", component="backend", status=~"5.."}[$__rate_interval]))
/
sum(rate(arcana_http_requests_total{project="arcana-ai", component="backend"}[$__rate_interval]))
```

Auth failures by action:

```promql
sum by (action) (
  rate(arcana_auth_attempts_total{project="arcana-ai", component="backend", status!="success"}[$__rate_interval])
)
```

Tarot readings per minute:

```promql
sum by (reading_type, status) (
  rate(arcana_tarot_readings_total{project="arcana-ai", component="backend"}[$__rate_interval])
) * 60
```

Tarot p95 latency:

```promql
histogram_quantile(
  0.95,
  sum by (le, reading_type) (
    rate(arcana_tarot_reading_duration_seconds_bucket{project="arcana-ai", component="backend"}[$__rate_interval])
  )
)
```

OpenAI token usage:

```promql
sum by (model, token_type) (
  increase(arcana_openai_tokens_total{project="arcana-ai", component="backend"}[24h])
)
```

OpenAI cost today:

```promql
sum(increase(arcana_openai_cost_usd_total{project="arcana-ai", component="backend"}[24h]))
```

OpenAI error rate:

```promql
sum by (model, error_type) (
  rate(arcana_openai_errors_total{project="arcana-ai", component="backend"}[$__rate_interval])
)
```

OpenAI p95 latency:

```promql
histogram_quantile(
  0.95,
  sum by (le, model, operation) (
    rate(arcana_openai_request_duration_seconds_bucket{project="arcana-ai", component="backend"}[$__rate_interval])
  )
)
```

Chat messages by role:

```promql
sum by (role, status) (
  rate(arcana_chat_messages_total{project="arcana-ai", component="backend"}[$__rate_interval])
)
```

Active chat conversations:

```promql
arcana_chat_conversations_active{project="arcana-ai", component="backend"}
```

Application errors by handler:

```promql
sum by (handler, error_type) (
  rate(arcana_application_errors_total{project="arcana-ai", component="backend"}[$__rate_interval])
)
```

Database query rate:

```promql
sum by (operation, table, status) (
  rate(arcana_db_queries_total{project="arcana-ai", component="backend"}[$__rate_interval])
)
```

Database p95 latency:

```promql
histogram_quantile(
  0.95,
  sum by (le, operation, table) (
    rate(arcana_db_query_duration_seconds_bucket{project="arcana-ai", component="backend"}[$__rate_interval])
  )
)
```

Celery task rate:

```promql
sum by (queue, task_name, status) (
  rate(arcana_celery_tasks_total{project="arcana-ai", component="celery"}[$__rate_interval])
)
```

Celery failures:

```promql
sum by (queue, task_name) (
  rate(arcana_celery_task_failures_total{project="arcana-ai", component="celery"}[$__rate_interval])
)
```

Celery p95 duration:

```promql
histogram_quantile(
  0.95,
  sum by (le, queue, task_name) (
    rate(arcana_celery_task_duration_seconds_bucket{project="arcana-ai", component="celery"}[$__rate_interval])
  )
)
```

Payments by provider:

```promql
sum by (provider, event_type, status) (
  increase(arcana_payments_total{project="arcana-ai", component="backend"}[24h])
)
```

Payment amount by provider:

```promql
sum by (provider, status) (
  increase(arcana_payment_amount_usd_total{project="arcana-ai", component="backend"}[24h])
)
```

Email failures:

```promql
sum by (email_type) (
  rate(arcana_email_send_total{project="arcana-ai", component="celery", status="error"}[$__rate_interval])
)
```

Email p95 latency:

```promql
histogram_quantile(
  0.95,
  sum by (le, email_type) (
    rate(arcana_email_send_duration_seconds_bucket{project="arcana-ai", component="celery"}[$__rate_interval])
  )
)
```

## 11. Suggested Grafana Dashboards

Create dashboards in Grafana, then export the finished JSON into `central-monitoring`.

| Dashboard | Panels |
|---|---|
| API golden signals | Request rate, error rate, p50/p95/p99 latency, in-flight requests if you add a gauge, top 5 slow handlers |
| Tarot product KPIs | Readings per minute/day, readings by type, reading success/error rate, reading latency, compatibility readings |
| OpenAI cost/reliability | Requests by model, token usage, cost per day, model error rate, OpenAI p95 latency |
| Database/cache | DB query rate, DB p95 latency, errors by table/operation, Redis availability and latency if instrumented/exported |
| Celery/background jobs | Task rate, queue/task failures, task duration, retries, reminder delivery results |
| Payments/email | Payment webhook events, successful payments, failed payments, email send rate, email failures, email latency |

Use dashboard variables:

- `$project`: query values from `label_values(up, project)` or a custom value containing `arcana-ai`.
- `$component`: query values from `label_values(up{project="$project"}, component)`.
- `$env`: custom values such as `production`, `staging`, `local`.

## 12. Export Dashboards to `central-monitoring`

After a dashboard works in Grafana:

1. Open the dashboard in Grafana.
2. Use Dashboard settings -> JSON model or Export.
3. Save the JSON in the `central-monitoring` repo, for example:

```text
central-monitoring/grafana/dashboards/arcana-ai/api-golden-signals.json
```

4. Commit that JSON in `central-monitoring`.
5. Let the central stack provision or import the dashboard from that repo's workflow.

Do not store exported dashboard JSON in this ArcanaAI repository unless it is only documentation or a temporary design note.

## 13. Verify in Grafana Explore

After `/metrics` exists and central Prometheus has a target:

1. In Grafana, open Explore.
2. Select the Prometheus data source.
3. Confirm the target is scraped:

```promql
up{project="arcana-ai", component="backend"}
up{project="arcana-ai", component="celery"}
```

Expected value is `1`.

4. Confirm at least one ArcanaAI metric exists:

```promql
{project="arcana-ai", component="backend", __name__=~"arcana_.*"}
{project="arcana-ai", component="celery", __name__=~"arcana_.*"}
```

5. Exercise the app, then query a rate:

```promql
sum(rate(arcana_http_requests_total{project="arcana-ai", component="backend"}[5m]))
```

If `up` is `0`, verify Docker networking and the target in `central-monitoring`. If `up` is `1` but no `arcana_` metrics appear, verify the backend actually registered the metrics module and that `/metrics` returns Prometheus text format.

## 14. Avoid Duplicate Metrics on the Same VPS

When ArcanaAI runs on the same VPS as `central-monitoring`, use one ingestion path only.

Recommended same-VPS setup:

- Central Prometheus pulls `tarot-backend:8000/metrics`, `tarot-celery-worker:8001/metrics`, and `tarot-celery-beat:8001/metrics` over Docker `localnet`.
- No local remote-write agent is running for ArcanaAI.
- No public `/metrics` endpoint is exposed through Traefik/Nginx.

Avoid this duplicate setup:

- Central Prometheus scrapes ArcanaAI directly, and
- An agent also scrapes ArcanaAI and remote-writes the same samples.

Duplicate ingestion creates double counts for counters such as `arcana_tarot_readings_total` and `arcana_openai_cost_usd_total`. If you must migrate from push to pull or pull to push, temporarily query by `instance` and `job` in Grafana Explore to confirm only one source remains before relying on dashboards.

## 15. Reimplementation Checklist

1. Keep `prometheus-client` in `backend/pyproject.toml`.
2. Keep backend metrics in `backend/utils/metrics.py` and register `setup_metrics(app, env=settings.FASTAPI_ENV)` in `backend/app.py`.
3. Keep Celery metrics server startup in `backend/celery_app.py`; Celery services must set `PROMETHEUS_MULTIPROC_DIR` and expose `CELERY_METRICS_PORT`.
4. Add domain metric calls using the snippets in Section 7.
5. Keep labels low-cardinality and privacy-safe.
6. Run backend tests and local smoke checks of backend and Celery `GET /metrics`.
7. Update `central-monitoring` scrape or agent config outside this repo for all ArcanaAI targets.
8. Verify in Grafana Explore using `project="arcana-ai"` and `component=~"backend|celery"`.
9. Build dashboards in Grafana.
10. Export finished dashboards as JSON into `central-monitoring`.
