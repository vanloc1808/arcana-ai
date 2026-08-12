import json
import uuid

from sqlalchemy import (
    JSON,
    Boolean,
    CheckConstraint,
    Column,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from .base import Base


class SharedReading(Base):
    """Represents a tarot reading that can be shared with others.

    Attributes:
        id (int): Primary key.
        uuid (str): Unique identifier for sharing.
        title (str): Title of the reading.
        concern (str): The concern or question for the reading.
        cards_data (str): JSON string of cards and their meanings.
        spread_name (str): Name of the spread used.
        deck_name (str): Name of the deck used.
        created_at (datetime): Timestamp of creation.
        expires_at (datetime): Optional expiration timestamp.
        is_public (bool): Whether the reading is public.
        view_count (int): Number of times viewed.
        user_id (int): Foreign key to the user.
        user (User): The user who created the shared reading.
    """

    __tablename__ = "shared_readings"

    id = Column(Integer, primary_key=True, index=True)
    uuid = Column(String, unique=True, index=True, default=lambda: str(uuid.uuid4()))
    title = Column(String, nullable=False)
    concern = Column(Text, nullable=False)
    cards_data = Column(Text, nullable=False)  # JSON string of cards with meanings
    spread_name = Column(String, nullable=True)
    deck_name = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    expires_at = Column(DateTime(timezone=True), nullable=True, index=True)  # Optional expiration
    is_public = Column(Boolean, default=True, index=True)
    view_count = Column(Integer, default=0)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)

    # Relationships
    user = relationship("User", back_populates="shared_readings")

    def get_cards_data(self):
        """Parse the JSON cards data string into a list of card data.

        Returns:
            list: List of card data dictionaries, or empty list if parsing fails.
        """
        import json

        try:
            return json.loads(self.cards_data) if self.cards_data else []
        except (json.JSONDecodeError, TypeError):
            return []

    def set_cards_data(self, cards_list):
        """Set cards data from a list of card dictionaries.

        Args:
            cards_list (list): List of card dictionaries to store as JSON.
        """
        import json

        self.cards_data = json.dumps(cards_list)

    def increment_view_count(self):
        """Increment the view count for this shared reading."""
        self.view_count = (self.view_count or 0) + 1


class UserReadingJournal(Base):
    """Represents a personal tarot journal entry for a user.

    Attributes:
        id (int): Primary key.
        user_id (int): Foreign key to the user.
        reading_id (int): Optional foreign key to shared reading.
        reading_snapshot (JSON): Stored reading data.
        personal_notes (str): User's personal notes and reflections.
        mood_before (int): Mood rating before reading (1-10).
        mood_after (int): Mood rating after reading (1-10).
        outcome_rating (int): Outcome satisfaction rating (1-5).
        follow_up_date (datetime): Optional follow-up reminder date.
        follow_up_completed (bool): Whether follow-up was completed.
        tags (JSON): Array of user-defined tags.
        is_favorite (bool): Whether entry is marked as favorite.
        created_at (datetime): Creation timestamp.
        updated_at (datetime): Last update timestamp.
        user (User): The user who owns this journal entry.
        shared_reading (SharedReading): Optional linked shared reading.
        reminders (list): Related reminders for this entry.
    """

    __tablename__ = "user_reading_journal"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    reading_id = Column(Integer, ForeignKey("shared_readings.id", ondelete="SET NULL"), nullable=True)
    reading_snapshot = Column(JSON, nullable=False)
    personal_notes = Column(Text, nullable=True)
    mood_before = Column(Integer, CheckConstraint("mood_before >= 1 AND mood_before <= 10"), nullable=True)
    mood_after = Column(Integer, CheckConstraint("mood_after >= 1 AND mood_after <= 10"), nullable=True)
    outcome_rating = Column(Integer, CheckConstraint("outcome_rating >= 1 AND outcome_rating <= 5"), nullable=True)
    follow_up_date = Column(DateTime(timezone=True), nullable=True, index=True)
    follow_up_completed = Column(Boolean, default=False)
    tags = Column(JSON, nullable=True, default=list)
    is_favorite = Column(Boolean, default=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="journal_entries")
    shared_reading = relationship("SharedReading")
    reminders = relationship("ReadingReminder", back_populates="journal_entry", cascade="all, delete-orphan")

    def get_reading_data(self):
        """Get the reading data as a dictionary."""
        if isinstance(self.reading_snapshot, str):
            return json.loads(self.reading_snapshot)
        return self.reading_snapshot

    def set_reading_data(self, data):
        """Set the reading data from a dictionary."""
        if isinstance(data, dict):
            self.reading_snapshot = data
        else:
            self.reading_snapshot = json.loads(data)

    def get_tags(self):
        """Get tags as a list."""
        if self.tags is None:
            return []
        if isinstance(self.tags, str):
            return json.loads(self.tags)
        return self.tags

    def set_tags(self, tags_list):
        """Set tags from a list."""
        if isinstance(tags_list, list):
            self.tags = tags_list
        else:
            self.tags = []


class UserCardMeaning(Base):
    """Represents a user's personal meaning for a tarot card.

    Attributes:
        id (int): Primary key.
        user_id (int): Foreign key to the user.
        card_id (int): Foreign key to the card.
        personal_meaning (str): User's personal interpretation.
        emotional_keywords (JSON): Array of emotional associations.
        usage_count (int): Number of times this meaning was referenced.
        is_active (bool): Whether this meaning is currently active.
        created_at (datetime): Creation timestamp.
        updated_at (datetime): Last update timestamp.
        user (User): The user who created this meaning.
        card (Card): The card this meaning is for.
    """

    __tablename__ = "user_card_meanings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    card_id = Column(Integer, ForeignKey("cards.id", ondelete="CASCADE"), nullable=False, index=True)
    personal_meaning = Column(Text, nullable=False)
    emotional_keywords = Column(JSON, nullable=True, default=list)
    usage_count = Column(Integer, default=0, index=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="card_meanings")
    card = relationship("Card")

    # Ensure unique constraint on user_id and card_id
    __table_args__ = (
        # Removed char_length constraint as it's not supported in SQLite
        # We'll handle minimum length validation in the Pydantic schema instead
    )

    def get_emotional_keywords(self):
        """Get emotional keywords as a list."""
        if self.emotional_keywords is None:
            return []
        if isinstance(self.emotional_keywords, str):
            return json.loads(self.emotional_keywords)
        return self.emotional_keywords

    def set_emotional_keywords(self, keywords_list):
        """Set emotional keywords from a list."""
        if isinstance(keywords_list, list):
            self.emotional_keywords = keywords_list
        else:
            self.emotional_keywords = []


class UserReadingAnalytics(Base):
    """Represents analytics data for a user's reading patterns.

    Attributes:
        id (int): Primary key.
        user_id (int): Foreign key to the user.
        analysis_type (str): Type of analysis (monthly_summary, card_frequency, etc.).
        analysis_data (JSON): JSON data containing the analysis results.
        analysis_period_start (date): Start date of the analysis period.
        analysis_period_end (date): End date of the analysis period.
        generated_at (datetime): When the analysis was generated.
        user (User): The user this analytics data belongs to.
    """

    __tablename__ = "user_reading_analytics"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    analysis_type = Column(String(50), nullable=False, index=True)
    analysis_data = Column(JSON, nullable=False)
    analysis_period_start = Column(Date, nullable=True)
    analysis_period_end = Column(Date, nullable=True)
    generated_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    # Relationships
    user = relationship("User", back_populates="analytics")

    def get_analysis_data(self):
        """Get the analysis data as a dictionary."""
        if isinstance(self.analysis_data, str):
            return json.loads(self.analysis_data)
        return self.analysis_data


class ReadingReminder(Base):
    """Represents a reminder for a journal entry follow-up.

    Attributes:
        id (int): Primary key.
        user_id (int): Foreign key to the user.
        journal_entry_id (int): Foreign key to the journal entry.
        reminder_type (str): Type of reminder (anniversary, follow_up, milestone).
        reminder_date (datetime): When the reminder should be triggered.
        message (str): Optional custom message for the reminder.
        is_sent (bool): Whether the reminder notification was sent.
        is_completed (bool): Whether the user completed the follow-up.
        created_at (datetime): Creation timestamp.
        user (User): The user this reminder belongs to.
        journal_entry (UserReadingJournal): The journal entry this reminder is for.
    """

    __tablename__ = "reading_reminders"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    journal_entry_id = Column(Integer, ForeignKey("user_reading_journal.id", ondelete="CASCADE"), nullable=False)
    reminder_type = Column(String(30), nullable=False)  # anniversary, follow_up, milestone
    reminder_date = Column(DateTime(timezone=True), nullable=False, index=True)
    message = Column(Text, nullable=True)
    is_sent = Column(Boolean, default=False, index=True)
    is_completed = Column(Boolean, default=False)
    delivery_attempts = Column(Integer, nullable=False, default=0)
    last_attempt_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user = relationship("User", back_populates="reminders")
    journal_entry = relationship("UserReadingJournal", back_populates="reminders")

    # Check constraint for reminder type
    __table_args__ = (
        CheckConstraint("reminder_type IN ('anniversary', 'follow_up', 'milestone')", name="valid_reminder_type"),
    )


class UserStreak(Base):
    """Daily-activity streak state for a user.

    A user has one row. `current_streak` counts consecutive UTC days of qualifying
    activity ending at `last_activity_date`; it is considered active if
    `last_activity_date` is today or yesterday (UTC). `longest_streak` is the
    all-time maximum.
    """

    __tablename__ = "user_streaks"

    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    current_streak = Column(Integer, nullable=False, default=0)
    longest_streak = Column(Integer, nullable=False, default=0)
    last_activity_date = Column(Date, nullable=True, index=True)
    total_active_days = Column(Integer, nullable=False, default=0)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User")


class UserAchievement(Base):
    """An achievement unlocked by a user.

    `code` is one of the constants in services.achievements. Rows are inserted
    on unlock; the absence of a row means the achievement is still locked.
    """

    __tablename__ = "user_achievements"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    code = Column(String(64), nullable=False, index=True)
    unlocked_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    progress = Column(JSON, nullable=True)

    user = relationship("User")

    __table_args__ = (
        UniqueConstraint("user_id", "code", name="uq_user_achievement_code"),
    )


class DailyCardPull(Base):
    """Records that a user viewed/pulled the card-of-the-day on a given UTC date.

    Stateless before this model existed; rows only exist going forward from the
    feature launch. Unique per user per date.
    """

    __tablename__ = "daily_card_pulls"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    pull_date = Column(Date, nullable=False, index=True)
    card_id = Column(Integer, ForeignKey("cards.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User")
    card = relationship("Card")

    __table_args__ = (
        UniqueConstraint("user_id", "pull_date", name="uq_daily_card_pull_per_day"),
    )
