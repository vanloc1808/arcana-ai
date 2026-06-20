# Project agent (push)

Use this when a project runs on a **different host** than the central
monitoring stack, so the central Prometheus cannot scrape it directly. The
agent (Grafana Alloy) scrapes the project locally and **pushes** to
`https://metrics.<domain>/api/v1/write`.

> If the project runs on the **same** host as the central stack, you don't need
> this agent at all — add a pull target instead (see the top-level README,
> "Connect a co-located project").

## Use it

1. Copy this whole `agent/` folder next to the project you want to monitor.
2. `cp .env.example .env` and fill in:
   - `PROJECT_NAME` — the label that identifies this project in Grafana.
   - `APP_METRICS_ADDRESS` — host:port where the app serves `/metrics`.
   - `METRICS_REMOTE_WRITE_URL` — the central ingest URL.
   - `METRICS_USERNAME` / `METRICS_PASSWORD` — credentials the central reverse
     proxy enforces on the write endpoint.
3. Make sure the project's containers share the external `localnet` network so
   Alloy can resolve `APP_METRICS_ADDRESS` by container DNS:
   ```bash
   docker network create localnet || true
   ```
4. Start the agent:
   ```bash
   docker compose -f docker-compose.agent.yaml --env-file .env up -d
   ```

## Verify

```bash
docker logs monitoring-agent-alloy --tail 50      # look for successful remote_write
```

In Grafana's Explore, run `up{project="<PROJECT_NAME>"}` or
`count by (project) (scrape_samples_scraped)` — your project should appear.

## What it ships

- App metrics from `APP_METRICS_ADDRESS/metrics`.
- Host metrics (node-exporter) and per-container metrics (cAdvisor) for this host.

All carry the `project` label so dashboards can filter by `$project`.
