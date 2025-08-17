# Celery Management Commands

.PHONY: help worker beat monitor purge flower dev-worker dev-beat redis

help:
	@echo "Available commands:"
	@echo "  worker      - Start Celery worker"
	@echo "  beat        - Start Celery beat scheduler"
	@echo "  monitor     - Monitor Celery workers"
	@echo "  purge       - Purge all queued tasks"
	@echo "  flower      - Start Flower monitoring (install with: uv add flower)"
	@echo "  dev-worker  - Start worker for development"
	@echo "  dev-beat    - Start beat for development"
	@echo "  redis       - Start Redis locally (requires redis-server)"

worker:
	celery -A celery_app worker --loglevel=info --queues=email,notifications,celery

beat:
	celery -A celery_app beat --loglevel=info

monitor:
	celery -A celery_app events

purge:
	celery -A celery_app purge

flower:
	celery -A celery_app flower --port=5555

dev-worker:
	celery -A celery_app worker --loglevel=debug --queues=email,notifications,celery --concurrency=1

dev-beat:
	celery -A celery_app beat --loglevel=debug

redis:
	redis-server --port 6379 --daemonize yes

# Combined commands for development
dev: redis dev-worker dev-beat

# Check Redis connection
check-redis:
	redis-cli ping

# Show active tasks
active:
	celery -A celery_app inspect active

# Show registered tasks
tasks:
	celery -A celery_app inspect registered
