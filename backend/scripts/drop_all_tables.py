#!/usr/bin/env python3
"""
Drop All Tables Script

This script drops ALL tables from the database, including the Alembic version table.
Use this for clean deployments when you want to start with a fresh database.

DANGER: This will permanently delete ALL data in the database!

Usage:
    python scripts/drop_all_tables.py [--confirm]

Options:
    --confirm    Skip the confirmation prompt (for automated scripts)
"""

import argparse
import logging
import sys
from pathlib import Path

from sqlalchemy import inspect, text

# Add the backend directory to the path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from database import engine  # noqa: E402

# Set up logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


def get_all_tables():
    """Get list of all tables in the database."""
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    return tables


def drop_all_tables(confirm=False):
    """Drop all tables from the database."""

    if not confirm:
        print("🚨 WARNING: This will permanently delete ALL data in the database!")
        print("🚨 This action cannot be undone!")
        print()

        # Get list of tables to show user what will be deleted
        tables = get_all_tables()
        if tables:
            print("📋 Tables that will be dropped:")
            for table in sorted(tables):
                print(f"   • {table}")
            print()
        else:
            print("ℹ️  No tables found in database.")
            return

        response = input("Are you sure you want to proceed? Type 'DELETE ALL' to confirm: ")
        if response != "DELETE ALL":
            print("❌ Operation cancelled.")
            return

    try:
        with engine.begin() as conn:
            # Get all tables
            tables = get_all_tables()

            if not tables:
                logger.info("ℹ️  No tables found to drop.")
                return

            logger.info(f"🗑️  Dropping {len(tables)} tables...")

            # SQLite: Disable foreign key constraints temporarily
            if engine.dialect.name == "sqlite":
                conn.execute(text("PRAGMA foreign_keys = OFF"))

            # Drop all tables
            for table_name in tables:
                try:
                    logger.info(f"   Dropping table: {table_name}")
                    conn.execute(text(f"DROP TABLE IF EXISTS {table_name}"))
                except Exception as e:
                    logger.error(f"   Failed to drop {table_name}: {e}")

            # Re-enable foreign key constraints
            if engine.dialect.name == "sqlite":
                conn.execute(text("PRAGMA foreign_keys = ON"))

            logger.info("✅ All tables dropped successfully!")
            logger.info("💡 Run 'alembic upgrade head' to recreate tables from migrations.")

    except Exception as e:
        logger.error(f"❌ Error dropping tables: {e}")
        raise


def reset_alembic_version():
    """Reset the Alembic version table."""
    try:
        with engine.begin() as conn:
            # Drop the alembic_version table if it exists
            conn.execute(text("DROP TABLE IF EXISTS alembic_version"))
            logger.info("🔄 Alembic version table reset.")
    except Exception as e:
        logger.error(f"❌ Error resetting Alembic version: {e}")
        raise


def main():
    """Main function."""
    parser = argparse.ArgumentParser(description="Drop all database tables")
    parser.add_argument("--confirm", action="store_true", help="Skip confirmation prompt (for automated scripts)")
    parser.add_argument("--reset-alembic", action="store_true", help="Also reset the Alembic version table")

    args = parser.parse_args()

    try:
        # Drop all tables
        drop_all_tables(confirm=args.confirm)

        # Reset Alembic version if requested
        if args.reset_alembic:
            reset_alembic_version()

    except KeyboardInterrupt:
        print("\n❌ Operation cancelled by user.")
        sys.exit(1)
    except Exception as e:
        logger.error(f"❌ Script failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
