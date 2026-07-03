# Synthetic Traffic Cron

This local-only container creates predictable ArcanaAI traffic for dashboards. It runs background health traffic four times per day and OpenAI-backed chat message traffic every hour, using an ignored local environment file for credentials.

## Setup

Copy the example file and fill in real credentials locally:

```bash
cp synthetic-traffic/.env.example synthetic-traffic/.env
```

Required values:

- `ARCANA_SYNTHETIC_USERNAME`
- `ARCANA_SYNTHETIC_EMAIL`
- `ARCANA_SYNTHETIC_PASSWORD`

When `ARCANA_SYNTHETIC_EMAIL` is set, message and forgot-password jobs first call `POST /auth/register` to create the synthetic user if it does not already exist. Login defaults to the email address, but can be overridden with `ARCANA_SYNTHETIC_LOGIN`.

The real `synthetic-traffic/.env` file is ignored by Git and excluded from the Docker build context.

This image is built only by local Docker Compose and is not built or pushed by CI/CD.

## Default Schedule

The dashboard background traffic schedule is:

```cron
0 0,6,12,18 * * *
```

That runs at 00:00, 06:00, 12:00, and 18:00 UTC. Override it with `ARCANA_SYNTHETIC_CRON`.

The OpenAI-backed message traffic schedule is:

```cron
0 * * * *
```

That runs once per hour. Override it with `ARCANA_SYNTHETIC_MESSAGE_CRON`.

The password reset email traffic schedule is:

```cron
15 0,6,12,18 * * *
```

That calls `POST /auth/forgot-password` four times per day, offset from the dashboard run. Override it with `ARCANA_SYNTHETIC_FORGOT_PASSWORD_CRON`.

## Default Traffic

Each dashboard run sends `1000` requests to `GET /health/`.

Each hourly message run ensures the synthetic account exists, logs in, creates a chat session, then sends `2` authenticated requests to `POST /chat/sessions/{session_id}/messages/`. These message requests are the synthetic OpenAI metric trigger.

Each password reset run ensures the synthetic account exists, then calls `POST /auth/forgot-password` for the synthetic email address. That endpoint queues the Celery password reset email task when the account exists.

Adjust the values in `synthetic-traffic/.env` if you need lighter or heavier dashboard traffic.

## Local Smoke Run

Set one of these in `synthetic-traffic/.env` for a one-off run when the container starts:

```env
ARCANA_SYNTHETIC_RUN_ON_START=true
ARCANA_SYNTHETIC_MESSAGE_RUN_ON_START=true
ARCANA_SYNTHETIC_FORGOT_PASSWORD_RUN_ON_START=true
```

Then start only the synthetic traffic service:

```bash
docker compose up -d --build synthetic-traffic
```
