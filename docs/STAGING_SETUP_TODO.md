# Staging Setup - Manual Follow-ups

These are the actions that still require manual access outside this repository.

## GitHub repository settings

- Add `VPS_STAGING_PROJECT_DIR` in **GitHub → Settings → Secrets and variables → Actions**.
  - Value should point to the staging checkout path on the self-hosted runner, e.g. `/opt/arcana-ai-staging`.
- Confirm the self-hosted runner used by this repo can:
  - access Docker daemon,
  - pull images from Docker Hub,
  - read the staging project directory.

## VPS / host setup

- Create or update staging checkout on the server:
  - `git clone` the repo to the path used in `VPS_STAGING_PROJECT_DIR` (if not present),
  - ensure `staging` branch exists and is tracked.
- Create environment files:
  - `backend/.env.staging`
  - `frontend/.env.staging`
- Ensure `localnet` Docker network exists:
  - `docker network create localnet` (only once if absent).
- Verify Traefik is attached to `localnet` and can route staging hosts.

## DNS / TLS

- Add DNS records for:
  - `staging-arcanaai.nguyenvanloc.com`
  - `staging-backend-arcanaai.nguyenvanloc.com`
- Point both records to the VPS public IP (or LB in front of it).
- Verify TLS certificates are issued for both staging domains.

## Optional hardening

- Protect staging with basic auth or IP allowlist at Traefik level.
- Add separate staging database / storage credentials (avoid sharing production secrets).
