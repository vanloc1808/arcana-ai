#!/usr/bin/env python3
"""
Avatar Cleanup Script

This script provides maintenance utilities for avatar files:
- Remove orphaned avatar files (files without corresponding user records)
- Clean up old avatars for users (keeping only the most recent)
- General cleanup and statistics

Usage:
    python scripts/cleanup_avatars.py [command] [options]

Commands:
    orphaned        Remove orphaned avatar files
    old-avatars     Clean up old avatars (keep only latest per user)
    stats           Show avatar storage statistics
    user            Clean up avatars for a specific user

Examples:
    python scripts/cleanup_avatars.py stats
    python scripts/cleanup_avatars.py orphaned --dry-run
    python scripts/cleanup_avatars.py old-avatars --keep 2 --dry-run
    python scripts/cleanup_avatars.py user --username john_doe --keep 1
"""

import os
import sys
import argparse
from pathlib import Path
from datetime import datetime, timedelta

# Add backend to Python path
sys.path.append(str(Path(__file__).parent.parent))

from database import get_db
from models import User
from utils.avatar_utils import avatar_manager


def get_avatar_stats():
    """Get statistics about avatar storage."""
    avatar_dir = avatar_manager.upload_dir

    if not avatar_dir.exists():
        return {
            "directory": str(avatar_dir),
            "exists": False,
            "total_files": 0,
            "total_size": 0,
            "size_human": "0 B"
        }

    avatar_files = list(avatar_dir.glob("*.jpg"))
    total_size = sum(f.stat().st_size for f in avatar_files if f.exists())

    # Human readable size
    def human_size(size_bytes):
        for unit in ['B', 'KB', 'MB', 'GB']:
            if size_bytes < 1024.0:
                return f"{size_bytes:.1f} {unit}"
            size_bytes /= 1024.0
        return f"{size_bytes:.1f} TB"

    return {
        "directory": str(avatar_dir),
        "exists": True,
        "total_files": len(avatar_files),
        "total_size": total_size,
        "size_human": human_size(total_size)
    }


def find_orphaned_avatars(dry_run=False):
    """Find and optionally remove orphaned avatar files."""
    print("🔍 Finding orphaned avatar files...")
    print("=" * 50)

    # Get all avatar files
    avatar_dir = avatar_manager.upload_dir
    if not avatar_dir.exists():
        print("ℹ️  Avatar directory doesn't exist")
        return 0

    avatar_files = list(avatar_dir.glob("*.jpg"))
    if not avatar_files:
        print("ℹ️  No avatar files found")
        return 0

    print(f"Found {len(avatar_files)} avatar files")

    # Get all users with avatars from database
    db = next(get_db())
    try:
        users_with_avatars = db.query(User).filter(User.avatar_filename.isnot(None)).all()
        valid_filenames = {user.avatar_filename for user in users_with_avatars}

        print(f"Found {len(valid_filenames)} users with avatar records")
        print()

        # Find orphaned files
        orphaned_files = []
        for avatar_file in avatar_files:
            if avatar_file.name not in valid_filenames:
                orphaned_files.append(avatar_file)

        if not orphaned_files:
            print("✅ No orphaned avatar files found")
            return 0

        print(f"Found {len(orphaned_files)} orphaned avatar files:")

        total_size = 0
        for orphaned_file in orphaned_files:
            file_size = orphaned_file.stat().st_size
            total_size += file_size
            file_age = datetime.now() - datetime.fromtimestamp(orphaned_file.stat().st_mtime)

            print(f"  📁 {orphaned_file.name}")
            print(f"     Size: {file_size:,} bytes")
            print(f"     Age: {file_age.days} days")

            if dry_run:
                print(f"     🔍 [DRY RUN] Would delete")
            else:
                try:
                    orphaned_file.unlink()
                    print(f"     ✅ Deleted")
                except Exception as e:
                    print(f"     ❌ Error deleting: {e}")
            print()

        print(f"📊 Summary:")
        print(f"   Orphaned files: {len(orphaned_files)}")
        print(f"   Total size: {total_size:,} bytes ({total_size/1024/1024:.1f} MB)")

        if dry_run:
            print(f"   🔍 [DRY RUN] Files would be deleted")
        else:
            print(f"   ✅ Files deleted")

        return len(orphaned_files)

    finally:
        db.close()


def cleanup_old_avatars(keep_latest=1, dry_run=False):
    """Clean up old avatars for all users."""
    print(f"🧹 Cleaning up old avatars (keeping {keep_latest} latest per user)...")
    print("=" * 60)

    # Get all users with avatars
    db = next(get_db())
    try:
        users_with_avatars = db.query(User).filter(User.avatar_filename.isnot(None)).all()

        if not users_with_avatars:
            print("ℹ️  No users with avatars found")
            return 0

        print(f"Processing {len(users_with_avatars)} users with avatars...")
        print()

        total_deleted = 0

        for user in users_with_avatars:
            print(f"👤 User: {user.username}")

            # Find all avatars for this user
            user_avatars = avatar_manager.find_user_avatars(user.username)

            if len(user_avatars) <= keep_latest:
                print(f"   ✅ Only {len(user_avatars)} avatar(s), nothing to clean")
                print()
                continue

            # Sort by modification time (newest first)
            user_avatars.sort(key=lambda p: p.stat().st_mtime, reverse=True)

            files_to_delete = user_avatars[keep_latest:]
            print(f"   📁 Found {len(user_avatars)} avatars, deleting {len(files_to_delete)} old ones")

            for old_avatar in files_to_delete:
                file_age = datetime.now() - datetime.fromtimestamp(old_avatar.stat().st_mtime)
                file_size = old_avatar.stat().st_size

                print(f"      🗑️  {old_avatar.name}")
                print(f"         Age: {file_age.days} days, Size: {file_size:,} bytes")

                if dry_run:
                    print(f"         🔍 [DRY RUN] Would delete")
                else:
                    try:
                        old_avatar.unlink()
                        print(f"         ✅ Deleted")
                        total_deleted += 1
                    except Exception as e:
                        print(f"         ❌ Error deleting: {e}")

            print()

        print(f"📊 Summary:")
        print(f"   Total files deleted: {total_deleted}")

        return total_deleted

    finally:
        db.close()


def cleanup_user_avatars(username, keep_latest=1, dry_run=False):
    """Clean up avatars for a specific user."""
    print(f"🧹 Cleaning up avatars for user: {username}")
    print("=" * 50)

    # Check if user exists
    db = next(get_db())
    try:
        user = db.query(User).filter(User.username == username).first()
        if not user:
            print(f"❌ User '{username}' not found")
            return 0

        print(f"👤 User found: {user.username} (ID: {user.id})")

        if user.avatar_filename:
            print(f"📁 Current avatar: {user.avatar_filename}")
        else:
            print("📁 No current avatar in database")

        # Find all avatars for this user
        user_avatars = avatar_manager.find_user_avatars(username)

        if not user_avatars:
            print("ℹ️  No avatar files found for this user")
            return 0

        print(f"📁 Found {len(user_avatars)} avatar file(s)")

        if len(user_avatars) <= keep_latest:
            print(f"✅ Only {len(user_avatars)} avatar(s), nothing to clean")
            return 0

        # Sort by modification time (newest first)
        user_avatars.sort(key=lambda p: p.stat().st_mtime, reverse=True)

        files_to_delete = user_avatars[keep_latest:]

        print(f"🗑️  Will delete {len(files_to_delete)} old avatar(s):")
        print()

        deleted_count = 0
        for old_avatar in files_to_delete:
            file_age = datetime.now() - datetime.fromtimestamp(old_avatar.stat().st_mtime)
            file_size = old_avatar.stat().st_size

            print(f"   📄 {old_avatar.name}")
            print(f"      Age: {file_age.days} days")
            print(f"      Size: {file_size:,} bytes")

            if dry_run:
                print(f"      🔍 [DRY RUN] Would delete")
            else:
                try:
                    old_avatar.unlink()
                    print(f"      ✅ Deleted successfully")
                    deleted_count += 1
                except Exception as e:
                    print(f"      ❌ Error deleting: {e}")
            print()

        print(f"📊 Summary: {deleted_count} files deleted")
        return deleted_count

    finally:
        db.close()


def show_stats():
    """Show avatar storage statistics."""
    print("📊 Avatar Storage Statistics")
    print("=" * 40)

    avatar_dir = avatar_manager.upload_dir

    print(f"Directory: {avatar_dir}")
    print(f"Exists: {avatar_dir.exists()}")

    if not avatar_dir.exists():
        print("❌ Avatar directory doesn't exist")
        return

    avatar_files = list(avatar_dir.glob("*.jpg"))
    total_size = sum(f.stat().st_size for f in avatar_files if f.exists())

    # Human readable size
    def human_size(size_bytes):
        for unit in ['B', 'KB', 'MB', 'GB']:
            if size_bytes < 1024.0:
                return f"{size_bytes:.1f} {unit}"
            size_bytes /= 1024.0
        return f"{size_bytes:.1f} TB"

    print(f"Total files: {len(avatar_files):,}")
    print(f"Total size: {total_size:,} bytes ({human_size(total_size)})")

    # Get database stats
    db = next(get_db())
    try:
        total_users = db.query(User).count()
        users_with_avatars = db.query(User).filter(User.avatar_filename.isnot(None)).count()

        print(f"Total users: {total_users:,}")
        print(f"Users with avatars: {users_with_avatars:,}")
        print(f"Avatar coverage: {(users_with_avatars/total_users*100) if total_users > 0 else 0:.1f}%")
    finally:
        db.close()


def main():
    """Main function."""
    parser = argparse.ArgumentParser(description="Avatar cleanup utilities")

    subparsers = parser.add_subparsers(dest="command", help="Available commands")

    # Stats command
    subparsers.add_parser("stats", help="Show avatar storage statistics")

    # Orphaned command
    orphaned_parser = subparsers.add_parser("orphaned", help="Remove orphaned avatar files")
    orphaned_parser.add_argument("--dry-run", action="store_true", help="Show what would be deleted without deleting")

    # Old avatars command
    old_parser = subparsers.add_parser("old-avatars", help="Clean up old avatars")
    old_parser.add_argument("--keep", type=int, default=1, help="Number of latest avatars to keep per user (default: 1)")
    old_parser.add_argument("--dry-run", action="store_true", help="Show what would be deleted without deleting")

    # User command
    user_parser = subparsers.add_parser("user", help="Clean up avatars for specific user")
    user_parser.add_argument("--username", required=True, help="Username to clean up")
    user_parser.add_argument("--keep", type=int, default=1, help="Number of latest avatars to keep (default: 1)")
    user_parser.add_argument("--dry-run", action="store_true", help="Show what would be deleted without deleting")

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        return

    print(f"🛠️  Avatar Cleanup Tool")
    print(f"📁 Avatar directory: {avatar_manager.upload_dir}")
    print()

    if args.command == "stats":
        show_stats()

    elif args.command == "orphaned":
        if hasattr(args, 'dry_run') and args.dry_run:
            print("🔍 Running in DRY RUN mode - no files will be deleted")
            print()
        find_orphaned_avatars(dry_run=getattr(args, 'dry_run', False))

    elif args.command == "old-avatars":
        if hasattr(args, 'dry_run') and args.dry_run:
            print("🔍 Running in DRY RUN mode - no files will be deleted")
            print()
        cleanup_old_avatars(keep_latest=args.keep, dry_run=getattr(args, 'dry_run', False))

    elif args.command == "user":
        if hasattr(args, 'dry_run') and args.dry_run:
            print("🔍 Running in DRY RUN mode - no files will be deleted")
            print()
        cleanup_user_avatars(args.username, keep_latest=args.keep, dry_run=getattr(args, 'dry_run', False))


if __name__ == "__main__":
    main()