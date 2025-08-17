#!/usr/bin/env python3
"""
Test script for admin functionality with specialized premium users.
"""

from datetime import UTC, datetime

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from config import settings
from models import User
from routers.admin import build_admin_user_response
from schemas import AdminUserUpdate


def test_admin_user_response():
    """Test that AdminUserResponse includes all specialized premium fields."""
    print("🔍 Testing AdminUserResponse with specialized premium fields...")

    try:
        engine = create_engine(settings.SQLALCHEMY_DATABASE_URL)
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        session = SessionLocal()

        # Create a test specialized premium user
        test_user = User(
            username="admin_test_user",
            email="admin_test@example.com",
            hashed_password="dummy_hash",  # nosec B106 # Test password
            number_of_free_turns=2,
            number_of_paid_turns=10,
            last_free_turns_reset=datetime.now(UTC),
            subscription_status="active",
            is_specialized_premium=True,
            is_admin=False,
        )
        session.add(test_user)
        session.commit()

        print("   ✅ Test specialized premium user created")

        # Test building AdminUserResponse
        admin_response = build_admin_user_response(test_user)

        # Verify all fields are present
        assert admin_response.id == test_user.id
        assert admin_response.username == test_user.username
        assert admin_response.email == test_user.email
        assert admin_response.is_specialized_premium is True
        assert admin_response.total_turns == -1  # Should be unlimited
        assert admin_response.subscription_status == "active"
        assert admin_response.number_of_free_turns == 2
        assert admin_response.number_of_paid_turns == 10

        print("   ✅ AdminUserResponse includes all specialized premium fields")
        print(f"   ✅ Total turns: {admin_response.total_turns} (unlimited)")
        print(f"   ✅ Specialized premium: {admin_response.is_specialized_premium}")
        print(f"   ✅ Subscription status: {admin_response.subscription_status}")

        # Test AdminUserUpdate schema
        update_data = AdminUserUpdate(is_specialized_premium=False, username="updated_user")

        # Apply the update
        update_dict = update_data.model_dump(exclude_unset=True)
        for field, value in update_dict.items():
            setattr(test_user, field, value)

        session.commit()
        session.refresh(test_user)

        # Verify the update worked
        updated_response = build_admin_user_response(test_user)
        assert updated_response.is_specialized_premium is False
        assert updated_response.username == "updated_user"
        assert updated_response.total_turns == 12  # Should be free + paid turns now

        print("   ✅ AdminUserUpdate works with specialized premium field")
        print(f"   ✅ Updated specialized premium: {updated_response.is_specialized_premium}")
        print(f"   ✅ Updated total turns: {updated_response.total_turns}")

        # Clean up
        session.delete(test_user)
        session.commit()
        session.close()

        print("✅ Admin specialized premium test passed!")
        assert True

    except Exception as e:
        print(f"❌ Admin specialized premium test failed: {e}")
        raise AssertionError(f"Admin specialized premium test failed: {e}")


def main():
    """Run the admin specialized premium test."""
    print("🚀 Testing Admin Specialized Premium Functionality\n")

    success = test_admin_user_response()

    if success:
        print("\n🎉 All admin tests passed!")
    else:
        print("\n🔧 Admin tests failed.")

    return success


if __name__ == "__main__":
    import sys

    success = main()
    sys.exit(0 if success else 1)
