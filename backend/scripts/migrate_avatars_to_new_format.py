#!/usr/bin/env python3
"""
Avatar Migration Script

This script migrates existing avatar files from the old UUID-based naming format
to the new username_timestamp format and moves them to the Docker volume path.

Usage:
    python scripts/migrate_avatars_to_new_format.py [--dry-run]

Arguments:
    --dry-run    Show what would be changed without making any modifications
"""

import os
import sys
import shutil
import argparse
from pathlib import Path
from datetime import datetime

# Add backend to Python path
sys.path.append(str(Path(__file__).parent.parent))

from database import get_db
from models import User


def get_file_extension(filename):
    """Get file extension from filename."""
    return Path(filename).suffix.lower()


def create_new_filename(username, timestamp_str=None):
    """Create new filename in username_timestamp format."""
    if timestamp_str is None:
        timestamp_str = datetime.now().strftime("%Y%m%d_%H%M%S")

    # Sanitize username to be filesystem safe
    safe_username = "".join(c for c in username if c.isalnum() or c in ('-', '_')).strip()
    return f"{safe_username}_{timestamp_str}.jpg"


def migrate_avatars(dry_run=False):
    """Migrate avatar files to new naming format and location."""

    # Paths
    old_avatar_dir = Path("media/avatars")

    # Determine new avatar directory based on environment
    fastapi_env = os.getenv("FASTAPI_ENV", "production").lower()
    if fastapi_env == "local":
        new_avatar_dir = Path("./user-avatars")
    else:
        new_avatar_dir = Path("/avatar")

    print("🔄 Avatar Migration Script")
    print("=" * 50)
    print(f"Old avatar directory: {old_avatar_dir}")
    print(f"New avatar directory: {new_avatar_dir}")
    print(f"Dry run mode: {dry_run}")
    print()

    if not old_avatar_dir.exists():
        print("ℹ️  No old avatar directory found. Nothing to migrate.")
        return

    # Create new directory if it doesn't exist
    if not dry_run:
        new_avatar_dir.mkdir(parents=True, exist_ok=True)

    # Get database session
    db = next(get_db())

    try:
        # Get all users with avatars
        users_with_avatars = db.query(User).filter(User.avatar_filename.isnot(None)).all()

        if not users_with_avatars:
            print("ℹ️  No users with avatars found. Nothing to migrate.")
            return

        print(f"Found {len(users_with_avatars)} users with avatars to migrate:")
        print()

        migrated_count = 0
        error_count = 0

        for user in users_with_avatars:
            old_filename = user.avatar_filename
            old_file_path = old_avatar_dir / old_filename

            print(f"👤 User: {user.username} (ID: {user.id})")
            print(f"   Old filename: {old_filename}")

            # Check if old file exists
            if not old_file_path.exists():
                print(f"   ❌ Old file not found: {old_file_path}")
                error_count += 1
                print()
                continue

            # Generate new filename
            # Try to extract timestamp from old file if possible, otherwise use current time
            try:
                file_stat = old_file_path.stat()
                file_mtime = datetime.fromtimestamp(file_stat.st_mtime)
                timestamp_str = file_mtime.strftime("%Y%m%d_%H%M%S")
            except:
                timestamp_str = datetime.now().strftime("%Y%m%d_%H%M%S")

            new_filename = create_new_filename(user.username, timestamp_str)
            new_file_path = new_avatar_dir / new_filename

            print(f"   New filename: {new_filename}")
            print(f"   New path: {new_file_path}")

            if dry_run:
                print(f"   🔍 [DRY RUN] Would copy {old_file_path} -> {new_file_path}")
                print(f"   🔍 [DRY RUN] Would update database: {old_filename} -> {new_filename}")
            else:
                try:
                    # Copy file to new location
                    shutil.copy2(old_file_path, new_file_path)
                    print(f"   ✅ Copied file successfully")

                    # Update database
                    user.avatar_filename = new_filename
                    db.commit()
                    print(f"   ✅ Updated database record")

                    # Delete old file
                    old_file_path.unlink()
                    print(f"   ✅ Deleted old file")

                    migrated_count += 1

                except Exception as e:
                    print(f"   ❌ Error migrating: {e}")
                    error_count += 1
                    # Rollback database changes if file operations failed
                    db.rollback()

            print()

        # Summary
        print("📊 Migration Summary")
        print("=" * 30)
        if dry_run:
            print(f"Users that would be migrated: {len(users_with_avatars) - error_count}")
            print(f"Users with errors: {error_count}")
        else:
            print(f"Successfully migrated: {migrated_count}")
            print(f"Errors encountered: {error_count}")

            # Clean up old directory if empty
            if old_avatar_dir.exists() and not any(old_avatar_dir.iterdir()):
                try:
                    old_avatar_dir.rmdir()
                    print(f"✅ Removed empty old avatar directory: {old_avatar_dir}")
                except:
                    print(f"⚠️  Could not remove old avatar directory: {old_avatar_dir}")

        print()
        print("✨ Migration completed!")

    except Exception as e:
        print(f"❌ Fatal error during migration: {e}")
        return False
    finally:
        db.close()

    return True


def main():
    """Main function."""
    parser = argparse.ArgumentParser(description="Migrate avatar files to new naming format")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be changed without making modifications"
    )

    args = parser.parse_args()

    if args.dry_run:
        print("🔍 Running in DRY RUN mode - no changes will be made")
        print()

    success = migrate_avatars(dry_run=args.dry_run)

    if not success:
        sys.exit(1)


if __name__ == "__main__":
    main()