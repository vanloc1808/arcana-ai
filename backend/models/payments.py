from sqlalchemy import (
    JSON,
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

from .base import Base


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
    idempotency_key = Column(String, nullable=True, unique=True, index=True)
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
