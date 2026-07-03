import concurrent.futures
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from collections import Counter
from datetime import datetime, timezone


BASE_URL = os.environ.get("ARCANA_SYNTHETIC_BASE_URL", "http://tarot-backend:8000").rstrip("/")
USERNAME = os.environ.get("ARCANA_SYNTHETIC_USERNAME", "")
EMAIL = os.environ.get("ARCANA_SYNTHETIC_EMAIL", "")
LOGIN = os.environ.get("ARCANA_SYNTHETIC_LOGIN", EMAIL or USERNAME)
PASSWORD = os.environ.get("ARCANA_SYNTHETIC_PASSWORD", "")
FORGOT_PASSWORD_TARGET = os.environ.get("ARCANA_SYNTHETIC_FORGOT_PASSWORD_TARGET", EMAIL or LOGIN)

HEALTH_REQUESTS = int(os.environ.get("ARCANA_SYNTHETIC_HEALTH_REQUESTS", "1000"))
HEALTH_CONCURRENCY = int(os.environ.get("ARCANA_SYNTHETIC_HEALTH_CONCURRENCY", "50"))
MESSAGE_REQUESTS = int(os.environ.get("ARCANA_SYNTHETIC_MESSAGE_REQUESTS", "2"))
MESSAGE_DELAY_SECONDS = float(os.environ.get("ARCANA_SYNTHETIC_MESSAGE_DELAY_SECONDS", "5"))
REQUEST_TIMEOUT_SECONDS = float(os.environ.get("ARCANA_SYNTHETIC_REQUEST_TIMEOUT_SECONDS", "240"))


def log(message: str) -> None:
    now = datetime.now(timezone.utc).isoformat()
    print(f"{now} {message}", flush=True)


def request(method: str, path: str, *, data=None, headers=None, timeout=REQUEST_TIMEOUT_SECONDS):
    request_headers = {
        "User-Agent": "ArcanaAI-synthetic-traffic/1.0",
        **(headers or {}),
    }
    body = None
    if data is not None:
        if request_headers.get("Content-Type") == "application/json":
            body = json.dumps(data).encode("utf-8")
        else:
            body = urllib.parse.urlencode(data).encode("utf-8")
            request_headers.setdefault("Content-Type", "application/x-www-form-urlencoded")

    req = urllib.request.Request(
        BASE_URL + path,
        data=body,
        headers=request_headers,
        method=method,
    )
    started = time.perf_counter()
    try:
        with urllib.request.urlopen(req, timeout=timeout) as response:
            payload = response.read()
            return response.status, time.perf_counter() - started, payload
    except urllib.error.HTTPError as exc:
        return exc.code, time.perf_counter() - started, exc.read()
    except Exception as exc:  # noqa: BLE001
        return "EXC", time.perf_counter() - started, str(exc).encode("utf-8", "replace")


def json_headers(access_token: str | None = None) -> dict[str, str]:
    headers = {"Content-Type": "application/json"}
    if access_token:
        headers["Authorization"] = f"Bearer {access_token}"
    return headers


def decode_payload(payload: bytes, limit: int = 300) -> str:
    return payload[:limit].decode("utf-8", "replace")


def ensure_synthetic_user() -> None:
    if not EMAIL:
        return
    if not USERNAME or not PASSWORD:
        raise RuntimeError("ARCANA_SYNTHETIC_USERNAME and ARCANA_SYNTHETIC_PASSWORD must be set")

    status, elapsed, payload = request(
        "POST",
        "/auth/register",
        data={"username": USERNAME, "email": EMAIL, "password": PASSWORD},
        headers=json_headers(),
        timeout=30,
    )
    log(f"synthetic user ensure status={status} elapsed={elapsed:.2f}s")
    if status in {200, 201}:
        return

    detail = decode_payload(payload)
    if status == 422 and "already registered" in detail:
        return

    raise RuntimeError(f"synthetic user ensure failed with status={status}: {detail}")


def login() -> str:
    if not LOGIN or not PASSWORD:
        raise RuntimeError("ARCANA_SYNTHETIC_LOGIN/USERNAME and ARCANA_SYNTHETIC_PASSWORD must be set")

    status, elapsed, payload = request(
        "POST",
        "/auth/token",
        data={"username": LOGIN, "password": PASSWORD},
        timeout=30,
    )
    log(f"login status={status} elapsed={elapsed:.2f}s")
    if status != 200:
        detail = decode_payload(payload)
        raise RuntimeError(f"login failed with status={status}: {detail}")

    return json.loads(payload)["access_token"]


def auth_headers(access_token: str) -> dict[str, str]:
    return json_headers(access_token)


def run_health_request(_index: int):
    status, elapsed, _payload = request("GET", "/health/", timeout=30)
    return status, elapsed


def create_chat_session(access_token: str) -> int:
    title = f"Synthetic OpenAI metrics {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}"
    status, elapsed, payload = request(
        "POST",
        "/chat/sessions/",
        data={"title": title},
        headers=auth_headers(access_token),
        timeout=30,
    )
    log(f"chat session create status={status} elapsed={elapsed:.2f}s")
    if status != 200:
        detail = decode_payload(payload)
        raise RuntimeError(f"chat session create failed with status={status}: {detail}")

    return int(json.loads(payload)["id"])


def run_message_request(index: int, access_token: str, session_id: int):
    payload = {
        "content": (
            "Please give a concise three-card tarot reading for synthetic monitoring. "
            f"Request {index}. Focus on practical guidance for clarity and momentum."
        )
    }
    status, elapsed, body = request(
        "POST",
        f"/chat/sessions/{session_id}/messages/",
        data=payload,
        headers=auth_headers(access_token),
        timeout=REQUEST_TIMEOUT_SECONDS,
    )
    return status, elapsed, len(body), body[:300]


def run_health_batch() -> tuple[Counter, list[float]]:
    counts: Counter = Counter()
    latencies: list[float] = []
    if HEALTH_REQUESTS <= 0:
        return counts, latencies

    log(f"health batch starting count={HEALTH_REQUESTS} concurrency={HEALTH_CONCURRENCY}")
    with concurrent.futures.ThreadPoolExecutor(max_workers=max(1, HEALTH_CONCURRENCY)) as pool:
        futures = [pool.submit(run_health_request, index) for index in range(HEALTH_REQUESTS)]
        for completed, future in enumerate(concurrent.futures.as_completed(futures), 1):
            status, elapsed = future.result()
            counts[status] += 1
            latencies.append(elapsed)
            if completed % 100 == 0 or completed == HEALTH_REQUESTS:
                log(f"health progress {completed}/{HEALTH_REQUESTS} counts={dict(counts)}")

    return counts, latencies


def run_message_batch(access_token: str) -> tuple[Counter, list[float]]:
    counts: Counter = Counter()
    latencies: list[float] = []
    if MESSAGE_REQUESTS <= 0:
        return counts, latencies

    session_id = create_chat_session(access_token)
    log(f"message batch starting count={MESSAGE_REQUESTS} session_id={session_id}")
    for index in range(1, MESSAGE_REQUESTS + 1):
        status, elapsed, _size, sample = run_message_request(index, access_token, session_id)
        counts[status] += 1
        latencies.append(elapsed)
        if status != 200 or b'"type":"error"' in sample or b'"type": "error"' in sample:
            log(
                "message non_200_or_error "
                f"status={status} elapsed={elapsed:.2f}s "
                f"body={sample.decode('utf-8', 'replace')}"
            )
        log(f"message completed {index}/{MESSAGE_REQUESTS} counts={dict(counts)}")
        if index < MESSAGE_REQUESTS and MESSAGE_DELAY_SECONDS > 0:
            time.sleep(MESSAGE_DELAY_SECONDS)

    return counts, latencies


def run_forgot_password_request() -> tuple[int, float]:
    if not FORGOT_PASSWORD_TARGET:
        raise RuntimeError("ARCANA_SYNTHETIC_FORGOT_PASSWORD_TARGET, EMAIL, or LOGIN must be set")

    status, elapsed, payload = request(
        "POST",
        "/auth/forgot-password",
        data={"email_or_username": FORGOT_PASSWORD_TARGET},
        headers=json_headers(),
        timeout=30,
    )
    log(f"forgot password status={status} elapsed={elapsed:.2f}s")
    if status != 200:
        detail = decode_payload(payload)
        raise RuntimeError(f"forgot password failed with status={status}: {detail}")
    return status, elapsed


def average(values: list[float]) -> float | None:
    if not values:
        return None
    return round(sum(values) / len(values), 3)


def serialize_counts(counts: Counter) -> dict[str, int]:
    return {str(status): count for status, count in counts.items()}


def run_dashboard_job() -> int:
    started = time.perf_counter()
    log("synthetic dashboard run starting " f"base_url={BASE_URL} health={HEALTH_REQUESTS}")
    try:
        health_counts, health_latencies = run_health_batch()
    except Exception as exc:  # noqa: BLE001
        log(f"synthetic dashboard run failed error={exc}")
        return 1

    summary = {
        "elapsed_total_seconds": round(time.perf_counter() - started, 1),
        "health_counts": serialize_counts(health_counts),
        "health_avg_latency_seconds": average(health_latencies),
    }
    log("synthetic dashboard run complete " + json.dumps(summary, sort_keys=True))
    return 0


def run_message_job() -> int:
    started = time.perf_counter()
    log("synthetic message run starting " f"base_url={BASE_URL} messages={MESSAGE_REQUESTS}")
    try:
        ensure_synthetic_user()
        access_token = login()
        message_counts, message_latencies = run_message_batch(access_token)
    except Exception as exc:  # noqa: BLE001
        log(f"synthetic message run failed error={exc}")
        return 1

    summary = {
        "elapsed_total_seconds": round(time.perf_counter() - started, 1),
        "message_counts": serialize_counts(message_counts),
        "message_avg_latency_seconds": average(message_latencies),
    }
    log("synthetic message run complete " + json.dumps(summary, sort_keys=True))
    return 0


def run_forgot_password_job() -> int:
    started = time.perf_counter()
    log("synthetic forgot password run starting " f"base_url={BASE_URL}")
    try:
        ensure_synthetic_user()
        status, elapsed = run_forgot_password_request()
    except Exception as exc:  # noqa: BLE001
        log(f"synthetic forgot password run failed error={exc}")
        return 1

    summary = {
        "elapsed_total_seconds": round(time.perf_counter() - started, 1),
        "forgot_password_counts": {str(status): 1},
        "forgot_password_latency_seconds": round(elapsed, 3),
    }
    log("synthetic forgot password run complete " + json.dumps(summary, sort_keys=True))
    return 0


def main() -> int:
    mode = sys.argv[1] if len(sys.argv) > 1 else os.environ.get("ARCANA_SYNTHETIC_MODE", "dashboard")
    mode = mode.strip().lower()
    if mode in {"dashboard", "health", "full"}:
        return run_dashboard_job()
    if mode in {"message", "messages"}:
        return run_message_job()
    if mode in {"forgot-password", "forgot_password", "password-reset", "password_reset"}:
        return run_forgot_password_job()

    log(f"unknown synthetic traffic mode={mode}")
    return 2


if __name__ == "__main__":
    sys.exit(main())
