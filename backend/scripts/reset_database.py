#!/usr/bin/env python3
"""
Database Reset Script for Deployment

This script provides a complete database reset workflow for clean deployments:
1. Drop all existing tables
2. Reset Alembic migration history
3. Recreate tables from migrations
4. Optionally seed with initial data

DANGER: This will permanently delete ALL data in the database!

Usage:
    python scripts/reset_database.py [options]

Options:
    --confirm           Skip confirmation prompts (for automated deployments)
    --seed-data         Seed database with initial data after reset
    --backup-first      Create a backup before dropping tables
    --dry-run           Show what would be done without executing
"""

import argparse
import logging
import shutil
import subprocess
import sys
from datetime import datetime
from pathlib import Path

from sqlalchemy import inspect, text

# Add the backend directory to the path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from database import engine  # noqa: E402

# Set up logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


def create_backup(backup_name=None):
    """Create a backup of the database."""
    if backup_name is None:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_name = f"tarot_backup_{timestamp}.db"

    db_file = backend_dir / "tarot.db"
    backup_file = backend_dir / "backups" / backup_name

    # Create backups directory if it doesn't exist
    backup_file.parent.mkdir(exist_ok=True)

    if db_file.exists():
        try:
            shutil.copy2(db_file, backup_file)
            logger.info(f"📦 Database backup created: {backup_file}")
            return backup_file
        except Exception as e:
            logger.error(f"❌ Failed to create backup: {e}")
            raise
    else:
        logger.info("ℹ️  No database file found to backup.")
        return None


def get_all_tables():
    """Get list of all tables in the database."""
    try:
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        return tables
    except Exception as e:
        logger.warning(f"Could not inspect tables: {e}")
        return []


def drop_all_tables():
    """Drop all tables from the database."""
    try:
        with engine.begin() as conn:
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
                    conn.execute(text(f"DROP TABLE IF EXISTS {table_name} CASCADE"))
                except Exception as e:
                    logger.error(f"   Failed to drop {table_name}: {e}")

            # Drop Alembic version table
            conn.execute(text("DROP TABLE IF EXISTS alembic_version"))

            # Re-enable foreign key constraints
            if engine.dialect.name == "sqlite":
                conn.execute(text("PRAGMA foreign_keys = ON"))

            logger.info("✅ All tables dropped successfully!")

    except Exception as e:
        logger.error(f"❌ Error dropping tables: {e}")
        raise


def run_migrations():
    """Run Alembic migrations to recreate tables."""
    try:
        logger.info("🔄 Running database migrations...")

        # Run alembic upgrade head
        result = subprocess.run(
            ["alembic", "upgrade", "head"], cwd=backend_dir, capture_output=True, text=True, check=True
        )

        if result.returncode == 0:
            logger.info("✅ Database migrations completed successfully!")
        else:
            logger.error(f"❌ Migration failed: {result.stderr}")
            raise subprocess.CalledProcessError(result.returncode, "alembic upgrade head")

    except subprocess.CalledProcessError as e:
        logger.error(f"❌ Failed to run migrations: {e}")
        raise
    except FileNotFoundError:
        logger.error(
            "❌ Alembic not found. Make sure you're in the backend directory with virtual environment activated."
        )
        raise


def seed_initial_data():
    """Seed the database with initial data."""
    try:
        logger.info("🌱 Seeding initial data...")

        # Check if seed scripts exist and run them
        seed_scripts = ["seed_cards.py", "seed_spreads.py"]

        for script in seed_scripts:
            script_path = backend_dir / script
            if script_path.exists():
                try:
                    logger.info(f"   Running {script}...")
                    subprocess.run(
                        [sys.executable, str(script_path)], cwd=backend_dir, capture_output=True, text=True, check=True
                    )
                    logger.info(f"   ✅ {script} completed")
                except subprocess.CalledProcessError as e:
                    logger.warning(f"   ⚠️  {script} failed: {e.stderr}")
            else:
                logger.info(f"   ⏭️  {script} not found, skipping")

        logger.info("✅ Initial data seeding completed!")

    except Exception as e:
        logger.error(f"❌ Error seeding data: {e}")
        raise


def show_summary():
    """Show a summary of the database state."""
    try:
        tables = get_all_tables()
        logger.info("📊 Database Summary:")
        logger.info(f"   Tables created: {len(tables)}")
        for table in sorted(tables):
            logger.info(f"   • {table}")

        # Check Alembic current revision
        try:
            result = subprocess.run(["alembic", "current"], cwd=backend_dir, capture_output=True, text=True, check=True)
            if result.stdout.strip():
                logger.info(f"   Migration revision: {result.stdout.strip()}")
        except Exception:
            logger.info("   Migration revision: Could not determine")

    except Exception as e:
        logger.warning(f"Could not generate summary: {e}")


def main():
    """Main function."""
    parser = argparse.ArgumentParser(description="Reset database for deployment")
    parser.add_argument("--confirm", action="store_true", help="Skip confirmation prompts (for automated deployments)")
    parser.add_argument("--seed-data", action="store_true", help="Seed database with initial data after reset")
    parser.add_argument("--backup-first", action="store_true", help="Create a backup before dropping tables")
    parser.add_argument("--dry-run", action="store_true", help="Show what would be done without executing")

    args = parser.parse_args()

    if args.dry_run:
        logger.info("🔍 DRY RUN MODE - No changes will be made")
        logger.info("Would perform the following actions:")
        if args.backup_first:
            logger.info("1. Create database backup")
        logger.info("2. Drop all existing tables")
        logger.info("3. Run Alembic migrations to recreate tables")
        if args.seed_data:
            logger.info("4. Seed database with initial data")
        logger.info("5. Show database summary")
        return

    if not args.confirm:
        print("🚨 WARNING: This will permanently delete ALL data in the database!")
        print("🚨 This action cannot be undone!")
        print()

        tables = get_all_tables()
        if tables:
            print("📋 Current tables that will be dropped:")
            for table in sorted(tables):
                print(f"   • {table}")
            print()

        print("After reset, the following will be done:")
        print("✅ Drop all tables")
        print("✅ Run migrations to recreate schema")
        if args.seed_data:
            print("✅ Seed with initial data")
        print()

        response = input("Are you sure you want to proceed? Type 'RESET DATABASE' to confirm: ")
        if response != "RESET DATABASE":
            print("❌ Operation cancelled.")
            return

    try:
        logger.info("🚀 Starting database reset process...")

        # Step 1: Create backup if requested
        if args.backup_first:
            create_backup()

        # Step 2: Drop all tables
        drop_all_tables()

        # Step 3: Run migrations
        run_migrations()

        # Step 4: Seed initial data if requested
        if args.seed_data:
            seed_initial_data()

        # Step 5: Show summary
        show_summary()

        logger.info("🎉 Database reset completed successfully!")
        logger.info("💡 Your database is now ready for production use.")

    except KeyboardInterrupt:
        print("\n❌ Operation cancelled by user.")
        sys.exit(1)
    except Exception as e:
        logger.error(f"❌ Database reset failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
