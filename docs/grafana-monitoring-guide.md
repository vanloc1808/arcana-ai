# Personal Grafana Monitoring Guide for grafana.nguyenvanloc.com

A hands-on guide for building a **personal, central Grafana site** at
`grafana.nguyenvanloc.com` and using it to monitor multiple projects,
including ArcanaAI.

The intended end state is:

- One private Grafana UI at `https://grafana.nguyenvanloc.com`.
- One Prometheus instance that scrapes ArcanaAI now and can scrape more
  projects later.
- Project labels on every scrape target so dashboards can filter by
  `project="arcana-ai"`, `project="another-project"`, etc.
- Grafana and Prometheus data persisted on disk so a container restart
  does not wipe dashboards or metrics.

> Heads up: this repo already ships the **ArcanaAI monitoring config**
> (`monitoring-docker-compose.yaml` + `monitoring/`). This guide adapts
> that config into a personal monitoring stack instead of treating
> Grafana as a one-off local dashboard for only this repository.

---

## Table of contents

1. [What you're monitoring](#1-what-youre-monitoring)
2. [Personal monitoring architecture](#2-personal-monitoring-architecture)
3. [Grafana concepts in 5 minutes](#3-grafana-concepts-in-5-minutes)
4. [Setup Grafana from scratch for grafana.nguyenvanloc.com](#4-setup-grafana-from-scratch-for-grafananguyenvanloccom)
5. [PromQL primer with this project's metrics](#5-promql-primer-with-this-projects-metrics)
6. [Dashboards to build](#6-dashboards-to-build)
   - [6.1 Golden signals (API health)](#61-dashboard-1--golden-signals-api-health)
   - [6.2 Business KPIs (tarot product)](#62-dashboard-2--business-kpis-tarot-product)
   - [6.3 OpenAI cost & reliability](#63-dashboard-3--openai-cost--reliability)
   - [6.4 Database & cache](#64-dashboard-4--database--cache)
   - [6.5 Infrastructure (containers + host)](#65-dashboard-5--infrastructure-containers--host)
7. [Variables (template variables)](#7-variables-template-variables)
8. [Alerting](#8-alerting)
9. [Things to monitor that aren't instrumented yet](#9-things-to-monitor-that-arent-instrumented-yet)
10. [Tips and gotchas](#10-tips-and-gotchas)

---

## 1. What you're monitoring

This Grafana site is **not just for ArcanaAI**. Treat it as your personal
observability home:

| Scope | Examples | How it appears in Grafana |
|---|---|---|
| ArcanaAI app metrics | FastAPI requests, tarot readings, OpenAI tokens, DB query metrics | Prometheus metrics with `project="arcana-ai"` |
| ArcanaAI infrastructure | Docker container CPU/memory/network, host disk/load | cAdvisor + node-exporter, filtered to `tarot-*` containers |
| Future projects | Any other API, worker, frontend, bot, cron service, or VPS app | Add another Prometheus scrape job with a different `project` label |
| Shared host health | Disk, CPU, memory, network, Docker daemon symptoms | One host dashboard, optionally filtered by `host` |

ArcanaAI is a FastAPI + Next.js tarot reading service. The pieces worth
watching for this project are:

| Layer | Stack |
|---|---|
| Backend | FastAPI (Python 3.11), Uvicorn |
| AI | OpenAI via LangChain |
| DB | PostgreSQL in prod, SQLite in dev (SQLAlchemy 2) |
| Cache / broker | Redis 7 |
| Workers | Celery (queues: `email`, `notifications`, `celery`) + Celery Beat |
| Frontend | Next.js 15 |
| Payments | Lemon Squeezy + Ethereum/MetaMask |
| Storage | Cloudflare R2 |

The ArcanaAI backend already exposes Prometheus metrics at
`GET /metrics` (see `backend/utils/metrics.py` and `backend/app.py:79`).

---

## 2. Personal monitoring architecture

Use a central monitoring stack and add projects to it over time:

```text
Internet
  │
  │ https://grafana.nguyenvanloc.com
  ▼
Caddy / Nginx reverse proxy with TLS
  │
  ▼
Grafana container (private UI, port 3002 on localhost only)
  │
  ▼
Prometheus container (not public, port 9090 on localhost only)
  │
  ├── ArcanaAI backend: tarot-backend:8000/metrics
  ├── ArcanaAI frontend: tarot-frontend:3000/api/metrics (optional)
  ├── cAdvisor: container metrics
  ├── node-exporter: host metrics
  └── Future projects: add more scrape jobs
```

### What this repository already provides

Defined in `monitoring-docker-compose.yaml`:

| Service | Current container | Current port mapping | Purpose |
|---|---|---|---|
| Prometheus | `tarot-prometheus` | `9090:9090` | Scrapes metrics, stores 30d, evaluates alert rules |
| Grafana | `tarot-grafana` | `3002:3000` | Dashboards & alerts UI |
| cAdvisor | `tarot-cadvisor` | `8090:8080` | Per-container CPU/mem/net metrics |
| node-exporter | `tarot-node-exporter` | `9200:9100` | Host metrics (disk, load, network) |

Prometheus scrape targets (`monitoring/prometheus/prometheus.yml`):

- `tarot-backend:8000/metrics` (every 10s)
- `tarot-frontend:3000/api/metrics` (every 30s) — only if you add a
  metrics route in Next.js
- `tarot-node-exporter:9100`
- `tarot-cadvisor:8080`

Grafana is auto-provisioned via
`monitoring/grafana/provisioning/`:

- `datasources/datasources.yml` adds the Prometheus data source
  (UID `prometheus`) — **use this UID in every panel query**.
- `dashboards/dashboards.yml` loads any JSON dropped into
  `monitoring/grafana/dashboards/`.

There are 3 starter dashboard JSONs already, plus prebuilt alert rules
in `monitoring/prometheus/rules/tarot_alerts.yml`. Treat those as
ArcanaAI references, not as the entire personal Grafana site.

### Recommended conventions for multiple projects

Use these conventions from day one so adding projects later is easy:

| Convention | Recommendation |
|---|---|
| Prometheus job names | `<project>-<component>`, e.g. `arcana-ai-backend`, `blog-api`, `trading-bot-worker` |
| Static labels | Add `project`, `component`, and `env` labels to every scrape job |
| Grafana folders | One folder per project (`ArcanaAI`, `Personal Blog`, etc.) plus one `Shared Infrastructure` folder |
| Dashboard variables | Add a top-level `$project` variable to shared dashboards |
| Public exposure | Publish only Grafana through HTTPS; keep Prometheus, cAdvisor, and node-exporter private |
| Secrets | Keep admin passwords, SMTP credentials, OAuth secrets, and webhook URLs in `.env`, never in git |

For ArcanaAI, prefer this scrape naming when you are ready to update
`monitoring/prometheus/prometheus.yml`:

```yaml
- job_name: "arcana-ai-backend"
  static_configs:
    - targets: ["tarot-backend:8000"]
      labels:
        project: "arcana-ai"
        component: "backend"
        env: "production"
  metrics_path: "/metrics"
  scrape_interval: 10s
```

That single `project` label lets one Grafana dashboard switch between
projects later.

---

## 3. Grafana concepts in 5 minutes

| Concept | What it is |
|---|---|
| **Data source** | A backend Grafana queries (here: Prometheus). |
| **Dashboard** | A page of panels. |
| **Panel** | One visualization (time series, stat, table, heatmap…). |
| **Query** | A PromQL expression the panel runs. A panel can have several (A, B, C…). |
| **Variable** | A dropdown at the top of a dashboard that templatizes queries (e.g. `$project`, `$instance`). |
| **Transformation** | Post-query reshaping (rename, join, filter rows) before the panel renders. |
| **Annotation** | A marker on the time axis (deploys, incidents). |
| **Alert rule** | A query that fires when a condition holds for a duration. |
| **Contact point** | Where an alert is sent (Slack, email, webhook). |
| **Notification policy** | The routing tree from alert labels → contact points. |

Rule of thumb for panel choice:

- **Time series** — rates, latencies, gauges over time. Default.
- **Stat / Gauge** — single big number ("active users right now").
- **Bar gauge / Pie** — top-N comparisons ("readings by type today").
- **Table** — when you want labels visible (errors by endpoint).
- **Heatmap** — distribution of a histogram (latency buckets).
- **Logs** — only useful with Loki, not in scope of this stack yet.

---

## 4. Setup Grafana from scratch for grafana.nguyenvanloc.com

You're starting from zero. These steps assume a fresh VPS or server that
will host your personal monitoring stack and expose only Grafana at
`https://grafana.nguyenvanloc.com`.

> If you are only testing locally, replace `grafana.nguyenvanloc.com`
> with `localhost:3002` and skip the DNS / HTTPS reverse-proxy steps.

### 4.1 Prerequisites

- A server/VPS with Docker Engine ≥ 20.10 and Docker Compose v2
  (`docker compose ...`, not `docker-compose ...`).
- SSH access to the server.
- DNS access for `nguyenvanloc.com`.
- Ports `80` and `443` open to the internet for HTTPS.
- Monitoring ports kept private or firewall-restricted:
  - `3002` Grafana container port on the host.
  - `9090` Prometheus.
  - `8090` cAdvisor.
  - `9200` node-exporter.
- This repository checked out on the server.
- The ArcanaAI backend `.env` file at `backend/.env` exists and is
  populated if this same server is also running ArcanaAI.

Check listening ports before starting:

```bash
ss -tlnp | grep -E ':(80|443|3002|9090|8090|9200) '
```

### 4.2 Point DNS at the monitoring server

Create a DNS record:

| Type | Name | Value |
|---|---|---|
| `A` | `grafana` | Your server IPv4 address |
| `AAAA` | `grafana` | Your server IPv6 address, if you use IPv6 |

Verify DNS from your machine:

```bash
dig +short grafana.nguyenvanloc.com
```

Do not continue with HTTPS setup until this returns your server IP.

### 4.3 Create the shared Docker network

All compose files in this repo attach to an **external** network called
`localnet`. Prometheus uses container DNS over that network to reach
ArcanaAI (`tarot-backend:8000`), so create it before starting either the
app or monitoring stack:

```bash
docker network create localnet || true
```

Verify:

```bash
docker network ls | grep localnet
```

### 4.4 Start ArcanaAI if this server will monitor the local app

If ArcanaAI runs on the same Docker host as Prometheus, start it first:

```bash
# From the repo root
docker compose -f docker-compose.yaml up -d
```

Verify the backend exposes metrics:

```bash
docker exec tarot-backend curl -s http://localhost:8000/metrics | grep -E '^tarot_' | head
```

You should see lines like `tarot_active_users 0.0`. If you see nothing:

- `docker logs tarot-backend --tail 100` — look for import errors.
- Confirm `setup_metrics(app)` is called in the backend app startup.

If ArcanaAI runs on another host, skip this step and add a remote scrape
job in [4.8](#48-add-arcanaai-and-future-projects-as-prometheus-targets).

### 4.5 Create the monitoring environment file

Grafana refuses to start without `GRAFANA_ADMIN_PASSWORD`. Put secrets
in a local `.env` file and never commit it:

```bash
# Repo root
cat > .env <<'EOF'
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=replace-with-a-long-random-password
GRAFANA_DOMAIN=grafana.nguyenvanloc.com
GRAFANA_ROOT_URL=https://grafana.nguyenvanloc.com/
EOF
chmod 600 .env
```

Verify the file is ignored by git:

```bash
git check-ignore -v .env
```

If that command prints nothing, add `.env` to `.gitignore` before you
continue.

### 4.6 Add a production override for the personal domain

The checked-in compose file is local-friendly. For your personal site,
add a local override file that binds Grafana and Prometheus to localhost
only and tells Grafana its real public URL:

```bash
cat > monitoring-docker-compose.prod.override.yaml <<'EOF'
services:
  grafana:
    ports:
      - "127.0.0.1:3002:3000"
    environment:
      - GF_SERVER_DOMAIN=${GRAFANA_DOMAIN}
      - GF_SERVER_ROOT_URL=${GRAFANA_ROOT_URL}
      - GF_SERVER_SERVE_FROM_SUB_PATH=false
      - GF_SECURITY_COOKIE_SECURE=true
      - GF_SECURITY_COOKIE_SAMESITE=lax
  prometheus:
    ports:
      - "127.0.0.1:9090:9090"
  cadvisor:
    ports:
      - "127.0.0.1:8090:8080"
  node-exporter:
    ports:
      - "127.0.0.1:9200:9100"
EOF
```

This file can stay uncommitted if it is specific to your server. The key
security point is that **only the reverse proxy should be reachable from
the public internet**.

### 4.7 Label ArcanaAI targets for multi-project dashboards

Update `monitoring/prometheus/prometheus.yml` so ArcanaAI targets carry
stable labels. Example for the backend:

```yaml
  - job_name: "arcana-ai-backend"
    static_configs:
      - targets: ["tarot-backend:8000"]
        labels:
          project: "arcana-ai"
          component: "backend"
          env: "production"
    metrics_path: "/metrics"
    scrape_interval: 10s
```

You can do the same for the frontend, node-exporter, and cAdvisor jobs.
For cAdvisor, the `project` label means "this exporter belongs to the
host that runs ArcanaAI"; individual container names still come from the
`name` label in cAdvisor metrics.

After editing, validate the Prometheus config before restarting:

```bash
docker run --rm -v "$PWD/monitoring/prometheus:/etc/prometheus" prom/prometheus:latest promtool check config /etc/prometheus/prometheus.yml
```

### 4.8 Add ArcanaAI and future projects as Prometheus targets

For each new project, add another scrape job with a unique `project`
label. Examples:

```yaml
  - job_name: "personal-blog-api"
    static_configs:
      - targets: ["blog-api:8080"]
        labels:
          project: "personal-blog"
          component: "api"
          env: "production"
    metrics_path: "/metrics"

  - job_name: "remote-worker"
    static_configs:
      - targets: ["10.0.0.25:9105"]
        labels:
          project: "automation"
          component: "worker"
          env: "production"
```

For remote servers, prefer a private network such as WireGuard/Tailscale
between Prometheus and the target. Do **not** expose `/metrics` publicly
without authentication or network restrictions.

### 4.9 Start the monitoring stack

Start Grafana, Prometheus, cAdvisor, and node-exporter with your
production override:

```bash
docker compose \
  -f monitoring-docker-compose.yaml \
  -f monitoring-docker-compose.prod.override.yaml \
  --env-file .env \
  up -d
```

Confirm all four monitoring containers came up:

```bash
docker ps --filter 'name=tarot-' --format 'table {{.Names}}\t{{.Status}}'
```

Expect to see `tarot-prometheus`, `tarot-grafana`, `tarot-cadvisor`, and
`tarot-node-exporter` all `Up`.

If Grafana keeps restarting:

```bash
docker logs tarot-grafana --tail 50
```

The most common error is a missing `GRAFANA_ADMIN_PASSWORD`; re-check
[4.5](#45-create-the-monitoring-environment-file).

### 4.10 Put HTTPS in front of Grafana

Use a reverse proxy to terminate TLS and forward only Grafana traffic to
`127.0.0.1:3002`. Caddy is the simplest option because it manages
Let's Encrypt certificates automatically.

Install Caddy, then create `/etc/caddy/Caddyfile`:

```caddyfile
grafana.nguyenvanloc.com {
  reverse_proxy 127.0.0.1:3002
}
```

Reload Caddy:

```bash
sudo caddy fmt --overwrite /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

Verify from your laptop/browser:

```bash
curl -I https://grafana.nguyenvanloc.com/login
```

You should get an HTTP response from Grafana, not a connection timeout.

### 4.11 Verify Prometheus scraping

Open Prometheus through an SSH tunnel instead of exposing it publicly:

```bash
ssh -L 9090:127.0.0.1:9090 your-user@your-server
```

Then open <http://localhost:9090/targets>. You want every required job
`UP`:

| Job | Endpoint | Expected |
|---|---|---|
| `prometheus` | `localhost:9090/metrics` | UP |
| `arcana-ai-backend` or `tarot-backend` | `tarot-backend:8000/metrics` | UP |
| `arcana-ai-frontend` or `tarot-frontend` | `tarot-frontend:3000/api/metrics` | DOWN until you add a Next.js metrics route. OK to ignore for now. |
| `node-exporter` | `tarot-node-exporter:9100/metrics` | UP |
| `cadvisor` | `tarot-cadvisor:8080/metrics` | UP |

Troubleshooting a DOWN backend target:

1. *Connection refused* — backend container is not on `localnet`. Check
   with `docker inspect tarot-backend -f '{{json .NetworkSettings.Networks}}'`.
2. *No such host* — DNS lookup failed; Prometheus is on a different
   Docker network than the backend.
3. *Connection timeout* — backend is up but slow to respond. Curl from
   inside the Prometheus container:
   ```bash
   docker exec tarot-prometheus wget -qO- http://tarot-backend:8000/metrics | head
   ```

Run a smoke-test query in Prometheus: open <http://localhost:9090/graph>,
run `up`, and confirm you get one row per target.

### 4.12 First Grafana login

Open <https://grafana.nguyenvanloc.com>:

- User: `admin`
- Password: whatever you set in `.env`

Then:

1. **Change the admin password** at first prompt.
2. Go to `Connections → Data sources`. There should already be a
   Prometheus data source named "Prometheus" provisioned from
   `monitoring/grafana/provisioning/datasources/datasources.yml`.
   Click it, scroll to bottom, click **Save & test**. You want a green
   "Successfully queried the Prometheus API.".
3. Go to `Dashboards`. You'll see the provisioned ArcanaAI starter
   dashboards. Open `tarot-overview` — if panels render data, your
   pipeline works: ArcanaAI → Prometheus → Grafana → HTTPS domain.
4. Create folders:
   - `ArcanaAI`
   - `Shared Infrastructure`
   - One folder for each future project.

### 4.13 Generate traffic so dashboards have data

Brand-new Prometheus = empty time series database. Counters need a few
data points before `rate()` returns anything. Generate a little traffic:

```bash
for i in $(seq 1 200); do
  curl -s -o /dev/null http://localhost:8000/health
  curl -s -o /dev/null http://localhost:8000/docs
done
```

Wait ~30s, then refresh Grafana. Panels driven by
`rate(http_requests_total[...])` should now have data.

### 4.14 Stopping / cleaning up

```bash
# Stop monitoring only, keep data
docker compose \
  -f monitoring-docker-compose.yaml \
  -f monitoring-docker-compose.prod.override.yaml \
  down

# Stop AND wipe Prometheus + Grafana data (starting over)
docker compose \
  -f monitoring-docker-compose.yaml \
  -f monitoring-docker-compose.prod.override.yaml \
  down -v
```

The `-v` flag deletes the named volumes `prometheus-data` and
`grafana-data`. Do not run that in production unless you mean it.

### 4.15 Setup recap

You should now have:

- DNS for `grafana.nguyenvanloc.com` pointing at your monitoring server.
- HTTPS reverse proxy forwarding `grafana.nguyenvanloc.com` to Grafana.
- `localnet` Docker network created.
- Monitoring stack up: `tarot-prometheus`, `tarot-grafana`,
  `tarot-cadvisor`, `tarot-node-exporter`.
- ArcanaAI scraped by Prometheus with a `project="arcana-ai"` label.
- Prometheus, cAdvisor, and node-exporter reachable only locally or over
  SSH/private networking.
- Grafana reachable at <https://grafana.nguyenvanloc.com> with the
  Prometheus data source connected.
- A path for adding more projects: add a scrape job, add labels, build a
  folder/dashboard, then alert on it.

If all of that is true, you're ready for the rest of this guide.

---

## 5. PromQL primer with this project's metrics

Three function patterns cover ~90% of dashboards. The examples below keep the
current repo job name (`tarot-backend`) so they work with the checked-in config;
if you renamed the job to `arcana-ai-backend` in Section 4, replace the job
selector or filter by `project="arcana-ai"` instead.

```promql
# Per-second rate of a counter over the last 5 minutes
rate(tarot_requests_total[5m])

# Sum across all labels except one (here: status)
sum by (status) (rate(tarot_requests_total[5m]))

# 95th percentile latency from a histogram
histogram_quantile(0.95,
  sum by (le) (rate(http_request_duration_seconds_bucket{job="tarot-backend"}[5m]))
)
```

### Metrics this app exposes

Custom (from `backend/utils/metrics.py`):

| Metric | Type | Labels |
|---|---|---|
| `tarot_requests_total` | counter | `endpoint`, `method`, `status` |
| `tarot_readings_total` | counter | `reading_type`, `status` |
| `tarot_reading_duration_seconds` | histogram | `reading_type` |
| `tarot_cards_drawn_total` | counter | `card_name`, `position` |
| `tarot_auth_requests_total` | counter | `action`, `status` |
| `tarot_database_queries_total` | counter | `operation`, `table`, `status` |
| `tarot_database_query_duration_seconds` | histogram | `operation`, `table` |
| `tarot_openai_requests_total` | counter | `model`, `status` |
| `tarot_openai_tokens_used_total` | counter | `model`, `type` (prompt/completion) |
| `tarot_application_errors_total` | counter | `error_type`, `endpoint` |
| `tarot_chat_messages_total` | counter | `message_type`, `status` |
| `tarot_active_users` | gauge | — |
| `tarot_chat_conversations_active` | gauge | — |
| `tarot_app_info` | info | version/name/env |

From `prometheus-fastapi-instrumentator`:

- `http_requests_total{handler, method, status}`
- `http_request_duration_seconds_bucket{handler, method}` (histogram)
- `tarot_requests_inprogress{handler, method}` (gauge)

From `cAdvisor` (per container):

- `container_cpu_usage_seconds_total{name}`
- `container_memory_usage_bytes{name}`
- `container_spec_memory_limit_bytes{name}`
- `container_network_receive_bytes_total{name}` / `..._transmit_...`

From `node_exporter` (host):

- `node_load1`, `node_load5`, `node_load15`
- `node_filesystem_avail_bytes`, `node_filesystem_size_bytes`
- `node_memory_MemAvailable_bytes`, `node_memory_MemTotal_bytes`

### A few patterns you'll reuse a lot

```promql
# Request rate, sliced by status code class
sum by (status) (rate(tarot_requests_total[$__rate_interval]))

# Error ratio (5xx of total)
sum(rate(tarot_requests_total{status=~"5.."}[5m]))
  / sum(rate(tarot_requests_total[5m]))

# Top 5 slowest endpoints (p95)
topk(5,
  histogram_quantile(0.95,
    sum by (handler, le) (
      rate(http_request_duration_seconds_bucket{job="tarot-backend"}[5m])
    )
  )
)

# OpenAI spend proxy: tokens/second by model and type
sum by (model, type) (rate(tarot_openai_tokens_used_total[5m]))

# Container memory as % of limit
container_memory_usage_bytes{name=~"tarot-.*"}
  / container_spec_memory_limit_bytes{name=~"tarot-.*"}
```

`$__rate_interval` is a Grafana-injected interval that auto-scales to
the dashboard time range — prefer it over a hard-coded `[5m]` in panel
queries.

---

## 6. Dashboards to build

I'd build five dashboards rather than one mega-dashboard. Each has one
audience and one purpose. Build them in this order — easiest to
hardest.

For each dashboard, create it manually in Grafana
(`+ New → New dashboard`). Set a default time range of "Last 1 hour"
and refresh of "30s". Save into a folder called `ArcanaAI`.

---

### 6.1 Dashboard 1 — Golden signals (API health)

> The "is the site working right now?" dashboard. Open this first when
> something feels off. Based on the Google SRE four golden signals:
> **Latency, Traffic, Errors, Saturation**.

| # | Panel | Type | Query |
|---|---|---|---|
| 1 | Backend up? | Stat | `up{job="tarot-backend"}` (map `1`→OK green, `0`→DOWN red via Value mappings) |
| 2 | Requests / sec | Time series | `sum(rate(http_requests_total{job="tarot-backend"}[$__rate_interval]))` |
| 3 | Requests by status class | Time series, stacked | `sum by (status) (rate(http_requests_total{job="tarot-backend"}[$__rate_interval]))` — Legend: `{{status}}` |
| 4 | Error rate % | Stat (unit: percent 0–100) | `100 * sum(rate(http_requests_total{job="tarot-backend",status=~"5.."}[$__rate_interval])) / sum(rate(http_requests_total{job="tarot-backend"}[$__rate_interval]))` |
| 5 | Latency p50 / p95 / p99 | Time series (unit: seconds) | 3 queries: `histogram_quantile(0.50, sum by (le) (rate(http_request_duration_seconds_bucket{job="tarot-backend"}[$__rate_interval])))` and same for 0.95, 0.99. Legend: `p50`, `p95`, `p99` |
| 6 | Top 5 slowest endpoints (p95) | Bar gauge | `topk(5, histogram_quantile(0.95, sum by (handler, le) (rate(http_request_duration_seconds_bucket{job="tarot-backend"}[$__rate_interval]))))` — Legend: `{{handler}}` |
| 7 | In-flight requests | Time series | `sum by (handler) (tarot_requests_inprogress)` |
| 8 | Errors by type | Table | `sum by (error_type, endpoint) (increase(tarot_application_errors_total[$__range]))` — apply Transformation "Organize fields" |

**Learning notes for this dashboard:**

- Use `$__rate_interval` everywhere — counters need a window ≥ scrape
  interval to compute a rate; `$__rate_interval` picks one safely.
- `up` is the canonical health metric; `1` means Prometheus successfully
  scraped the target at the last interval.
- A histogram in Prometheus is just `*_bucket{le="…"}` series; always
  `sum by (le)` before `histogram_quantile` or you'll get nonsense.

---

### 6.2 Dashboard 2 — Business KPIs (tarot product)

> Product / growth lens. "Are people actually using the app?"

| # | Panel | Type | Query |
|---|---|---|---|
| 1 | Active users (now) | Stat | `tarot_active_users` |
| 2 | Active chat conversations | Stat | `tarot_chat_conversations_active` |
| 3 | Readings / minute | Time series | `60 * sum by (reading_type) (rate(tarot_readings_total{status="success"}[$__rate_interval]))` |
| 4 | Reading mix today | Pie chart | `sum by (reading_type) (increase(tarot_readings_total[$__range]))` |
| 5 | Reading latency p95 by type | Time series (unit: s) | `histogram_quantile(0.95, sum by (reading_type, le) (rate(tarot_reading_duration_seconds_bucket[$__rate_interval])))` — Legend: `{{reading_type}}` |
| 6 | Top 10 cards drawn (range) | Bar chart | `topk(10, sum by (card_name) (increase(tarot_cards_drawn_total[$__range])))` |
| 7 | Auth: login / register / failures | Time series | `sum by (action, status) (rate(tarot_auth_requests_total[$__rate_interval]))` — Legend: `{{action}} / {{status}}` |
| 8 | Login failure ratio | Stat (percent) | `sum(rate(tarot_auth_requests_total{action="login",status="failure"}[$__rate_interval])) / clamp_min(sum(rate(tarot_auth_requests_total{action="login"}[$__rate_interval])), 1e-9)` |
| 9 | Chat messages (user vs assistant) | Time series | `sum by (message_type) (rate(tarot_chat_messages_total{status="success"}[$__rate_interval]))` |

**Learning notes:**

- `increase(...[$__range])` over a counter gives "how many happened in
  the visible time window" — great for "today" totals if the time
  picker is set to today.
- A spike in `auth_requests{action="login",status="failure"}` from one
  IP is brute-force territory; add a per-IP label later if you want a
  real signal.

---

### 6.3 Dashboard 3 — OpenAI cost & reliability

> "Are we burning money or breaking?" This one becomes your favorite
> very quickly.

| # | Panel | Type | Query |
|---|---|---|---|
| 1 | OpenAI requests / min | Time series | `60 * sum by (model) (rate(tarot_openai_requests_total[$__rate_interval]))` |
| 2 | OpenAI error rate | Stat (percent) | `100 * sum(rate(tarot_openai_requests_total{status!="success"}[$__rate_interval])) / clamp_min(sum(rate(tarot_openai_requests_total[$__rate_interval])), 1e-9)` |
| 3 | Tokens / second by type | Time series, stacked | `sum by (type) (rate(tarot_openai_tokens_used_total[$__rate_interval]))` |
| 4 | Tokens by model (range) | Bar chart | `sum by (model) (increase(tarot_openai_tokens_used_total[$__range]))` |
| 5 | Estimated $ cost (range) | Stat | See note below |
| 6 | Tokens per reading | Time series | `sum(rate(tarot_openai_tokens_used_total[$__rate_interval])) / clamp_min(sum(rate(tarot_readings_total[$__rate_interval])), 1e-9)` |

**Cost panel:** Grafana doesn't know dollar prices. Two options:

1. Hard-code prices in the query as a Grafana **constant variable**
   (e.g. `gpt4o_in = 0.0000025`), then express cost as
   `sum(increase(tarot_openai_tokens_used_total{model="gpt-4o",type="prompt"}[$__range])) * ${gpt4o_in}`.
2. Better: emit a custom `tarot_openai_cost_usd_total` counter from
   the backend right where you call OpenAI, multiplying tokens by the
   current price. Then `sum(increase(tarot_openai_cost_usd_total[$__range]))`
   is the cost panel. Recommended — keeps the price table out of
   Grafana.

---

### 6.4 Dashboard 4 — Database & cache

| # | Panel | Type | Query |
|---|---|---|---|
| 1 | Query rate by op | Time series | `sum by (operation) (rate(tarot_database_queries_total[$__rate_interval]))` |
| 2 | Query error rate | Stat (percent) | `100 * sum(rate(tarot_database_queries_total{status="error"}[$__rate_interval])) / clamp_min(sum(rate(tarot_database_queries_total[$__rate_interval])), 1e-9)` |
| 3 | Query p95 by table | Time series (unit: s) | `histogram_quantile(0.95, sum by (table, le) (rate(tarot_database_query_duration_seconds_bucket[$__rate_interval])))` |
| 4 | Slow query heatmap | Heatmap | `sum by (le) (rate(tarot_database_query_duration_seconds_bucket[$__rate_interval]))` — Format: Heatmap, Y-axis: `le` |
| 5 | Top 10 hottest tables | Bar gauge | `topk(10, sum by (table) (rate(tarot_database_queries_total[$__rate_interval])))` |

**To monitor Postgres/Redis directly**, add exporters (not yet in
compose):

- `prometheus-community/postgres_exporter` → connection count, replication
  lag, dead tuples, cache hit ratio.
- `oliver006/redis_exporter` → memory used, connected clients, evictions,
  keyspace hit ratio, slowlog.

Then add scrape jobs to `monitoring/prometheus/prometheus.yml` and build
panels on top of the standard `pg_*` / `redis_*` metrics.

---

### 6.5 Dashboard 5 — Infrastructure (containers + host)

Use cAdvisor + node-exporter.

| # | Panel | Type | Query |
|---|---|---|---|
| 1 | CPU per container | Time series | `sum by (name) (rate(container_cpu_usage_seconds_total{name=~"tarot-.*"}[$__rate_interval]))` |
| 2 | Memory per container | Time series (unit: bytes) | `container_memory_usage_bytes{name=~"tarot-.*"}` |
| 3 | Memory headroom % | Bar gauge | `100 * (1 - container_memory_usage_bytes{name=~"tarot-.*"} / container_spec_memory_limit_bytes{name=~"tarot-.*"})` |
| 4 | Net in/out | Time series (unit: Bps) | `sum by (name) (rate(container_network_receive_bytes_total{name=~"tarot-.*"}[$__rate_interval]))` and `..._transmit_...` |
| 5 | Host load avg | Time series | `node_load1`, `node_load5`, `node_load15` |
| 6 | Root disk free % | Stat (percent) | `100 * node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"}` |
| 7 | Free memory % | Stat (percent) | `100 * node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes` |

---

## 7. Variables (template variables)

Variables are how dashboards stop being hard-coded. Add them via
`Dashboard settings → Variables → New variable`.

Four to add to most dashboards:

1. **`project`** — Type: *Query*, Datasource: Prometheus,
   Query: `label_values(up, project)`. Multi-value: ✓, Include "All": ✓.
   Use this on shared dashboards so one Grafana site can switch between
   ArcanaAI and future projects.

2. **`instance`** — Type: *Query*, Datasource: Prometheus,
   Query: `label_values(up{project=~"$project"}, instance)`.
   Used to filter when you scale to many backend pods or scrape multiple
   servers.

3. **`endpoint`** — Type: *Query*,
   Query: `label_values(tarot_requests_total{project=~"$project"}, endpoint)`.
   Multi-value: ✓, Include "All": ✓. Then use
   `tarot_requests_total{project=~"$project",endpoint=~"$endpoint"}` in
   queries.

4. **`reading_type`** — Type: *Query*,
   Query: `label_values(tarot_readings_total{project=~"$project"}, reading_type)`.

When using multi-value variables, always use `=~` (regex match) not `=`.

`$__interval`, `$__rate_interval`, `$__range`, `$__from`, `$__to` are
built-in — don't redefine them.

---

## 8. Alerting

There are two ways to do alerts and they coexist:

- **Prometheus alert rules** — defined as YAML in
  `monitoring/prometheus/rules/`. Already populated
  (`tarot_alerts.yml`). Use these for stable, codified production
  alerts.
- **Grafana-managed alerts** — defined in the Grafana UI under
  `Alerting → Alert rules`. Use these while learning and for alerts
  that depend on multiple data sources.

For learning, start in Grafana:

### Set up a contact point

`Alerting → Contact points → + Add contact point`.

- Pick `Webhook`, `Slack`, or `Email`. For dev: `Webhook` →
  <https://webhook.site> gives you a free test URL.
- Save, then `Test` to confirm a request hits the webhook.

### Set up a notification policy

`Alerting → Notification policies`. The default policy routes
everything to the default contact point — that's fine to start. Later
you'll add nested policies that route on labels like
`severity="critical"`.

### Build your first alert: high backend error rate

`Alerting → Alert rules → + New alert rule`:

1. **Query A** (Prometheus):
   `sum(rate(http_requests_total{job="tarot-backend",status=~"5.."}[5m])) / sum(rate(http_requests_total{job="tarot-backend"}[5m]))`
2. **Expression B** — `Reduce`: input `A`, function `Last`.
3. **Expression C** — `Threshold`: `IS ABOVE 0.05` (5% errors). Mark
   this as the alert condition.
4. **Evaluation**: Folder `ArcanaAI`, evaluation group every `1m`,
   `for: 5m`.
5. **Labels**: `severity=warning`, `service=tarot-api`.
6. **Annotations**: summary + a runbook link if you have one.

### Other alerts worth adding

| Alert | Query | For | Severity |
|---|---|---|---|
| Backend down | `up{job="tarot-backend"} == 0` | 1m | critical |
| API latency p95 high | `histogram_quantile(0.95, sum by (le) (rate(http_request_duration_seconds_bucket{job="tarot-backend"}[5m]))) > 2` | 5m | warning |
| OpenAI failures | `sum(rate(tarot_openai_requests_total{status!="success"}[5m])) > 0.1` | 3m | warning |
| DB error rate | `sum(rate(tarot_database_queries_total{status="error"}[5m])) > 0.05` | 2m | warning |
| Memory pressure | `container_memory_usage_bytes{name="tarot-backend"} / container_spec_memory_limit_bytes{name="tarot-backend"} > 0.85` | 5m | warning |
| Low disk | `node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"} < 0.1` | 5m | critical |

These mirror `monitoring/prometheus/rules/tarot_alerts.yml` — compare
your rules to that YAML once you're done to see how they translate.

---

## 9. Things to monitor that aren't instrumented yet

These need a few lines of backend code first. Listed in order of value.

1. **Celery workers**
   Add `celery-prometheus-exporter` (or the built-in
   `celery -A app events --camera`) as a service in the monitoring
   compose. You'll get:
   - `celery_workers` (count) — alert if a queue has 0 workers.
   - `celery_tasks_total{state}` — failures, retries.
   - Queue depth — alert if it grows monotonically (workers can't keep up).

2. **Payments**
   Emit a `tarot_payments_total{provider, status}` counter in
   `routers/subscription.py` around the Lemon Squeezy webhook handler
   and the Ethereum on-chain confirmation path. Track
   `tarot_payment_amount_usd_total` too. Alert on
   `rate(tarot_payments_total{status="failed"}[15m]) > 0`.

3. **Frontend RUM**
   The Prometheus scrape config already targets
   `tarot-frontend:3000/api/metrics`. Add a Next.js route handler at
   `app/api/metrics/route.ts` using `prom-client` to expose at minimum
   `nextjs_page_render_duration_seconds` and
   `nextjs_api_request_duration_seconds`.

4. **R2 upload latency**
   Wrap the boto3 R2 client in a `MetricsTimer` (the helper already
   exists in `backend/utils/metrics.py:155`) and emit
   `tarot_r2_upload_duration_seconds`.

5. **Email/notification task health**
   In `backend/tasks/email_tasks.py`, emit
   `tarot_email_sent_total{template, status}` and
   `tarot_email_send_duration_seconds`. SMTP is the #1 silent failure
   point in webapps.

6. **OpenAI cost in dollars**
   See [6.3](#63-dashboard-3--openai-cost--reliability) — emit
   `tarot_openai_cost_usd_total` so you don't have to maintain a price
   table in Grafana.

7. **Logs → Loki**
   The backend already does structured JSON logging
   (`backend/error_handlers.py:16-70`). Add Promtail + Loki to the
   monitoring stack and you'll be able to click from a Grafana panel
   directly into the matching log lines. Out of scope for this guide
   but extremely high ROI later.

---

## 10. Tips and gotchas

- **Use the explore view to draft queries.** `Explore` (compass icon
  in the left nav) is a single-panel scratchpad. Build a query there,
  then paste into a dashboard panel. Faster than editing panels.
- **Always set a unit on numeric panels.** `Panel options → Standard
  options → Unit`. `seconds (s)`, `bytes (IEC)`, `percent (0-100)`,
  `requests/sec`. A panel labeled "Latency" with no unit will mislead
  you.
- **Counter ≠ rate.** Never plot a raw `*_total` counter — it only
  ever goes up. Always wrap in `rate()` or `increase()`.
- **Beware label cardinality.** `tarot_cards_drawn_total{card_name}`
  has ~78 values — fine. If you ever label by `user_id` or `request_id`,
  you'll explode Prometheus's memory. Rule of thumb: keep label values
  under ~1000 per metric.
- **`clamp_min(x, 1e-9)` in denominators** — protects against
  divide-by-zero when there's no traffic.
- **Save dashboards as JSON to git.** Once you're happy with a
  dashboard, `Dashboard settings → JSON Model → Copy`, paste into
  `monitoring/grafana/dashboards/<name>.json`, commit. Provisioning
  will load it on the next Grafana restart. This is the workflow that
  makes dashboards reproducible.
- **One dashboard per audience, not per metric.** Resist the urge to
  build "the dashboard with everything". You'll never open it.
- **Time range matters.** A `rate(...[5m])` panel viewed over a 24h
  window is fine; viewed over 5 seconds it's empty. Defaulting to
  "Last 1 hour" / refresh "30s" is a good baseline for ops dashboards.
- **The provisioned dashboards are read-only in the UI.** If you want
  to edit one of the bundled JSON dashboards, either edit the JSON
  file directly, or use "Save as" to copy it into your own folder.

---

## Suggested learning order

1. Follow [Section 4](#4-setup-grafana-from-scratch-for-grafananguyenvanloccom) end-to-end. Confirm all
   targets are `UP` in Prometheus and the provisioned dashboards show
   data.
2. In Grafana `Explore`, run the queries from [section 5](#5-promql-primer-with-this-projects-metrics)
   one by one. Don't continue until each returns data.
3. Build **Dashboard 1 (Golden signals)** from scratch. Don't copy the
   JSON — type each query. This is where 80% of Grafana learning
   happens.
4. Build **Dashboard 2 (Business KPIs)**. Add the 4 variables from
   [section 7](#7-variables-template-variables).
5. Set up one alert end-to-end with a webhook.site contact point.
6. Compare your work to the bundled JSON dashboards and to
   `tarot_alerts.yml`. Note differences; they're learning opportunities.
7. Pick one item from [section 9](#9-things-to-monitor-that-arent-instrumented-yet)
   and instrument it yourself. That closes the loop: emit metric →
   scrape → query → visualize → alert.

Good luck.
