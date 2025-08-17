#!/usr/bin/env python3
"""
Script to manage specialized premium users.

This script allows you to grant or revoke specialized premium access for users.
Specialized premium users have unlimited tarot reading turns.
"""

import argparse
import sys
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add the parent directory to the path to import the backend modules
sys.path.append(str(Path(__file__).parent.parent))

from config import settings  # noqa: E402
from models import User  # noqa: E402


def create_session():
    """Create a database session."""
    engine = create_engine(settings.SQLALCHEMY_DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    return SessionLocal()


def grant_specialized_premium(email: str) -> bool:
    """Grant specialized premium access to a user.

    Args:
        email (str): User's email address

    Returns:
        bool: True if successful, False otherwise
    """
    db = create_session()
    try:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            print(f"❌ User with email '{email}' not found.")
            return False

        if user.is_specialized_premium:
            print(f"✅ User '{email}' already has specialized premium access.")
            return True

        user.is_specialized_premium = True
        db.commit()
        print(f"✅ Granted specialized premium access to '{email}'.")
        return True

    except Exception as e:
        print(f"❌ Error granting specialized premium access: {e}")
        db.rollback()
        return False
    finally:
        db.close()


def revoke_specialized_premium(email: str) -> bool:
    """Revoke specialized premium access from a user.

    Args:
        email (str): User's email address

    Returns:
        bool: True if successful, False otherwise
    """
    db = create_session()
    try:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            print(f"❌ User with email '{email}' not found.")
            return False

        if not user.is_specialized_premium:
            print(f"✅ User '{email}' does not have specialized premium access.")
            return True

        user.is_specialized_premium = False
        db.commit()
        print(f"✅ Revoked specialized premium access from '{email}'.")
        return True

    except Exception as e:
        print(f"❌ Error revoking specialized premium access: {e}")
        db.rollback()
        return False
    finally:
        db.close()


def list_specialized_premium_users() -> bool:
    """List all users with specialized premium access.

    Returns:
        bool: True if successful, False otherwise
    """
    db = create_session()
    try:
        users = db.query(User).filter(User.is_specialized_premium.is_(True)).all()

        if not users:
            print("📝 No users with specialized premium access found.")
            return True

        print(f"👑 Found {len(users)} specialized premium user(s):")
        print("-" * 60)
        for user in users:
            print(f"• {user.email} (ID: {user.id}) - {user.username}")
        print("-" * 60)
        return True

    except Exception as e:
        print(f"❌ Error listing specialized premium users: {e}")
        return False
    finally:
        db.close()


def check_user_status(email: str) -> bool:
    """Check a user's specialized premium status.

    Args:
        email (str): User's email address

    Returns:
        bool: True if successful, False otherwise
    """
    db = create_session()
    try:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            print(f"❌ User with email '{email}' not found.")
            return False

        print(f"📊 User Status for '{email}':")
        print(f"   Username: {user.username}")
        print(f"   ID: {user.id}")
        print(f"   Specialized Premium: {'Yes' if user.is_specialized_premium else 'No'}")
        print(f"   Free Turns: {user.number_of_free_turns}")
        print(f"   Paid Turns: {user.number_of_paid_turns}")
        print(f"   Total Turns: {'Unlimited' if user.is_specialized_premium else user.get_total_turns()}")
        print(f"   Subscription Status: {user.subscription_status}")
        print(f"   Is Admin: {'Yes' if user.is_admin else 'No'}")
        return True

    except Exception as e:
        print(f"❌ Error checking user status: {e}")
        return False
    finally:
        db.close()


def main():
    """Main function to handle command-line arguments."""
    parser = argparse.ArgumentParser(
        description="Manage specialized premium users",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python manage_specialized_premium.py grant user@example.com
  python manage_specialized_premium.py revoke user@example.com
  python manage_specialized_premium.py list
  python manage_specialized_premium.py status user@example.com
        """,
    )

    parser.add_argument("action", choices=["grant", "revoke", "list", "status"], help="Action to perform")

    parser.add_argument("email", nargs="?", help="User email (required for grant, revoke, and status actions)")

    args = parser.parse_args()

    if args.action in ["grant", "revoke", "status"] and not args.email:
        parser.error(f"Email is required for '{args.action}' action")

    print("🎯 Specialized Premium User Management")
    print("=" * 40)

    if args.action == "grant":
        success = grant_specialized_premium(args.email)
    elif args.action == "revoke":
        success = revoke_specialized_premium(args.email)
    elif args.action == "list":
        success = list_specialized_premium_users()
    elif args.action == "status":
        success = check_user_status(args.email)
    else:
        print(f"❌ Unknown action: {args.action}")
        success = False

    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
