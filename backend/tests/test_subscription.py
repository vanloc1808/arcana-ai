import os
os.environ["MAIL_FROM"] = "test@example.com"
from config import settings
from services.subscription_service import SubscriptionService
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine
from datetime import datetime, UTC
from sqlalchemy import Column, Integer, String, DateTime
from models import User
import pytest

Base = declarative_base()

@pytest.mark.usefixtures("db_session")
def test_specialized_premium_users(db_session):
    """Test specialized premium user functionality."""
    print("🔍 Testing specialized premium users...")

    # Clean up any existing test user with the same email
    db_session.query(User).filter(User.email == "specialized@test.com").delete(synchronize_session=False)
    db_session.commit()

    # Create a test user
    test_user = User(
        username="specialized_test_user",
        email="specialized@test.com",
        hashed_password="dummy_hash",  # nosec B106 # Test password
        number_of_free_turns=3,
        number_of_paid_turns=0,
        last_free_turns_reset=datetime.now(UTC),
        subscription_status="none",
        is_specialized_premium=True,  # Set specialized premium
    )
    db_session.add(test_user)
    db_session.commit()
    db_session.refresh(test_user)


@pytest.mark.usefixtures("db_session")
def test_consume_user_turn_usage_context(db_session):
    """Test that usage_context is stored correctly for each context."""
    print("🔍 Testing usage_context in consume_user_turn...")
    service = SubscriptionService()

    # Clean up any existing test user with the same email
    db_session.query(User).filter(User.email == "context_test@subscription.com").delete(synchronize_session=False)
    db_session.commit()

    # Create a test user
    test_user = User(
        username="context_test_user",
        email="context_test@subscription.com",
        hashed_password="test_hash_for_context",  # nosec B106
        number_of_free_turns=3,
        number_of_paid_turns=0,
        last_free_turns_reset=datetime.now(UTC),
        subscription_status="none",
    )
    db_session.add(test_user)
    db_session.commit()
    db_session.refresh(test_user)

    turn_result = service.consume_user_turn(db_session, test_user, usage_context='subscription')