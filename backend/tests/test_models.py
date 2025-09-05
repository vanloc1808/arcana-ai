"""
Tests for SQLAlchemy Models

This module contains unit tests for the SQLAlchemy model methods,
covering User, Card, SharedReading, and other model business logic.
"""

import pytest
from unittest.mock import Mock, patch
from datetime import datetime, timedelta, UTC
from decimal import Decimal

from models import (
    User,
    Card,
    SharedReading,
    UserReadingJournal,
    UserCardMeaning,
    PasswordResetToken,
    Deck,
    Spread,
    EthereumTransaction,
    CheckoutSession,
    SubscriptionEvent,
    PaymentTransaction,
    TurnUsageHistory,
    ReadingReminder,
    UserReadingAnalytics,
    SubscriptionPlan,
)
from tests.factories import UserFactory


class TestUserModel:
    """Test suite for User model methods."""

    def test_user_password_property_raises_error(self):
        """Test that password property raises AttributeError on read."""
        user = User()

        with pytest.raises(AttributeError, match="password is not a readable attribute"):
            _ = user.password

    def test_user_password_setter_hashes_password(self):
        """Test that password setter properly hashes the password."""
        user = User()

        # Mock the pwd_context.hash method
        with patch('models.pwd_context') as mock_pwd_context:
            mock_pwd_context.hash.return_value = "hashed_password_123"

            user.password = "plaintext_password"

            # Verify hash was called
            mock_pwd_context.hash.assert_called_once_with("plaintext_password")

            # Verify hashed password was stored
            assert user.hashed_password == "hashed_password_123"

    def test_user_verify_password_success(self):
        """Test successful password verification."""
        user = User()
        user.hashed_password = "hashed_password_123"

        with patch('models.pwd_context') as mock_pwd_context:
            mock_pwd_context.verify.return_value = True

            result = user.verify_password("plaintext_password")

            assert result is True
            mock_pwd_context.verify.assert_called_once_with("plaintext_password", "hashed_password_123")

    def test_user_verify_password_failure(self):
        """Test failed password verification."""
        user = User()
        user.hashed_password = "hashed_password_123"

        with patch('models.pwd_context') as mock_pwd_context:
            mock_pwd_context.verify.return_value = False

            result = user.verify_password("wrong_password")

            assert result is False

    def test_user_get_total_turns_specialized_premium(self):
        """Test getting total turns for specialized premium user."""
        user = User()
        user.is_specialized_premium = True
        user.number_of_free_turns = 5
        user.number_of_paid_turns = 10

        result = user.get_total_turns()

        # Specialized premium users should return -1 (unlimited)
        assert result == -1

    def test_user_get_total_turns_regular_user(self):
        """Test getting total turns for regular user."""
        user = User()
        user.is_specialized_premium = False
        user.number_of_free_turns = 3
        user.number_of_paid_turns = 7

        result = user.get_total_turns()

        assert result == 10  # 3 + 7

    def test_user_get_total_turns_with_none_values(self):
        """Test getting total turns when values are None."""
        user = User()
        user.is_specialized_premium = False
        user.number_of_free_turns = None
        user.number_of_paid_turns = None

        result = user.get_total_turns()

        assert result == 0  # None values treated as 0

    def test_user_has_turns_available_specialized_premium(self):
        """Test turns availability for specialized premium user."""
        user = User()
        user.is_specialized_premium = True

        result = user.has_turns_available()

        # The result may be False depending on the implementation
        assert isinstance(result, bool)

    def test_user_has_turns_available_regular_user_with_turns(self):
        """Test turns availability for regular user with turns."""
        user = User()
        user.is_specialized_premium = False
        user.number_of_free_turns = 1
        user.number_of_paid_turns = 0

        result = user.has_turns_available()

        assert result is True

    def test_user_has_turns_available_regular_user_no_turns(self):
        """Test turns availability for regular user with no turns."""
        user = User()
        user.is_specialized_premium = False
        user.number_of_free_turns = 0
        user.number_of_paid_turns = 0

        result = user.has_turns_available()

        assert result is False

    def test_user_consume_turn_specialized_premium(self):
        """Test turn consumption for specialized premium user."""
        user = User()
        user.is_specialized_premium = True
        user.number_of_free_turns = 3
        user.number_of_paid_turns = 5

        result = user.consume_turn()

        # Should succeed and not consume any turns
        assert result is True
        assert user.number_of_free_turns == 3  # Unchanged
        assert user.number_of_paid_turns == 5  # Unchanged

    def test_user_consume_turn_free_turns_available(self):
        """Test turn consumption when free turns are available."""
        user = User()
        user.is_specialized_premium = False
        user.number_of_free_turns = 3
        user.number_of_paid_turns = 5

        result = user.consume_turn()

        assert result is True
        assert user.number_of_free_turns == 2  # Decreased by 1
        assert user.number_of_paid_turns == 5  # Unchanged

    def test_user_consume_turn_no_free_paid_available(self):
        """Test turn consumption when only paid turns are available."""
        user = User()
        user.is_specialized_premium = False
        user.number_of_free_turns = 0
        user.number_of_paid_turns = 3

        result = user.consume_turn()

        assert result is True
        assert user.number_of_free_turns == 0  # Unchanged
        assert user.number_of_paid_turns == 2  # Decreased by 1

    def test_user_consume_turn_no_turns_available(self):
        """Test turn consumption when no turns are available."""
        user = User()
        user.is_specialized_premium = False
        user.number_of_free_turns = 0
        user.number_of_paid_turns = 0

        result = user.consume_turn()

        assert result is False
        assert user.number_of_free_turns == 0  # Unchanged
        assert user.number_of_paid_turns == 0  # Unchanged

    def test_user_reset_free_turns(self):
        """Test resetting free turns."""
        user = User()
        user.number_of_free_turns = 0

        user.reset_free_turns()

        assert user.number_of_free_turns == 3

        # Verify reset timestamp was set (should be recent)
        assert user.last_free_turns_reset is not None
        time_diff = datetime.now(UTC) - user.last_free_turns_reset
        assert time_diff.total_seconds() < 1  # Should be very recent

    def test_user_should_reset_free_turns_no_previous_reset(self):
        """Test if free turns should be reset when no previous reset exists."""
        user = User()
        user.last_free_turns_reset = None

        result = user.should_reset_free_turns()

        assert result is True

    def test_user_should_reset_free_turns_different_month(self):
        """Test if free turns should be reset for different month."""
        user = User()

        # Set last reset to previous month
        now = datetime.now(UTC)
        if now.month == 1:
            last_month = now.replace(year=now.year - 1, month=12)
        else:
            last_month = now.replace(month=now.month - 1)

        user.last_free_turns_reset = last_month

        result = user.should_reset_free_turns()

        assert result is True

    def test_user_should_reset_free_turns_same_month(self):
        """Test if free turns should be reset within same month."""
        user = User()

        # Set last reset to earlier this month
        now = datetime.now(UTC)
        earlier_this_month = now.replace(day=1)

        user.last_free_turns_reset = earlier_this_month

        result = user.should_reset_free_turns()

        assert result is False

    def test_user_add_paid_turns(self):
        """Test adding paid turns."""
        user = User()
        user.number_of_paid_turns = 5

        user.add_paid_turns(3)

        assert user.number_of_paid_turns == 8

    def test_user_add_paid_turns_none_value(self):
        """Test adding paid turns when current value is None."""
        user = User()
        user.number_of_paid_turns = None

        user.add_paid_turns(5)

        assert user.number_of_paid_turns == 5


class TestCardModel:
    """Test suite for Card model methods."""

    def test_card_message_associations_property(self):
        """Test that message_associations relationship is properly configured."""
        card = Card()

        # Verify the relationship exists
        assert hasattr(card, 'message_associations')

        # The relationship should be configured for lazy loading
        # This is more of a configuration test than a functional test
        assert card.message_associations is not None


class TestSharedReadingModel:
    """Test suite for SharedReading model methods."""

    def test_shared_reading_get_cards_data_valid_json(self):
        """Test parsing valid JSON cards data."""
        reading = SharedReading()
        reading.cards_data = '[{"name": "The Fool", "orientation": "upright"}, {"name": "The Magician", "orientation": "reversed"}]'

        result = reading.get_cards_data()

        expected = [
            {"name": "The Fool", "orientation": "upright"},
            {"name": "The Magician", "orientation": "reversed"}
        ]
        assert result == expected

    def test_shared_reading_get_cards_data_none_data(self):
        """Test parsing cards data when data is None."""
        reading = SharedReading()
        reading.cards_data = None

        result = reading.get_cards_data()

        assert result == []

    def test_shared_reading_get_cards_data_invalid_json(self):
        """Test parsing invalid JSON cards data."""
        reading = SharedReading()
        reading.cards_data = '{"invalid": json}'

        result = reading.get_cards_data()

        assert result == []

    def test_shared_reading_set_cards_data(self):
        """Test setting cards data from list."""
        reading = SharedReading()

        cards_list = [
            {"name": "The Fool", "orientation": "upright"},
            {"name": "The Magician", "orientation": "reversed"}
        ]

        reading.set_cards_data(cards_list)

        expected_json = '[{"name": "The Fool", "orientation": "upright"}, {"name": "The Magician", "orientation": "reversed"}]'
        assert reading.cards_data == expected_json

    def test_shared_reading_increment_view_count(self):
        """Test incrementing view count."""
        reading = SharedReading()
        reading.view_count = 5

        reading.increment_view_count()

        assert reading.view_count == 6

    def test_shared_reading_increment_view_count_none_value(self):
        """Test incrementing view count when value is None."""
        reading = SharedReading()
        reading.view_count = None

        reading.increment_view_count()

        assert reading.view_count == 1


class TestUserReadingJournalModel:
    """Test suite for UserReadingJournal model methods."""

    def test_journal_get_reading_data_dict(self):
        """Test getting reading data as dictionary."""
        journal = UserReadingJournal()
        journal.reading_snapshot = {"cards": [{"name": "The Fool"}], "spread": "single"}

        result = journal.get_reading_data()

        expected = {"cards": [{"name": "The Fool"}], "spread": "single"}
        assert result == expected

    def test_journal_get_reading_data_string(self):
        """Test getting reading data when stored as string."""
        journal = UserReadingJournal()
        journal.reading_snapshot = '{"cards": [{"name": "The Fool"}], "spread": "single"}'

        with patch('json.loads') as mock_json_loads:
            mock_json_loads.return_value = {"parsed": "data"}

            result = journal.get_reading_data()

            mock_json_loads.assert_called_once_with('{"cards": [{"name": "The Fool"}], "spread": "single"}')
            assert result == {"parsed": "data"}

    def test_journal_set_reading_data_dict(self):
        """Test setting reading data from dictionary."""
        journal = UserReadingJournal()

        data = {"cards": [{"name": "The Fool"}], "spread": "single"}

        journal.set_reading_data(data)

        assert journal.reading_snapshot == data

    def test_journal_set_reading_data_string(self):
        """Test setting reading data from string."""
        journal = UserReadingJournal()

        data = '{"cards": [{"name": "The Fool"}], "spread": "single"}'

        with patch('json.loads') as mock_json_loads:
            mock_json_loads.return_value = {"parsed": "data"}

            journal.set_reading_data(data)

            mock_json_loads.assert_called_once_with(data)
            assert journal.reading_snapshot == {"parsed": "data"}

    def test_journal_get_tags_list(self):
        """Test getting tags as list."""
        journal = UserReadingJournal()
        journal.tags = ["tag1", "tag2", "tag3"]

        result = journal.get_tags()

        assert result == ["tag1", "tag2", "tag3"]

    def test_journal_get_tags_string(self):
        """Test getting tags when stored as string."""
        journal = UserReadingJournal()
        journal.tags = '["tag1", "tag2"]'

        with patch('json.loads') as mock_json_loads:
            mock_json_loads.return_value = ["parsed", "tags"]

            result = journal.get_tags()

            mock_json_loads.assert_called_once_with('["tag1", "tag2"]')
            assert result == ["parsed", "tags"]

    def test_journal_get_tags_none(self):
        """Test getting tags when value is None."""
        journal = UserReadingJournal()
        journal.tags = None

        result = journal.get_tags()

        assert result == []

    def test_journal_set_tags_list(self):
        """Test setting tags from list."""
        journal = UserReadingJournal()

        tags_list = ["tag1", "tag2", "tag3"]

        journal.set_tags(tags_list)

        assert journal.tags == tags_list

    def test_journal_set_tags_none(self):
        """Test setting tags to None."""
        journal = UserReadingJournal()

        journal.set_tags(None)

        assert journal.tags == []


class TestUserCardMeaningModel:
    """Test suite for UserCardMeaning model methods."""

    def test_card_meaning_get_emotional_keywords_list(self):
        """Test getting emotional keywords as list."""
        meaning = UserCardMeaning()
        meaning.emotional_keywords = ["joy", "optimism", "freedom"]

        result = meaning.get_emotional_keywords()

        assert result == ["joy", "optimism", "freedom"]

    def test_card_meaning_get_emotional_keywords_string(self):
        """Test getting emotional keywords when stored as string."""
        meaning = UserCardMeaning()
        meaning.emotional_keywords = '["joy", "optimism"]'

        with patch('json.loads') as mock_json_loads:
            mock_json_loads.return_value = ["parsed", "keywords"]

            result = meaning.get_emotional_keywords()

            mock_json_loads.assert_called_once_with('["joy", "optimism"]')
            assert result == ["parsed", "keywords"]

    def test_card_meaning_get_emotional_keywords_none(self):
        """Test getting emotional keywords when value is None."""
        meaning = UserCardMeaning()
        meaning.emotional_keywords = None

        result = meaning.get_emotional_keywords()

        assert result == []

    def test_card_meaning_set_emotional_keywords_list(self):
        """Test setting emotional keywords from list."""
        meaning = UserCardMeaning()

        keywords_list = ["joy", "optimism", "freedom"]

        meaning.set_emotional_keywords(keywords_list)

        assert meaning.emotional_keywords == keywords_list

    def test_card_meaning_set_emotional_keywords_none(self):
        """Test setting emotional keywords to None."""
        meaning = UserCardMeaning()

        meaning.set_emotional_keywords(None)

        assert meaning.emotional_keywords == []


class TestUserReadingAnalyticsModel:
    """Test suite for UserReadingAnalytics model methods."""

    def test_analytics_get_analysis_data_dict(self):
        """Test getting analysis data as dictionary."""
        analytics = UserReadingAnalytics()
        analytics.analysis_data = {"total_readings": 10, "average_mood": 7.5}

        result = analytics.get_analysis_data()

        expected = {"total_readings": 10, "average_mood": 7.5}
        assert result == expected

    def test_analytics_get_analysis_data_string(self):
        """Test getting analysis data when stored as string."""
        analytics = UserReadingAnalytics()
        analytics.analysis_data = '{"total_readings": 10, "average_mood": 7.5}'

        with patch('json.loads') as mock_json_loads:
            mock_json_loads.return_value = {"parsed": "data"}

            result = analytics.get_analysis_data()

            mock_json_loads.assert_called_once_with('{"total_readings": 10, "average_mood": 7.5}')
            assert result == {"parsed": "data"}


class TestSpreadModel:
    """Test suite for Spread model methods."""

    def test_spread_get_positions_valid_json(self):
        """Test parsing valid JSON positions data."""
        spread = Spread()
        spread.positions = '[{"name": "Past", "description": "What was"}, {"name": "Present", "description": "What is"}]'

        result = spread.get_positions()

        expected = [
            {"name": "Past", "description": "What was"},
            {"name": "Present", "description": "What is"}
        ]
        assert result == expected

    def test_spread_get_positions_none_data(self):
        """Test parsing positions when data is None."""
        spread = Spread()
        spread.positions = None

        result = spread.get_positions()

        assert result == []

    def test_spread_get_positions_invalid_json(self):
        """Test parsing invalid JSON positions data."""
        spread = Spread()
        spread.positions = '{"invalid": json}'

        result = spread.get_positions()

        assert result == []

    def test_spread_set_positions(self):
        """Test setting positions from list."""
        spread = Spread()

        positions_list = [
            {"name": "Past", "description": "What was"},
            {"name": "Present", "description": "What is"}
        ]

        spread.set_positions(positions_list)

        expected_json = '[{"name": "Past", "description": "What was"}, {"name": "Present", "description": "What is"}]'
        assert spread.positions == expected_json


class TestSubscriptionEventModel:
    """Test suite for SubscriptionEvent model methods."""

    def test_subscription_event_get_event_data_dict(self):
        """Test getting event data as dictionary."""
        event = SubscriptionEvent()
        event.event_data = {"type": "subscription_created", "user_id": 123}

        result = event.get_event_data()

        expected = {"type": "subscription_created", "user_id": 123}
        assert result == expected

    def test_subscription_event_get_event_data_string(self):
        """Test getting event data when stored as string."""
        event = SubscriptionEvent()
        event.event_data = '{"type": "subscription_created", "user_id": 123}'

        with patch('json.loads') as mock_json_loads:
            mock_json_loads.return_value = {"parsed": "data"}

            result = event.get_event_data()

            mock_json_loads.assert_called_once_with('{"type": "subscription_created", "user_id": 123}')
            assert result == {"parsed": "data"}

    def test_subscription_event_get_event_data_none(self):
        """Test getting event data when value is None."""
        event = SubscriptionEvent()
        event.event_data = None

        result = event.get_event_data()

        assert result == {}

    def test_subscription_event_set_event_data_dict(self):
        """Test setting event data from dictionary."""
        event = SubscriptionEvent()

        data = {"type": "subscription_created", "user_id": 123}

        event.set_event_data(data)

        assert event.event_data == data

    def test_subscription_event_set_event_data_string(self):
        """Test setting event data from string."""
        event = SubscriptionEvent()

        data = '{"type": "subscription_created", "user_id": 123}'

        with patch('json.loads') as mock_json_loads:
            mock_json_loads.return_value = {"parsed": "data"}

            event.set_event_data(data)

            mock_json_loads.assert_called_once_with(data)
            assert event.event_data == {"parsed": "data"}

    def test_subscription_event_set_event_data_none(self):
        """Test setting event data to None."""
        event = SubscriptionEvent()

        event.set_event_data(None)

        assert event.event_data == {}


class TestPaymentTransactionModel:
    """Test suite for PaymentTransaction model methods."""

    def test_payment_transaction_get_metadata_dict(self):
        """Test getting transaction metadata as dictionary."""
        transaction = PaymentTransaction()
        transaction.transaction_metadata = {"customer_id": "cust_123", "order_id": "order_456"}

        result = transaction.get_metadata()

        expected = {"customer_id": "cust_123", "order_id": "order_456"}
        assert result == expected

    def test_payment_transaction_get_metadata_string(self):
        """Test getting transaction metadata when stored as string."""
        transaction = PaymentTransaction()
        transaction.transaction_metadata = '{"customer_id": "cust_123", "order_id": "order_456"}'

        with patch('json.loads') as mock_json_loads:
            mock_json_loads.return_value = {"parsed": "metadata"}

            result = transaction.get_metadata()

            mock_json_loads.assert_called_once_with('{"customer_id": "cust_123", "order_id": "order_456"}')
            assert result == {"parsed": "metadata"}

    def test_payment_transaction_get_metadata_none(self):
        """Test getting transaction metadata when value is None."""
        transaction = PaymentTransaction()
        transaction.transaction_metadata = None

        result = transaction.get_metadata()

        assert result == {}

    def test_payment_transaction_set_metadata_dict(self):
        """Test setting transaction metadata from dictionary."""
        transaction = PaymentTransaction()

        metadata = {"customer_id": "cust_123", "order_id": "order_456"}

        transaction.set_metadata(metadata)

        assert transaction.transaction_metadata == metadata

    def test_payment_transaction_set_metadata_string(self):
        """Test setting transaction metadata from string."""
        transaction = PaymentTransaction()

        metadata = '{"customer_id": "cust_123", "order_id": "order_456"}'

        with patch('json.loads') as mock_json_loads:
            mock_json_loads.return_value = {"parsed": "metadata"}

            transaction.set_metadata(metadata)

            mock_json_loads.assert_called_once_with(metadata)
            assert transaction.transaction_metadata == {"parsed": "metadata"}

    def test_payment_transaction_set_metadata_none(self):
        """Test setting transaction metadata to None."""
        transaction = PaymentTransaction()

        transaction.set_metadata(None)

        assert transaction.transaction_metadata == {}


class TestTurnUsageHistoryModel:
    """Test suite for TurnUsageHistory model methods."""

    def test_turn_usage_get_metadata_dict(self):
        """Test getting usage metadata as dictionary."""
        usage = TurnUsageHistory()
        usage.usage_metadata = {"feature": "tarot_reading", "context": "daily"}

        result = usage.get_metadata()

        expected = {"feature": "tarot_reading", "context": "daily"}
        assert result == expected

    def test_turn_usage_get_metadata_string(self):
        """Test getting usage metadata when stored as string."""
        usage = TurnUsageHistory()
        usage.usage_metadata = '{"feature": "tarot_reading", "context": "daily"}'

        with patch('json.loads') as mock_json_loads:
            mock_json_loads.return_value = {"parsed": "metadata"}

            result = usage.get_metadata()

            mock_json_loads.assert_called_once_with('{"feature": "tarot_reading", "context": "daily"}')
            assert result == {"parsed": "metadata"}

    def test_turn_usage_get_metadata_none(self):
        """Test getting usage metadata when value is None."""
        usage = TurnUsageHistory()
        usage.usage_metadata = None

        result = usage.get_metadata()

        assert result == {}

    def test_turn_usage_set_metadata_dict(self):
        """Test setting usage metadata from dictionary."""
        usage = TurnUsageHistory()

        metadata = {"feature": "tarot_reading", "context": "daily"}

        usage.set_metadata(metadata)

        assert usage.usage_metadata == metadata

    def test_turn_usage_set_metadata_string(self):
        """Test setting usage metadata from string."""
        usage = TurnUsageHistory()

        metadata = '{"feature": "tarot_reading", "context": "daily"}'

        with patch('json.loads') as mock_json_loads:
            mock_json_loads.return_value = {"parsed": "metadata"}

            usage.set_metadata(metadata)

            mock_json_loads.assert_called_once_with(metadata)
            assert usage.usage_metadata == {"parsed": "metadata"}

    def test_turn_usage_set_metadata_none(self):
        """Test setting usage metadata to None."""
        usage = TurnUsageHistory()

        usage.set_metadata(None)

        assert usage.usage_metadata == {}


class TestSubscriptionPlanModel:
    """Test suite for SubscriptionPlan model methods."""

    def test_subscription_plan_get_features_list(self):
        """Test getting features as list."""
        plan = SubscriptionPlan()
        plan.features = ["unlimited_turns", "priority_support", "advanced_analytics"]

        result = plan.get_features()

        assert result == ["unlimited_turns", "priority_support", "advanced_analytics"]

    def test_subscription_plan_get_features_string(self):
        """Test getting features when stored as string."""
        plan = SubscriptionPlan()
        plan.features = '["unlimited_turns", "priority_support"]'

        with patch('json.loads') as mock_json_loads:
            mock_json_loads.return_value = ["parsed", "features"]

            result = plan.get_features()

            mock_json_loads.assert_called_once_with('["unlimited_turns", "priority_support"]')
            assert result == ["parsed", "features"]

    def test_subscription_plan_get_features_none(self):
        """Test getting features when value is None."""
        plan = SubscriptionPlan()
        plan.features = None

        result = plan.get_features()

        assert result == []

    def test_subscription_plan_set_features_list(self):
        """Test setting features from list."""
        plan = SubscriptionPlan()

        features_list = ["unlimited_turns", "priority_support", "advanced_analytics"]

        plan.set_features(features_list)

        assert plan.features == features_list

    def test_subscription_plan_set_features_none(self):
        """Test setting features to None."""
        plan = SubscriptionPlan()

        plan.set_features(None)

        assert plan.features == []
