#!/usr/bin/env python
import sys
from pathlib import Path

from alembic import command
from alembic.config import Config


def run_migrations():
    """Run database migrations."""
    # Get the directory containing this script
    current_dir = Path(__file__).resolve().parent

    # Create Alembic configuration
    alembic_cfg = Config(current_dir / "alembic.ini")

    # Set the script location
    alembic_cfg.set_main_option("script_location", str(current_dir / "migrations"))

    # Run the migration
    try:
        command.upgrade(alembic_cfg, "head")
        print("Database migrations completed successfully.")
    except Exception as e:
        print(f"Error running migrations: {str(e)}")
        sys.exit(1)


if __name__ == "__main__":
    run_migrations()
