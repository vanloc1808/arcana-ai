from datetime import UTC

import bcrypt
from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from .base import Base, _prepare_password


class User(Base):
    """Represents a user in the system.

    Attributes:
        id (int): Primary key.
        email (str): Unique email address of the user.
        username (str): Unique username.
        hashed_password (str): Hashed password for authentication.
        full_name (str): Optional full name of the user.
        created_at (datetime): Timestamp of user creation.
        is_active (bool): Whether the user is active.
        is_deleted (bool): Whether the user is soft-deleted.
        is_admin (bool): Whether the user has admin privileges.
        favorite_deck_id (int): Foreign key to the user's favorite deck.
        bio (str): Optional short biography shown on the user's profile.
        timezone (str): Optional IANA timezone name for the user.
        lunar_phase_awareness (bool): Whether readings are colored by the current moon phase.
        card_animations (str): Card reveal animation preference (cinematic, minimal, off).
        reading_language (str): Preferred language for generated interpretations.
        reversed_cards (bool): Whether cards may appear reversed in spreads.
        chat_sessions (list[ChatSession]): Related chat sessions.
        favorite_deck (Deck): The user's favorite deck.
        shared_readings (list[SharedReading]): Shared readings by the user.
        journal_entries (list[UserReadingJournal]): Personal tarot journal entries for the user.
        card_meanings (list[UserCardMeaning]): Personal meanings for tarot cards for the user.
        analytics (list[UserReadingAnalytics]): Analytics data for user's readings.
        reminders (list[ReadingReminder]): Reminders for user's readings.
    """

    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    full_name = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    is_active = Column(Boolean, default=True)
    is_deleted = Column(Boolean, default=False, nullable=False, index=True)
    is_admin = Column(Boolean, default=False)
    favorite_deck_id = Column(Integer, ForeignKey("decks.id"), default=1, index=True)
    failed_login_attempts = Column(Integer, default=0, nullable=False)
    login_locked_until = Column(DateTime(timezone=True), nullable=True, index=True)

    # Subscription and turn management
    lemon_squeezy_customer_id = Column(String, nullable=True, index=True)
    subscription_status = Column(String, default="none", index=True)  # none, active, canceled, etc.
    number_of_free_turns = Column(Integer, default=3, index=True)
    number_of_paid_turns = Column(Integer, default=0, index=True)
    last_free_turns_reset = Column(DateTime(timezone=True), nullable=True, index=True)
    last_subscription_sync = Column(DateTime(timezone=True), nullable=True, index=True)

    # Specialized premium access (for acquaintances/VIP users)
    is_specialized_premium = Column(Boolean, default=False)

    receive_error_alerts = Column(Boolean, default=False)

    # Avatar storage
    avatar_filename = Column(String, nullable=True)  # Stores the filename of the avatar

    # Profile details and reading preferences (user-editable)
    bio = Column(Text, nullable=True)
    timezone = Column(String, nullable=True)  # IANA timezone name, e.g. "Asia/Ho_Chi_Minh"
    lunar_phase_awareness = Column(Boolean, default=True, server_default="1")
    card_animations = Column(String, default="cinematic", server_default="cinematic")  # cinematic | minimal | off
    reading_language = Column(String, default="English", server_default="English")
    reversed_cards = Column(Boolean, default=True, server_default="1")

    # Relationships
    chat_sessions = relationship("ChatSession", back_populates="user", cascade="all, delete-orphan")
    favorite_deck = relationship("Deck")
    shared_readings = relationship("SharedReading", back_populates="user", cascade="all, delete-orphan")
    journal_entries = relationship("UserReadingJournal", back_populates="user", cascade="all, delete-orphan")
    card_meanings = relationship("UserCardMeaning", back_populates="user", cascade="all, delete-orphan")
    analytics = relationship("UserReadingAnalytics", back_populates="user", cascade="all, delete-orphan")
    reminders = relationship("ReadingReminder", back_populates="user", cascade="all, delete-orphan")

    # Subscription management relationships
    subscription_events = relationship("SubscriptionEvent", back_populates="user", cascade="all, delete-orphan")
    payment_transactions = relationship("PaymentTransaction", back_populates="user", cascade="all, delete-orphan")
    turn_usage_history = relationship("TurnUsageHistory", back_populates="user", cascade="all, delete-orphan")
    auth_sessions = relationship("AuthSession", back_populates="user", cascade="all, delete-orphan")

    @property
    def password(self):
        """Prevents reading the password directly.

        Raises:
            AttributeError: Always raised to prevent reading the password.
        """
        raise AttributeError("password is not a readable attribute")

    @password.setter
    def password(self, password):
        """Hashes and sets the user's password.

        Args:
            password (str): The plain text password to hash and store.
        """
        self.hashed_password = bcrypt.hashpw(_prepare_password(password), bcrypt.gensalt()).decode("utf-8")

    def verify_password(self, password):
        """Verifies a plain password against the stored hash.

        Args:
            password (str): The plain text password to verify.

        Returns:
            bool: True if the password matches, False otherwise.
        """
        return bcrypt.checkpw(_prepare_password(password), self.hashed_password.encode("utf-8"))

    def get_total_turns(self):
        """Get total available turns (free + paid). Returns -1 for unlimited (specialized premium)."""
        if self.is_specialized_premium:
            return -1  # Indicates unlimited turns
        return (self.number_of_free_turns or 0) + (self.number_of_paid_turns or 0)

    def has_turns_available(self):
        """Check if the user has any turns available.

        Returns:
            bool: True if the user has turns available, False otherwise.
        """
        return self.get_total_turns() > 0

    def consume_turn(self):
        """Consume one turn, prioritizing free turns first.

        Returns:
            bool: True if a turn was consumed, False if no turns available.
        """
        # Specialized premium users have unlimited turns
        if self.is_specialized_premium:
            return True

        if self.number_of_free_turns and self.number_of_free_turns > 0:
            self.number_of_free_turns -= 1
            return True
        elif self.number_of_paid_turns and self.number_of_paid_turns > 0:
            self.number_of_paid_turns -= 1
            return True
        return False

    def reset_free_turns(self):
        """Reset free turns to 3 and update the reset timestamp."""
        from datetime import datetime

        self.number_of_free_turns = 3
        self.last_free_turns_reset = datetime.now(UTC)

    def should_reset_free_turns(self):
        """Check if free turns should be reset based on the current month.

        Returns:
            bool: True if free turns should be reset, False otherwise.
        """
        from datetime import datetime

        if not self.last_free_turns_reset:
            return True

        now = datetime.now(UTC)
        last_reset = self.last_free_turns_reset

        # Check if we're in a different month/year
        return now.year > last_reset.year or (now.year == last_reset.year and now.month > last_reset.month)

    def add_paid_turns(self, turns):
        """Add paid turns to the user's account.

        Args:
            turns (int): Number of turns to add.
        """
        if self.number_of_paid_turns is None:
            self.number_of_paid_turns = 0
        self.number_of_paid_turns += turns
