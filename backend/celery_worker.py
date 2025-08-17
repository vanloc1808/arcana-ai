#!/usr/bin/env python3
"""
Celery Worker Script

Script to run Celery workers for development and production.
This script can be used to start workers with different configurations.
"""

import sys
from pathlib import Path

# Add the backend directory to the path so we can import our modules
sys.path.insert(0, str(Path(__file__).parent.parent))

from celery_app import celery_app  # noqa: E402

if __name__ == "__main__":
    # Run the worker
    celery_app.start()
