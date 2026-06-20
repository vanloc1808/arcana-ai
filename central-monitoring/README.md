# Central Monitoring

A standalone, self-hosted monitoring stack — **Prometheus + Grafana** — that
serves **many projects** from one place. You view everything at
`https://grafana.nguyenvanloc.com`; projects get their metrics in either by
being **pulled** (scraped) or by **pushing** to
`https://metrics.nguyenvanloc.com/api/v1/write`.

> **This directory is a self-contained draft of a separate repository.** It
> currently lives inside `arcana-ai/` so it can be reviewed in one place. To
> deploy it, move it into its own git repo:
> ```bash
> cp -r central-monitoring /path/to/central-monitoring && cd $_
> git init && git add . && git commit -m "Initial central monitoring stack"
> ```

---

## How metrics actually flow (read this first)

Three different things — don't conflate them:

| Thing | URL | Who talks to it | Purpose |
|---|---|---|---|
| **Grafana** | `grafana.nguyenvanloc.com` | You, in a browser | View dashboards & alerts |
| **Prometheus ingest** | `metrics.nguyenvanloc.com/api/v1/write` | A project's **agent** | Receive *pushed* metrics |
| A project's **`/metrics`** | internal, e.g. `tarot-backend:8000/metrics` | Prometheus (*pull*) | Expose metrics |

A project **never sends metrics to `grafana.nguyenvanloc.com`** — that host is
only the human UI. Metrics land in **Prometheus** (pushed there, or pulled by
it), and Grafana reads them back out of Prometheus to draw graphs.

```
                              You (browser)
                                   │ https://grafana.nguyenvanloc.com
                                   ▼
                              ┌─────────┐        ┌───────────────┐
                              │ Grafana │ ─────▶ │  Prometheus   │
                              └─────────┘ query  │  TSDB + rules │
                                                 └───────────────┘
                                                  ▲             ▲
                                  pull (localnet) │             │ push (remote_write)
                                                  │             │ https://metrics.../api/v1/write
                             ┌────────────────────┘             └──────────────────┐
                             │                                                      │
                   co-located project                                    remote project + agent
              (arcana-ai: tarot-backend:8000/metrics)            (Grafana Alloy scrapes locally,
               added via prometheus/targets/*.yml)                pushes; see agent/)
```

**Server vs agents.** Prometheus + Grafana are the central *server* — one
deployment. `node-exporter` and `cAdvisor` only see the host they run on, so
they belong to a per-host *agent* (see `agent/`), not the central box. If a
project is co-located with this stack, one agent on this host covers it.

---

## Layout

```
central-monitoring/
├── docker-compose.yaml                     # Prometheus + Grafana (the server)
├── docker-compose.prod.override.yaml.example  # bind to localhost for prod
├── .env.example                            # Grafana admin + domain
├── prometheus/
│   ├── prometheus.yml                      # self-scrape, file_sd, remote_write receiver
│   ├── targets/                            # PULL: one file per co-located project
│   │   └── arcana-ai.yml
│   └── rules/
│       └── shared_alerts.yml               # generic liveness alerts
├── grafana/
│   ├── provisioning/                       # datasource (uid=prometheus) + dashboard provider
│   └── dashboards/
│       └── shared-targets.json             # starter shared dashboard ($project aware)
├── agent/                                  # PUSH: drop next to a remote project
│   ├── docker-compose.agent.yaml           # Alloy + node-exporter + cadvisor
│   ├── config.alloy                        # scrape local /metrics -> remote_write
│   └── .env.example
└── reverse-proxy/
    └── Caddyfile.example                   # grafana vhost + authenticated metrics vhost
```

---

## Quick start

### 1. Create the shared network

Co-located pull uses container DNS over an **external** Docker network shared
with the monitored apps:

```bash
docker network create localnet || true
```

### 2. Configure secrets

```bash
cp .env.example .env
# edit .env: set a long random GRAFANA_ADMIN_PASSWORD and your domain
chmod 600 .env
```

### 3. Start the stack

Local testing:

```bash
docker compose --env-file .env up -d
```

Production (binds Grafana/Prometheus to localhost; only the reverse proxy is
public):

```bash
cp docker-compose.prod.override.yaml.example docker-compose.prod.override.yaml
docker compose \
  -f docker-compose.yaml \
  -f docker-compose.prod.override.yaml \
  --env-file .env up -d
```

### 4. Verify

```bash
docker ps --filter 'name=monitoring-' --format 'table {{.Names}}\t{{.Status}}'
# Prometheus targets (via SSH tunnel in prod):
#   open http://localhost:9090/targets  -> co-located targets should be UP
```

In Grafana (`Connections → Data sources → Prometheus → Save & test`) you want a
green "Successfully queried the Prometheus API". The **Shared — Targets &
Liveness** dashboard should already be provisioned.

---

## Put HTTPS in front

Use the two-vhost `reverse-proxy/Caddyfile.example`:

- `grafana.nguyenvanloc.com` → `127.0.0.1:3002` (the UI).
- `metrics.nguyenvanloc.com` → `127.0.0.1:9090`, but **only** the
  `/api/v1/write` path, behind basic auth. Everything else returns 404, so
  nobody can query your Prometheus from the internet.

```bash
caddy hash-password --plaintext 'a-strong-shared-token'   # paste hash into the Caddyfile
sudo cp reverse-proxy/Caddyfile.example /etc/caddy/Caddyfile   # then edit hashes/domains
sudo systemctl reload caddy
```

DNS: point `A`/`AAAA` records for both `grafana` and `metrics` at the server.

---

## Connect a co-located project (PULL — simplest)

The project runs on the **same Docker host** as this stack and shares
`localnet`.

1. Make sure the project's app container is on `localnet` and serves `/metrics`.
2. Drop a target file in `prometheus/targets/<project>.yml` (copy
   `arcana-ai.yml`):
   ```yaml
   - targets: ["my-app:8080"]
     labels:
       project: "my-app"
       component: "backend"
       env: "production"
   ```
3. Done — Prometheus picks it up within `refresh_interval` (30s); no restart.

That's the whole integration. No agent, no public endpoint, no token.

---

## Connect a remote project (PUSH — "just call a URL")

The project runs **somewhere else** and can't be scraped directly. Use the
agent: copy `agent/` next to the project, set `.env`, and start it. It scrapes
the project locally and pushes to `metrics.nguyenvanloc.com/api/v1/write`. Full
steps in `agent/README.md`.

This is the model behind "every project calls into the monitoring container" —
the call goes to the **metrics** endpoint, authenticated, not to Grafana.

---

## Dashboards

- Shared/infra dashboards live in `grafana/dashboards/` and are provisioned on
  startup (read-only in the UI — edit the JSON, or "Save as" a copy).
- **Per-project dashboards stay with the project** (observability-as-code).
  Bring them here by copying their JSON into `grafana/dashboards/<project>/`
  (subfolders become Grafana folders) or by syncing in CI.
- Filter shared dashboards by the provisioned `$project` template variable
  (`label_values(up, project)`).

---

## Security checklist

- [ ] Only `grafana.*` and `metrics.*` (write path) are reachable publicly.
- [ ] Prometheus UI (`:9090`) is bound to `127.0.0.1` / behind SSH only.
- [ ] `metrics.*/api/v1/write` requires auth; everything else there is 404.
- [ ] `.env` is gitignored and `chmod 600`.
- [ ] Each pushing project has its own credential (rotate per project).
- [ ] Remote pull (if you use it instead of push) runs over WireGuard/Tailscale,
      never a public `/metrics`.

---

## Migrating ArcanaAI onto this stack

ArcanaAI currently ships its own `monitoring-docker-compose.yaml` + `monitoring/`.
To cut over:

1. Deploy this central stack (above).
2. Keep ArcanaAI co-located? Use `prometheus/targets/arcana-ai.yml` (already
   here) and **stop** ArcanaAI's bundled monitoring compose.
3. ArcanaAI elsewhere? Run `agent/` on its host with `PROJECT_NAME=arcana-ai`.
4. Move ArcanaAI's dashboards/alerts (`monitoring/grafana/dashboards/*`,
   `monitoring/prometheus/rules/tarot_alerts.yml`) into this repo (or keep them
   in the ArcanaAI repo and sync them in).
5. Once green here, delete the old monitoring stack from the ArcanaAI repo.

See `docs/grafana-monitoring-guide.md` in the ArcanaAI repo for the
ArcanaAI-specific metrics, PromQL, dashboards, and alerts.
