#!/usr/bin/env python3
"""
Script to set last_free_turns_reset to NULL for all users.
This is useful for testing the monthly free turns reset functionality.

Usage:
    python set_last_free_turns_reset_to_null.py
"""

import os
import sys
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

# Set minimal environment variables to prevent validation errors
os.environ.setdefault("MAIL_FROM", "test@example.com")
os.environ.setdefault("MAIL_PASSWORD", "test")
os.environ.setdefault("MAIL_SERVER", "localhost")

# Add the backend directory to the Python path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

# Import models after path setup
from models import User  # noqa: E402

# Create database connection directly
database_path = backend_dir / "tarot.db"
SQLALCHEMY_DATABASE_URL = f"sqlite:///{database_path}"
engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def main():
    """Set last_free_turns_reset to NULL for all users."""
    print("🔄 Setting last_free_turns_reset to NULL for all users...")
    print("   This will allow testing the monthly reset functionality.")
    print()

    # Confirm the action
    confirmation = input("⚠️  Are you sure you want to proceed? (yes/no): ").lower().strip()
    if confirmation not in ["yes", "y"]:
        print("❌ Operation cancelled.")
        return

    # Create database session
    session = SessionLocal()

    try:
        # Get all users
        users = session.query(User).all()
        total_users = len(users)

        if total_users == 0:
            print("📭 No users found in the database.")
            return

        print(f"📊 Found {total_users} users")
        print()

        # Update each user
        updated_count = 0
        already_null_count = 0

        for user in users:
            if user.last_free_turns_reset is None:
                already_null_count += 1
                print(f"   ⏭️  User {user.username} (ID: {user.id}) - already NULL")
            else:
                original_value = user.last_free_turns_reset
                user.last_free_turns_reset = None
                updated_count += 1
                print(f"   ✅ User {user.username} (ID: {user.id}) - set to NULL (was: {original_value})")

        # Commit changes
        session.commit()

        print()
        print("📈 Summary:")
        print(f"   Total users: {total_users}")
        print(f"   Updated: {updated_count}")
        print(f"   Already NULL: {already_null_count}")
        print()

        if updated_count > 0:
            print("✅ Successfully updated last_free_turns_reset to NULL!")
            print("🧪 You can now test the monthly reset functionality.")
            print("   All users should be reset (not skipped) on the next monthly reset run.")
        else:
            print("ℹ️  All users already had NULL values - no changes needed.")

    except Exception as e:
        session.rollback()
        print(f"❌ Error updating users: {str(e)}")
        raise
    finally:
        session.close()


if __name__ == "__main__":
    main()