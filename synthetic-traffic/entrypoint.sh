#!/bin/sh
set -eu

DASHBOARD_CRON_SCHEDULE="${ARCANA_SYNTHETIC_CRON:-0 0,6,12,18 * * *}"
MESSAGE_CRON_SCHEDULE="${ARCANA_SYNTHETIC_MESSAGE_CRON:-0 * * * *}"

python - <<'PYENV'
import os
import shlex

keys = [
    "ARCANA_SYNTHETIC_BASE_URL",
    "ARCANA_SYNTHETIC_USERNAME",
    "ARCANA_SYNTHETIC_PASSWORD",
    "ARCANA_SYNTHETIC_HEALTH_REQUESTS",
    "ARCANA_SYNTHETIC_HEALTH_CONCURRENCY",
    "ARCANA_SYNTHETIC_MESSAGE_REQUESTS",
    "ARCANA_SYNTHETIC_MESSAGE_DELAY_SECONDS",
    "ARCANA_SYNTHETIC_REQUEST_TIMEOUT_SECONDS",
]

with open("/app/runtime.env", "w", encoding="utf-8") as env_file:
    for key in keys:
        if key in os.environ:
            env_file.write(f"export {key}={shlex.quote(os.environ[key])}\n")
PYENV

cat > /app/run-synthetic-traffic.sh <<'EOF'
#!/bin/sh
set -eu
. /app/runtime.env
exec /usr/local/bin/python /app/synthetic_traffic.py "$@"
EOF
chmod +x /app/run-synthetic-traffic.sh

if [ "${ARCANA_SYNTHETIC_RUN_ON_START:-false}" = "true" ]; then
  /app/run-synthetic-traffic.sh dashboard
fi

if [ "${ARCANA_SYNTHETIC_MESSAGE_RUN_ON_START:-false}" = "true" ]; then
  /app/run-synthetic-traffic.sh messages
fi

{
  printf "%s /app/run-synthetic-traffic.sh dashboard\n" "$DASHBOARD_CRON_SCHEDULE"
  printf "%s /app/run-synthetic-traffic.sh messages\n" "$MESSAGE_CRON_SCHEDULE"
} > /etc/crontabs/root

echo "Synthetic traffic dashboard cron scheduled: ${DASHBOARD_CRON_SCHEDULE}"
echo "Synthetic traffic messages cron scheduled: ${MESSAGE_CRON_SCHEDULE}"
exec crond -f -l 8
