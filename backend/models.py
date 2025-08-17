import json
import uuid
from datetime import UTC

from passlib.context import CryptContext
from sqlalchemy import JSON, Boolean, CheckConstraint, Column, Date, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.ext.hybrid import hybrid_property
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

Base = declarative_base()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


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
        is_admin (bool): Whether the user has admin privileges.
        favorite_deck_id (int): Foreign key to the user's favorite deck.
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
    is_admin = Column(Boolean, default=False)
    favorite_deck_id = Column(Integer, ForeignKey("decks.id"), default=1, index=True)

    # Subscription and turn management
    lemon_squeezy_customer_id = Column(String, nullable=True, index=True)
    subscription_status = Column(String, default="none", index=True)  # none, active, canceled, etc.
    number_of_free_turns = Column(Integer, default=3, index=True)
    number_of_paid_turns = Column(Integer, default=0, index=True)
    last_free_turns_reset = Column(DateTime(timezone=True), nullable=True, index=True)
    last_subscription_sync = Column(DateTime(timezone=True), nullable=True, index=True)

    # Specialized premium access (for acquaintances/VIP users)
    is_specialized_premium = Column(Boolean, default=False)

    # Avatar storage
    avatar_filename = Column(String, nullable=True)  # Stores the filename of the avatar

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
        self.hashed_password = pwd_context.hash(password)

    def verify_password(self, password):
        """Verifies a plain password against the stored hash.

        Args:
            password (str): The plain text password to verify.

        Returns:
            bool: True if the password matches, False otherwise.
        """
        return pwd_context.verify(password, self.hashed_password)

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


class ChatSession(Base):
    """Represents a chat session belonging to a user.

    Attributes:
        id (int): Primary key.
        title (str): Title of the chat session.
        created_at (datetime): Timestamp of session creation.
        user_id (int): Foreign key to the user.
        user (User): The user who owns the session.
        messages (list[Message]): Messages in this session.
    """

    __tablename__ = "chat_sessions"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)

    # Relationships
    user = relationship("User", back_populates="chat_sessions")
    messages = relationship("Message", back_populates="chat_session", cascade="all, delete-orphan")


class MessageCardAssociation(Base):
    """Association table between messages and cards, including card orientation.

    Attributes:
        message_id (int): Foreign key to the message.
        card_id (int): Foreign key to the card.
        orientation (str): Orientation of the card (e.g., upright, reversed).
        message (Message): The related message.
        card (Card): The related card.
    """

    __tablename__ = "message_cards"
    message_id = Column(Integer, ForeignKey("messages.id"), primary_key=True, index=True)
    card_id = Column(Integer, ForeignKey("cards.id"), primary_key=True, index=True)
    orientation = Column(String, nullable=True)

    message = relationship("Message", back_populates="card_associations")
    card = relationship("Card", back_populates="message_associations", lazy="joined")


class Message(Base):
    """Represents a message in a chat session, possibly associated with tarot cards.

    Attributes:
        id (int): Primary key.
        content (str): The message content.
        role (str): 'user' or 'assistant'.
        created_at (datetime): Timestamp of message creation.
        chat_session_id (int): Foreign key to the chat session.
        chat_session (ChatSession): The related chat session.
        card_associations (list[MessageCardAssociation]): Associated cards.
    """

    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    content = Column(String)
    role = Column(String)  # 'user' or 'assistant'
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    chat_session_id = Column(Integer, ForeignKey("chat_sessions.id"), index=True)

    chat_session = relationship("ChatSession", back_populates="messages")
    card_associations = relationship(
        "MessageCardAssociation",
        back_populates="message",
        lazy="selectin",
        cascade="all, delete-orphan",
    )

    @hybrid_property
    def cards(self):
        """Returns a list of card data dictionaries associated with this message.

        Returns:
            list[dict]: List of card data dicts, or empty list if none.
        """
        if not self.card_associations:
            return []

        result_cards = []
        for assoc in self.card_associations:
            if assoc.card:
                card_data = {
                    "id": assoc.card.id,
                    "name": assoc.card.name,
                    "suit": assoc.card.suit,
                    "rank": assoc.card.rank,
                    "image_url": assoc.card.image_url,
                    "description_short": assoc.card.description_short,
                    "description_upright": assoc.card.description_upright,
                    "description_reversed": assoc.card.description_reversed,
                    "element": assoc.card.element,
                    "astrology": assoc.card.astrology,
                    "numerology": assoc.card.numerology,
                    "orientation": assoc.orientation,
                }
                result_cards.append(card_data)
        return result_cards


class Deck(Base):
    """Represents a tarot deck, which contains multiple cards.

    Attributes:
        id (int): Primary key.
        name (str): Name of the deck.
        description (str): Optional description of the deck.
        created_at (datetime): Timestamp of deck creation.
        cards (list[Card]): Cards belonging to this deck.
    """

    __tablename__ = "decks"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    description = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    cards = relationship("Card", back_populates="deck")


class Card(Base):
    """Represents a tarot card, which may belong to a deck.

    Attributes:
        id (int): Primary key.
        name (str): Name of the card.
        suit (str): Suit of the card (Wands, Cups, Swords, Pentacles, or Major Arcana).
        rank (str): Rank or title of the card.
        image_url (str): URL to the card image.
        description_short (str): Brief description or keywords.
        description_upright (str): Meaning when upright.
        description_reversed (str): Meaning when reversed.
        element (str): Element associated with the card.
        astrology (str): Astrological association.
        numerology (int): Associated number.
        deck_id (int): Foreign key to the deck.
        deck (Deck): The deck this card belongs to.
        message_associations (list[MessageCardAssociation]): Associations with messages.
    """

    __tablename__ = "cards"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    suit = Column(String, nullable=True)  # E.g., Wands, Cups, Swords, Pentacles, or Major Arcana
    rank = Column(String, nullable=True)  # E.g., Ace, Two, King, The Fool, The Magician
    image_url = Column(String, nullable=True)  # URL to the card image
    description_short = Column(String, nullable=True)  # Brief description or keywords
    description_upright = Column(String, nullable=True)  # Meaning when upright
    description_reversed = Column(String, nullable=True)  # Meaning when reversed
    element = Column(String, nullable=True)  # E.g., Fire, Water, Air, Earth
    astrology = Column(String, nullable=True)  # Associated astrological sign or planet
    numerology = Column(Integer, nullable=True)  # Associated number
    deck_id = Column(Integer, ForeignKey("decks.id"), nullable=True, index=True)
    deck = relationship("Deck", back_populates="cards")
    message_associations = relationship(
        "MessageCardAssociation",
        back_populates="card",
        lazy="selectin",
        cascade="all, delete-orphan",
    )


class PasswordResetToken(Base):
    """Represents a password reset token for a user.

    Attributes:
        id (int): Primary key.
        token (str): Unique reset token.
        user_id (int): Foreign key to the user.
        expires_at (datetime): Expiration timestamp.
        created_at (datetime): Creation timestamp.
        is_used (bool): Whether the token has been used.
        user (User): The user this token belongs to.
    """

    __tablename__ = "password_reset_tokens"

    id = Column(Integer, primary_key=True, index=True)
    token = Column(String, unique=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    expires_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    is_used = Column(Boolean, default=False)

    # Relationships
    user = relationship("User")


class Spread(Base):
    """Represents a tarot card spread (layout).

    Attributes:
        id (int): Primary key.
        name (str): Name of the spread.
        description (str): Description of the spread.
        num_cards (int): Number of cards in the spread.
        positions (str): JSON string of position definitions.
        created_at (datetime): Timestamp of spread creation.
    """

    __tablename__ = "spreads"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    description = Column(String)
    num_cards = Column(Integer)
    positions = Column(String)  # JSON string containing position definitions
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    def get_positions(self):
        """Parse the JSON positions string into a list of position definitions.

        Returns:
            list: List of position definitions, or empty list if parsing fails.
        """
        import json

        try:
            return json.loads(self.positions) if self.positions else []
        except (json.JSONDecodeError, TypeError):
            return []

    def set_positions(self, positions_list):
        """Set positions from a list of position definitions.

        Args:
            positions_list (list): List of position definitions to store as JSON.
        """
        import json

        self.positions = json.dumps(positions_list)


class EthereumTransaction(Base):
    """Represents a processed Ethereum transaction for payment verification.

    Attributes:
        id (int): Primary key.
        transaction_hash (str): Unique Ethereum transaction hash.
        user_id (int): Foreign key to the user who made the payment.
        wallet_address (str): Ethereum wallet address that sent the payment.
        eth_amount (str): Amount of ETH sent (as string to preserve precision).
        product_variant (str): Product variant purchased (e.g., '10_turns').
        turns_added (int): Number of turns added to the user's account.
        block_number (int): Block number where transaction was confirmed.
        processed_at (datetime): Timestamp when transaction was processed.
        status (str): Transaction status (pending, confirmed, failed).
        user (User): The user who made the payment.
    """

    __tablename__ = "ethereum_transactions"

    id = Column(Integer, primary_key=True, index=True)
    transaction_hash = Column(String, unique=True, index=True)  # Prevent double-processing
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    wallet_address = Column(String, index=True)
    eth_amount = Column(String, nullable=False)  # Store as string to preserve precision
    product_variant = Column(String, nullable=False)
    turns_added = Column(Integer, default=0)
    block_number = Column(Integer, nullable=True)
    processed_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    status = Column(String, default="confirmed", index=True)  # confirmed, failed

    # Relationships
    user = relationship("User")


class CheckoutSession(Base):
    """Represents a checkout session mapping to track user-order relationships.

    Since Lemon Squeezy doesn't support custom fields in checkout creation,
    we store checkout session mappings to identify users when webhooks arrive.

    Attributes:
        id (int): Primary key.
        user_id (int): Foreign key to the user who created the checkout.
        checkout_id (str): Lemon Squeezy checkout ID.
        checkout_url (str): The checkout URL provided to the user.
        product_variant (str): Product variant being purchased.
        status (str): Checkout status (pending, completed, expired).
        expires_at (datetime): When this checkout session expires.
        created_at (datetime): When this checkout was created.
        user (User): The user who created this checkout.
    """

    __tablename__ = "checkout_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    checkout_id = Column(String, nullable=True, index=True)  # Lemon Squeezy checkout ID
    checkout_url = Column(String, nullable=False, index=True)  # Full checkout URL
    product_variant = Column(String, nullable=False, index=True)  # 10_turns, 20_turns
    status = Column(String, default="pending", index=True)  # pending, completed, expired
    user_email = Column(String, nullable=True, index=True)  # User's email for webhook matching
    customer_id = Column(String, nullable=True, index=True)  # Lemon Squeezy customer ID (set from webhook)
    expires_at = Column(DateTime(timezone=True), nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    # Relationships
    user = relationship("User")


class SubscriptionEvent(Base):
    """Represents a subscription lifecycle event from payment processors.

    This model tracks all subscription-related events including creations,
    updates, cancellations, renewals, and status changes from both Lemon Squeezy
    and Ethereum payments.

    Attributes:
        id (int): Primary key.
        user_id (int): Foreign key to the user.
        event_type (str): Type of event (created, updated, cancelled, resumed, etc.).
        event_source (str): Source of the event (lemon_squeezy, ethereum, system).
        external_id (str): External reference ID from payment processor.
        subscription_status (str): Status after this event.
        turns_affected (int): Number of turns added/removed in this event.
        event_data (JSON): Raw event data from processor for debugging.
        processed_at (datetime): When this event was processed.
        created_at (datetime): When this event occurred.
        user (User): The user this event belongs to.
    """

    __tablename__ = "subscription_events"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    event_type = Column(String, nullable=False, index=True)  # created, updated, cancelled, resumed, expired
    event_source = Column(String, nullable=False, index=True)  # lemon_squeezy, ethereum, system
    external_id = Column(String, nullable=True, index=True)  # External reference from payment processor
    subscription_status = Column(String, nullable=False, index=True)  # Status after this event
    turns_affected = Column(Integer, default=0)  # Turns added/removed in this event
    event_data = Column(JSON, nullable=True)  # Raw event data for debugging
    processed_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    created_at = Column(DateTime(timezone=True), nullable=False, index=True)

    # Relationships
    user = relationship("User")

    def get_event_data(self):
        """Get event data as a dictionary."""
        if isinstance(self.event_data, str):
            import json
            return json.loads(self.event_data)
        return self.event_data or {}

    def set_event_data(self, data):
        """Set event data from a dictionary."""
        if isinstance(data, dict):
            self.event_data = data
        else:
            import json
            self.event_data = json.loads(data) if data else {}


class PaymentTransaction(Base):
    """Represents a unified payment transaction from any payment source.

    This model provides a unified view of all payments, whether from Lemon Squeezy,
    Ethereum, or other payment methods, enabling comprehensive payment history tracking.

    Attributes:
        id (int): Primary key.
        user_id (int): Foreign key to the user.
        transaction_type (str): Type of transaction (purchase, refund, etc.).
        payment_method (str): Payment method used (lemon_squeezy, ethereum).
        external_transaction_id (str): Transaction ID from payment processor.
        amount (str): Amount paid (currency depends on method).
        currency (str): Currency code (USD for Lemon Squeezy, ETH for Ethereum).
        product_variant (str): Product purchased (e.g., '10_turns', '20_turns').
        turns_purchased (int): Number of turns purchased.
        status (str): Transaction status (pending, completed, failed, refunded).
        processor_fee (str): Fee charged by payment processor.
        net_amount (str): Net amount received after fees.
        transaction_metadata (JSON): Additional transaction metadata.
        processed_at (datetime): When transaction was processed.
        created_at (datetime): When transaction was initiated.
        user (User): The user who made this payment.
    """

    __tablename__ = "payment_transactions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    transaction_type = Column(String, nullable=False, index=True)  # purchase, refund, chargeback
    payment_method = Column(String, nullable=False, index=True)  # lemon_squeezy, ethereum
    external_transaction_id = Column(String, nullable=False, index=True)  # Transaction ID from processor
    amount = Column(String, nullable=False)  # Amount paid (as string for precision)
    currency = Column(String, nullable=False)  # USD, ETH, etc.
    product_variant = Column(String, nullable=False)  # 10_turns, 20_turns
    turns_purchased = Column(Integer, nullable=False, default=0)
    status = Column(String, nullable=False, index=True)  # pending, completed, failed, refunded
    processor_fee = Column(String, nullable=True)  # Fee charged by processor
    net_amount = Column(String, nullable=True)  # Net amount after fees
    transaction_metadata = Column(JSON, nullable=True)  # Additional transaction data
    processed_at = Column(DateTime(timezone=True), nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    # Relationships
    user = relationship("User")

    def get_metadata(self):
        """Get transaction metadata as a dictionary."""
        if isinstance(self.transaction_metadata, str):
            import json
            return json.loads(self.transaction_metadata)
        return self.transaction_metadata or {}

    def set_metadata(self, data):
        """Set transaction metadata from a dictionary."""
        if isinstance(data, dict):
            self.transaction_metadata = data
        else:
            import json
            self.transaction_metadata = json.loads(data) if data else {}


class TurnUsageHistory(Base):
    """Represents the history of turn consumption by users.

    This model tracks when and how users consume their turns, enabling analytics
    on usage patterns, peak times, and feature adoption.

    Attributes:
        id (int): Primary key.
        user_id (int): Foreign key to the user.
        turn_type (str): Type of turn consumed (free, paid, unlimited).
        usage_context (str): Context where turn was used (reading, chat).
        turns_before (int): Number of turns before consumption.
        turns_after (int): Number of turns after consumption.
        feature_used (str): Specific feature that consumed the turn.
        session_id (str): Optional session identifier for tracking.
        usage_metadata (JSON): Additional usage metadata.
        consumed_at (datetime): When the turn was consumed.
        user (User): The user who consumed the turn.
    """

    __tablename__ = "turn_usage_history"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    turn_type = Column(String, nullable=False, index=True)  # free, paid, unlimited
    usage_context = Column(String, nullable=False, index=True)  # reading, chat
    turns_before = Column(Integer, nullable=False)  # Total turns before consumption
    turns_after = Column(Integer, nullable=False)  # Total turns after consumption
    feature_used = Column(String, nullable=True)  # Specific feature (tarot_reading, chat_session)
    session_id = Column(String, nullable=True, index=True)  # Session tracking
    usage_metadata = Column(JSON, nullable=True)  # Additional usage data
    consumed_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    # Relationships
    user = relationship("User")

    def get_metadata(self):
        """Get usage metadata as a dictionary."""
        if isinstance(self.usage_metadata, str):
            import json
            return json.loads(self.usage_metadata)
        return self.usage_metadata or {}

    def set_metadata(self, data):
        """Set usage metadata from a dictionary."""
        if isinstance(data, dict):
            self.usage_metadata = data
        else:
            import json
            self.usage_metadata = json.loads(data) if data else {}


class SubscriptionPlan(Base):
    """Represents available subscription plans and their configurations.

    This model defines the various subscription plans available, their pricing,
    and turn allocations, enabling dynamic plan management.

    Attributes:
        id (int): Primary key.
        plan_name (str): Name of the subscription plan.
        plan_code (str): Unique code for the plan (e.g., '10_turns', '20_turns').
        description (str): Description of the plan.
        price_usd (str): Price in USD (as string for precision).
        price_eth (str): Price in ETH (as string for precision).
        turns_included (int): Number of turns included in this plan.
        is_active (bool): Whether this plan is currently available.
        sort_order (int): Display order for plans.
        features (JSON): Additional features included in this plan.
        lemon_squeezy_product_id (str): Lemon Squeezy product/variant ID.
        created_at (datetime): When this plan was created.
        updated_at (datetime): When this plan was last updated.
    """

    __tablename__ = "subscription_plans"

    id = Column(Integer, primary_key=True, index=True)
    plan_name = Column(String, nullable=False, unique=True)
    plan_code = Column(String, nullable=False, unique=True, index=True)
    description = Column(Text, nullable=True)
    price_usd = Column(String, nullable=False)  # Store as string for precision
    price_eth = Column(String, nullable=False)  # Store as string for precision
    turns_included = Column(Integer, nullable=False)
    is_active = Column(Boolean, default=True, index=True)
    sort_order = Column(Integer, default=0)
    features = Column(JSON, nullable=True)  # Additional features list
    lemon_squeezy_product_id = Column(String, nullable=True)  # External product ID
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    def get_features(self):
        """Get features as a list."""
        if isinstance(self.features, str):
            import json
            return json.loads(self.features)
        return self.features or []

    def set_features(self, features_list):
        """Set features from a list."""
        if isinstance(features_list, list):
            self.features = features_list
        else:
            self.features = []


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
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user = relationship("User", back_populates="reminders")
    journal_entry = relationship("UserReadingJournal", back_populates="reminders")

    # Check constraint for reminder type
    __table_args__ = (
        CheckConstraint("reminder_type IN ('anniversary', 'follow_up', 'milestone')", name="valid_reminder_type"),
    )
