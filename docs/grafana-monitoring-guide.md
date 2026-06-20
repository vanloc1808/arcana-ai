# ArcanaAI Metrics Implementation Guide

ArcanaAI no longer owns or runs Prometheus, Grafana, alert rules, or dashboard provisioning from this repository. The central monitoring stack is deployed from the standalone `central-monitoring` repo.

This guide is for reimplementing ArcanaAI application metrics later and wiring them into that central stack. After the cleanup that introduced this guide, the backend does not expose `GET /metrics`.

## 1. Architecture

ArcanaAI is only a metrics producer. Prometheus and Grafana live elsewhere:

```text
ArcanaAI backend              central-monitoring repo
tarot-backend:8000     ->     Prometheus     ->     Grafana
GET /metrics                  scrape/push           dashboards
```

Current intended labels for ArcanaAI backend series:

```promql
project="arcana-ai"
component="backend"
env="production"
```

Do not add Prometheus, Grafana, node-exporter, cAdvisor, or dashboard provisioning back to this repo. Keep those in `central-monitoring`.

## 2. Pull Mode vs Push Mode

Use pull mode when ArcanaAI and `central-monitoring` run on the same VPS and share the Docker `localnet` network.

1. After metrics are reimplemented, ArcanaAI exposes an internal `GET /metrics` endpoint from `tarot-backend:8000`.
2. The central Prometheus scrape config, in `central-monitoring`, targets `tarot-backend:8000`.
3. The target config attaches labels such as `project="arcana-ai"` and `component="backend"`.
4. No public ArcanaAI metrics endpoint is required.

Use push mode only when ArcanaAI runs on a different host from central Prometheus.

1. A local agent from `central-monitoring` runs near ArcanaAI.
2. The agent scrapes ArcanaAI locally.
3. The agent remote-writes samples to central Prometheus using the central repo's authenticated ingest endpoint.

For the current same-VPS setup, prefer pull mode over push mode.

## 3. What `/metrics` Should Expose

When you reimplement metrics, expose only Prometheus text format at:

```http
GET /metrics
```

The endpoint should include:

- Process/runtime metrics from `prometheus_client`, if useful.
- HTTP request counters and latency histograms.
- Tarot reading counters and latency histograms.
- Auth success/failure counters.
- Database query counters and latency histograms.
- OpenAI request, token, cost, latency, and error counters.
- Chat message and conversation counters/gauges.
- Application error counters.
- Celery task counters and duration histograms.
- Payment and email counters.

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
from prometheus_client import CONTENT_TYPE_LATEST, Counter, Histogram, generate_latest
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

Add domain metrics where the domain work happens. Example:

```python
tarot_readings_total.labels(
    project="arcana-ai",
    component="backend",
    env=settings.FASTAPI_ENV,
    reading_type="three_card",
    status="success",
).inc()
```

## 5. Recommended Metric Names

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

## 6. Label Conventions

Use labels that have a small, bounded set of values:

- Good: `project`, `component`, `env`, `status`, `method`, `handler`, `reading_type`, `model`, `operation`, `provider`, `email_type`, `queue`, `task_name`.
- Bad: `user_id`, `email`, `request_id`, `session_id`, raw prompt text, raw question text, card names, payment IDs, exception messages, URLs with IDs.

Prefer normalized values:

- `handler="/tarot/reading"` instead of a full path with IDs.
- `status="success"` or `status="error"` for business events.
- `status="200"` for HTTP status codes.
- `reading_type="three_card"`, `reading_type="compatibility"`, or another fixed enum.
- `model="gpt-4.1-mini"` or another bounded model name.

## 7. Example PromQL

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

Tarot readings per minute:

```promql
sum by (reading_type, status) (
  rate(arcana_tarot_readings_total{project="arcana-ai", component="backend"}[$__rate_interval])
) * 60
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

Database p95 latency:

```promql
histogram_quantile(
  0.95,
  sum by (le, operation, table) (
    rate(arcana_db_query_duration_seconds_bucket{project="arcana-ai", component="backend"}[$__rate_interval])
  )
)
```

Celery failures:

```promql
sum by (queue, task_name) (
  rate(arcana_celery_task_failures_total{project="arcana-ai", component="backend"}[$__rate_interval])
)
```

Payments by provider:

```promql
sum by (provider, event_type, status) (
  increase(arcana_payments_total{project="arcana-ai", component="backend"}[24h])
)
```

Email failures:

```promql
sum by (email_type) (
  rate(arcana_email_send_total{project="arcana-ai", component="backend", status="error"}[$__rate_interval])
)
```

## 8. Suggested Grafana Dashboards

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

## 9. Export Dashboards to `central-monitoring`

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

## 10. Verify in Grafana Explore

After `/metrics` exists and central Prometheus has a target:

1. In Grafana, open Explore.
2. Select the Prometheus data source.
3. Confirm the target is scraped:

```promql
up{project="arcana-ai", component="backend"}
```

Expected value is `1`.

4. Confirm at least one ArcanaAI metric exists:

```promql
{project="arcana-ai", component="backend", __name__=~"arcana_.*"}
```

5. Exercise the app, then query a rate:

```promql
sum(rate(arcana_http_requests_total{project="arcana-ai", component="backend"}[5m]))
```

If `up` is `0`, verify Docker networking and the target in `central-monitoring`. If `up` is `1` but no `arcana_` metrics appear, verify the backend actually registered the metrics module and that `/metrics` returns Prometheus text format.

## 11. Avoid Duplicate Metrics on the Same VPS

When ArcanaAI runs on the same VPS as `central-monitoring`, use one ingestion path only.

Recommended same-VPS setup:

- After `/metrics` is reimplemented, central Prometheus pulls `tarot-backend:8000/metrics` over Docker `localnet`.
- No local remote-write agent is running for ArcanaAI.
- No public `/metrics` endpoint is exposed through Traefik/Nginx.

Avoid this duplicate setup:

- Central Prometheus scrapes ArcanaAI directly, and
- An agent also scrapes ArcanaAI and remote-writes the same samples.

Duplicate ingestion creates double counts for counters such as `arcana_tarot_readings_total` and `arcana_openai_cost_usd_total`. If you must migrate from push to pull or pull to push, temporarily query by `instance` and `job` in Grafana Explore to confirm only one source remains before relying on dashboards.

## 12. Reimplementation Checklist

1. Add `prometheus-client` to `backend/pyproject.toml` with `uv add prometheus-client`.
2. Create a small `backend/utils/metrics.py` module with counters, histograms, and `/metrics` exposure.
3. Register `setup_metrics(app, env=settings.FASTAPI_ENV)` in `backend/app.py`.
4. Add domain metrics in routers/services where the events happen.
5. Keep labels low-cardinality and privacy-safe.
6. Run backend tests and a local smoke check of `GET /metrics`.
7. Update `central-monitoring` scrape or agent config outside this repo.
8. Verify in Grafana Explore using `project="arcana-ai"` and `component="backend"`.
9. Build dashboards in Grafana.
10. Export finished dashboards as JSON into `central-monitoring`.
