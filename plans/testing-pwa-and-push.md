# Testing — PWA + Web Push Notifications

How to verify the PWA install and Web Push features added in this branch.

## Prerequisites

### Generate VAPID keys (one-time, server operator)

Web Push is OFF until both VAPID keys are set. Generate them once with the
included `py-vapid` CLI (installed via `pywebpush`):

```bash
cd backend
uv run vapid --gen
# Writes public_key.pem and private_key.pem in the current directory.

# Convert to URL-safe base64 strings for the env vars
uv run vapid --applicationServerKey
# Prints the public key; copy the long base64url string after "Application Server Key = "

# Get the URL-safe base64 private key
uv run python -c "
from pywebpush import WebPusher
from py_vapid import Vapid
v = Vapid.from_file('private_key.pem')
print(v.private_key_url_safe_base64 if hasattr(v, 'private_key_url_safe_base64') else 'check docs')"
```

In `backend/.env`:

```
WEBPUSH_PUBLIC_KEY=<URL-safe base64 public key>
WEBPUSH_PRIVATE_KEY=<URL-safe base64 private key>
WEBPUSH_SUBJECT=mailto:you@yourdomain.com
```

If these vars are blank, `GET /api/web-push/vapid-public-key` returns
`configured: false` and the frontend hides the toggle gracefully.

### Run migrations

```bash
cd backend
uv run alembic upgrade head
```

You should see `Running upgrade c3d4e5f6a7b8 -> d4e5f6a7b8c9, add web_push_subscriptions table`.

## Backend tests (automated)

```bash
cd backend
OPENAI_API_KEY=sk-test-dummy uv run pytest tests/test_web_push.py -v
```

Expect 10 tests passing. They cover:

- `GET /api/web-push/vapid-public-key` reflecting whether VAPID is set
- `POST /api/web-push/subscribe` creates and updates rows
- `POST /api/web-push/subscribe` returns 503 when VAPID isn't configured
- Auth required on subscribe
- `POST /api/web-push/unsubscribe` removes rows; unknown endpoints succeed
  idempotently
- `process_due_reading_reminders_task` marks overdue reminders sent and
  leaves future-dated ones alone
- The Celery task short-circuits when web push is unconfigured

## Manual end-to-end test

You'll need **HTTPS** (or `localhost`) — service workers and Push API require
a secure context.

1. Start the stack as usual:
   ```bash
   docker compose up
   ```
2. Open the frontend in **Chrome, Edge, or Firefox**. Safari supports Web Push
   on macOS 13+ / iOS 16.4+ but requires installing the PWA first.
3. Open DevTools → Application → Service Workers. Confirm `/sw.js` is
   "activated and is running".
4. Open Application → Manifest. Confirm:
   - Name = "ArcanaAI - Mystical Guidance"
   - Display = standalone
   - Theme color = `#7c3aed`
   - Three shortcuts visible (Daily Card / Reading / Journal)
   - Icons load (favicon.svg)

### Install the PWA

- **Chrome/Edge desktop**: Click the install icon in the address bar
  (or three-dot menu → "Install ArcanaAI"). The app opens in its own window.
- **Android Chrome**: Three-dot menu → "Install app" or "Add to Home screen".
- **iOS Safari 16.4+**: Share sheet → "Add to Home Screen". You won't get
  the auto-install banner; this is a Safari limitation.

After install, long-press the icon — you should see the three shortcuts.

### Enable push notifications

1. Sign in.
2. Profile → **Notifications** tab. Three things can happen:
   - Toggle visible → VAPID is set and the browser supports push. Continue.
   - "Push notifications are not supported in this browser" → expected on
     non-supporting browsers.
   - "Push notifications aren't configured on this server yet" → set the
     VAPID env vars and restart the backend.
3. Click **Turn on**. Approve the browser permission prompt. Toast: "Push
   notifications enabled."
4. Click **Send test**. Within a second or two you should see a system
   notification "Push notifications are working — your daily card awaits."
5. Click the notification — the app should open and focus `/reading`.

### Verify the reminder loop

Push only fires for `ReadingReminder` rows whose `reminder_date` has passed
and `is_sent=false`. Quickest way to manufacture one:

1. Create a journal entry with a follow-up date in the past:
   ```bash
   curl -X POST http://localhost:8000/api/journal/entries \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "reading_snapshot": {"cards": []},
       "personal_notes": "test",
       "follow_up_date": "2026-01-01T00:00:00Z"
     }'
   ```
   This auto-creates a `ReadingReminder` for that date.
2. Manually trigger the Celery task instead of waiting for the hourly beat:
   ```bash
   cd backend
   OPENAI_API_KEY=sk-test-dummy uv run python -c "
   from tasks.web_push_tasks import process_due_reading_reminders_task
   print(process_due_reading_reminders_task.run())
   "
   ```
   Expect `status: success, due_count: 1, users_notified: 1` and a system
   notification on the registered device.

### Turn off / re-enable

1. Profile → Notifications → **Turn off**. Toast: "Push notifications
   disabled." The browser's `pushManager.subscribe()` is unsubscribed and the
   row in `web_push_subscriptions` is deleted.
2. **Turn on** again — a new subscription row should appear.

## Lighthouse PWA audit

Chrome DevTools → Lighthouse → Categories: "Progressive Web App" → Analyze.

Pass criteria:

- Installable: ✅ (manifest valid, SW controlling, served over HTTPS / localhost)
- PWA optimized: ✅ apart from the optional split-screen viewport and themed
  omnibox checks, which are non-blocking.

Known limitations of this implementation:

- No offline shell — Next.js' own asset caching is left alone. Visiting the
  app fully offline currently shows the browser's offline page. A future PR
  could add an offline fallback page.
- No `192x192` / `512x512` PNG icons — we use the SVG favicon with
  `purpose: "any maskable"`. Some installers prefer PNGs of those exact sizes.

## Troubleshooting

| Symptom                                              | Likely cause                                                         |
|------------------------------------------------------|----------------------------------------------------------------------|
| Toggle missing                                       | `WEBPUSH_PUBLIC_KEY` / `WEBPUSH_PRIVATE_KEY` not set on the backend  |
| "Notification permission was denied."                | The browser dialog was dismissed/blocked; reset site permissions     |
| Test push toast says "0 delivered"                   | The subscription is dead — try Turn off + Turn on                    |
| Service worker stuck on old version                  | DevTools → Application → Service Workers → Unregister, then reload   |
| Apple device receives nothing                        | iOS only supports Web Push for installed PWAs (16.4+)                |
| `pywebpush.WebPushException: 410 Gone`               | Endpoint expired — the task auto-prunes; no action needed            |
