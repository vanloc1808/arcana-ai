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
