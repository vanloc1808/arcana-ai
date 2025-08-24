"""
Pydantic schemas for the ArcanaAI API.

This module defines all the Pydantic models used for request validation,
response serialization, and data transfer objects (DTOs) throughout the API.
All schemas include comprehensive validation, sanitization, and documentation.

The schemas are organized by functional areas:

Data Models:
    - Deck schemas: DeckBase, DeckResponse
    - Card schemas: CardBase, CardCreate, Card, CardResponse
    - User schemas: UserBase, UserCreate, UserUpdate, UserResponse
    - Chat schemas: ChatSessionCreate, ChatSessionResponse, MessageRequest, MessageResponse
    - Spread schemas: SpreadBase, SpreadCreate, SpreadResponse
    - Shared Reading schemas: SharedReadingCreate, SharedReadingResponse
    - Journal schemas: JournalEntryCreate, JournalEntryUpdate, JournalEntryResponse, etc.

Authentication & Security:
    - Token schemas: Token, RefreshToken, TokenData
    - Password reset schemas: ForgotPasswordRequest, ResetPasswordRequest

API Operations:
    - Reading schemas: ReadingRequest
    - Admin schemas: AdminUserResponse, AdminChatSessionResponse, etc.
    - Subscription schemas: TurnsResponse, SubscriptionResponse, CheckoutRequest
    - Payment schemas: EthereumPaymentRequest, EthereumPaymentResponse
    - Journal schemas: JournalAnalytics, PersonalCardMeaning, etc.

Validation Features:
    - HTML/XSS sanitization for all string inputs
    - Email validation using EmailStr
    - Password complexity validation
    - Input length and format validation
    - Custom field validators for business logic

Security Measures:
    - Script tag detection and blocking
    - HTML content sanitization
    - Input length limits to prevent DoS attacks
    - Comprehensive validation error messages

Dependencies:
    - Pydantic for schema definition and validation
    - Regular expressions for content sanitization
    - EmailStr for email validation

Example:
    Creating a validated user:
    ```python
    user_data = UserCreate(
        username="john_doe",
        email="john@example.com",
        password="SecurePass123!"
    )
    ```

Author: ArcanaAI Development Team
Version: 1.0.0
"""

import re
from datetime import date, datetime
from typing import Any, Optional

from pydantic import BaseModel, EmailStr, Field, field_validator

# Utility for HTML/script sanitization
_SANITIZE_RE = re.compile(r"<.*?>")


# --- Validators ---
def _sanitize_string(value: str, field: str, min_length=1, max_length=200, allow_empty=False):
    if not isinstance(value, str):
        raise ValueError(f"{field} must be a string.")
    # Forbid <script> tags or any HTML tags before stripping
    if re.search(r"<\s*script", value, re.IGNORECASE):
        raise ValueError(f"{field} contains forbidden content.")
    if re.search(r"<.*?>", value):
        raise ValueError(f"{field} contains forbidden content.")
    value = value.strip()
    if not allow_empty and not value:
        raise ValueError(f"{field} cannot be empty.")
    if len(value) < min_length:
        raise ValueError(f"{field} must be at least {min_length} characters long.")
    if len(value) > max_length:
        raise ValueError(f"{field} must be at most {max_length} characters long.")
    return value


def _validate_username(value: str):
    """Validate username to contain only letters, numbers, underscores, and dots.

    Args:
        value (str): The username to validate.
    Returns:
        str: The validated username.
    Raises:
        ValueError: If username contains invalid characters.
    """
    if not isinstance(value, str):
        raise ValueError("Username must be a string.")

    # First do basic sanitization
    value = _sanitize_string(value, "Username", min_length=3, max_length=32)

    # Check that username contains only letters, numbers, underscores, and dots
    if not re.match(r"^[a-zA-Z0-9._]+$", value):
        raise ValueError("Username must contain only letters, numbers, underscores, and dots.")

    return value


# Deck Model Schemas
class DeckBase(BaseModel):
    """Base schema for a tarot deck.

    Attributes:
        name (str): Name of the deck.
        description (Optional[str]): Optional description of the deck.
    """

    name: str
    description: str | None = None


class DeckResponse(DeckBase):
    """Response schema for a tarot deck, including ID and creation timestamp.

    Attributes:
        id (int): Deck ID.
        created_at (datetime): Creation timestamp.
    """

    id: int
    created_at: datetime

    class Config:
        from_attributes = True
        json_encoders = {datetime: lambda v: v.isoformat()}


# Card Model Schemas (based on models.py)
class CardBase(BaseModel):
    """Base schema for a tarot card.

    Attributes:
        name (str): Name of the card.
        suit (Optional[str]): Suit of the card.
        rank (Optional[str]): Rank or title of the card.
        image_url (Optional[str]): URL to the card image.
        description_short (Optional[str]): Brief description or keywords.
        description_upright (Optional[str]): Meaning when upright.
        description_reversed (Optional[str]): Meaning when reversed.
        element (Optional[str]): Element associated with the card.
        astrology (Optional[str]): Astrological association.
        numerology (Optional[int]): Associated number.
        orientation (Optional[str]): Orientation of the card.
    """

    name: str
    suit: str | None = None
    rank: str | None = None
    image_url: str | None = None
    description_short: str | None = None
    description_upright: str | None = None
    description_reversed: str | None = None
    element: str | None = None
    astrology: str | None = None
    numerology: int | None = None
    orientation: str | None = None


class CardCreate(CardBase):
    """Schema for creating a tarot card. Inherits all fields from CardBase."""


class Card(CardBase):
    """Response schema for a tarot card, including ID.

    Attributes:
        id (int): Card ID.
    """

    id: int

    class Config:
        from_attributes = True
        json_encoders = {datetime: lambda v: v.isoformat()}


# Chat Session Models
class ChatSessionCreate(BaseModel):
    """Schema for creating a chat session.

    Attributes:
        title (str): Title of the chat session.
    """

    title: str = "New Chat"

    @field_validator("title")
    def validate_title(cls, v):
        """Validate the chat session title.

        Args:
            v (str): The title to validate.
        Returns:
            str: The sanitized title.
        """
        return _sanitize_string(v, "Title", min_length=1, max_length=100)


class ChatSessionResponse(BaseModel):
    """Response schema for a chat session.

    Attributes:
        id (int): Session ID.
        title (str): Title of the session.
        created_at (datetime): Creation timestamp.
    """

    id: int
    title: str
    created_at: datetime

    class Config:
        from_attributes = True
        json_encoders = {datetime: lambda v: v.isoformat()}


class ChatSessionUpdate(BaseModel):
    """Schema for updating a chat session title.

    Attributes:
        title (str): New title for the session.
    """

    title: str


# Message Models
class MessageRequest(BaseModel):
    """Schema for sending a message in a chat session.

    Attributes:
        content (str): The message content.
    """

    content: str

    @field_validator("content")
    def validate_content(cls, v):
        """Validate the message content.

        Args:
            v (str): The content to validate.
        Returns:
            str: The sanitized content.
        """
        return _sanitize_string(v, "Message content", min_length=1, max_length=2000)


class MessageResponse(BaseModel):
    """Response schema for a message, including associated cards.

    Attributes:
        id (int): Message ID.
        role (str): Role of the sender ('user' or 'assistant').
        content (str): Message content.
        created_at (datetime): Timestamp of message creation.
        cards (Optional[list[Card]]): Associated cards, if any.
    """

    id: int
    role: str
    content: str
    created_at: datetime
    cards: list[Card] | None = None

    class Config:
        from_attributes = True
        json_encoders = {datetime: lambda v: v.isoformat()}


# Authentication Models
class Token(BaseModel):
    """Schema for authentication tokens.

    Attributes:
        access_token (str): JWT access token.
        refresh_token (str): JWT refresh token.
        token_type (str): Type of the token (usually 'bearer').
    """

    access_token: str
    refresh_token: str
    token_type: str


class RefreshToken(BaseModel):
    """Schema for a refresh token request.

    Attributes:
        refresh_token (str): JWT refresh token.
    """

    refresh_token: str


class TokenData(BaseModel):
    """Schema for token data payload.

    Attributes:
        username (Optional[str]): Username from the token payload.
    """

    username: str | None = None


class UserBase(BaseModel):
    """Base schema for a user.

    Attributes:
        username (str): Username.
        email (EmailStr): Email address.
    """

    username: str
    email: EmailStr


class UserCreate(UserBase):
    """Schema for creating a user, including password.

    Attributes:
        password (str): User's password.
    """

    password: str

    @field_validator("username")
    def validate_username(cls, v):
        """Validate the username.

        Args:
            v (str): The username to validate.
        Returns:
            str: The validated username.
        """
        return _validate_username(v)

    @field_validator("password")
    def validate_password(cls, v):
        """Validate the password.

        Args:
            v (str): The password to validate.
        Returns:
            str: The sanitized password.
        """
        return _sanitize_string(v, "Password", min_length=8, max_length=128)


class UserUpdate(BaseModel):
    """Schema for updating user preferences.

    Attributes:
        favorite_deck_id (Optional[int]): ID of the user's favorite deck.
        full_name (Optional[str]): Full name of the user.
    """

    favorite_deck_id: int | None = None
    full_name: str | None = None

    @field_validator("full_name")
    def validate_full_name(cls, v):
        """Validate the full name.

        Args:
            v (str): The full name to validate.
        Returns:
            str: The sanitized full name.
        """
        if v is None or v == "":
            return None
        # Strip whitespace first and check if empty
        stripped = v.strip() if isinstance(v, str) else v
        if not stripped:
            return None
        return _sanitize_string(v, "Full name", min_length=1, max_length=100, allow_empty=False)


class UserResponse(BaseModel):
    """Response schema for user operations.

    Attributes:
        id (int): User ID.
        username (str): Username.
        email (str): Email address.
        full_name (Optional[str]): Full name of the user.
        created_at (datetime): Account creation timestamp.
        is_active (bool): Account active status.
        is_admin (bool): Whether the user is an admin.
        is_specialized_premium (bool): Whether the user has specialized premium access.
        favorite_deck_id (Optional[int]): ID of the user's favorite deck.
        favorite_deck (Optional[DeckResponse]): Favorite deck details.
        lemon_squeezy_customer_id (Optional[str]): Lemon Squeezy customer ID.
        subscription_status (str): Subscription status.
        number_of_free_turns (int): Number of free turns available.
        number_of_paid_turns (int): Number of paid turns available.
        last_free_turns_reset (Optional[datetime]): Last free turns reset timestamp.
        avatar_url (Optional[str]): URL to the user's avatar image.
    """

    id: int
    username: str
    email: str
    full_name: str | None = None
    created_at: datetime
    is_active: bool
    is_admin: bool = False
    is_specialized_premium: bool = False
    favorite_deck_id: int | None = None
    favorite_deck: DeckResponse | None = None
    lemon_squeezy_customer_id: str | None = None
    subscription_status: str = "none"
    number_of_free_turns: int = 3
    number_of_paid_turns: int = 0
    last_free_turns_reset: datetime | None = None
    avatar_url: str | None = None

    class Config:
        """Pydantic configuration."""

        from_attributes = True
        json_encoders = {datetime: lambda v: v.isoformat()}


# Password Reset Models
class ForgotPasswordRequest(BaseModel):
    """Schema for requesting a password reset email.

    Attributes:
        email_or_username (str): Email address or username to send the reset link to.
    """

    email_or_username: str

    @field_validator("email_or_username")
    def validate_email_or_username(cls, v):  # noqa: N805
        """Validate the email or username.

        Args:
            v (str): The email or username to validate.
        Returns:
            str: The validated email or username.
        Raises:
            ValueError: If the field is empty.
        """
        if not v or not v.strip():
            raise ValueError("Email or username cannot be empty")
        return v.strip()


class ResetPasswordRequest(BaseModel):
    """Schema for resetting a password using a token.

    Attributes:
        token (str): Password reset token.
        new_password (str): New password to set.
    """

    token: str
    new_password: str

    @field_validator("new_password")
    def validate_password(cls, v):  # noqa: N805
        """Validate the new password.

        Args:
            v (str): The new password to validate.
        Returns:
            str: The validated password.
        Raises:
            ValueError: If the password is empty or too short.
        """
        if not v:
            raise ValueError("Password cannot be empty")
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        return v


# Tarot Reading Models
class ReadingRequest(BaseModel):
    """Schema for requesting a tarot reading.

    Attributes:
        concern (str): The concern or question for the reading.
        num_cards (Optional[int]): Number of cards to draw.
        spread_id (Optional[int]): ID of the spread to use.
    """

    concern: str
    num_cards: int | None = 3
    spread_id: int | None = None

    @field_validator("concern")
    def validate_concern(cls, v):
        """Validate the concern/question for the reading.

        Args:
            v (str): The concern/question to validate.
        Returns:
            str: The sanitized concern.
        """
        return _sanitize_string(v, "Concern", min_length=2, max_length=2000)


class CardResponse(BaseModel):
    """Response schema for a card in a tarot reading.

    Attributes:
        name (str): Name of the card.
        orientation (str): Orientation of the card.
        meaning (str): Meaning of the card in this context.
        image_url (Optional[str]): URL to the card image.
        position (Optional[str]): Position meaning in the spread.
        position_index (Optional[int]): Index of the position in the spread.
    """

    name: str
    orientation: str
    meaning: str
    image_url: str | None = None
    position: str | None = None  # Position meaning in the spread
    position_index: int | None = None  # Index of the position in the spread


# Spread Models
class SpreadBase(BaseModel):
    """Base schema for a tarot spread.

    Attributes:
        name (str): Name of the spread.
        description (str): Description of the spread.
        num_cards (int): Number of cards in the spread.
    """

    name: str
    description: str
    num_cards: int


class SpreadCreate(SpreadBase):
    """Schema for creating a tarot spread.

    Attributes:
        positions (list[dict]): List of position definitions.
    """

    positions: list[dict]  # List of position definitions


class SpreadResponse(SpreadBase):
    """Response schema for a tarot spread, including positions and creation timestamp.

    Attributes:
        id (int): Spread ID.
        positions (list[dict]): List of position definitions.
        created_at (datetime): Creation timestamp.
    """

    id: int
    positions: list[dict]
    created_at: datetime

    class Config:
        from_attributes = True
        json_encoders = {datetime: lambda v: v.isoformat()}


class SpreadListResponse(BaseModel):
    """Response schema for listing tarot spreads.

    Attributes:
        id (int): Spread ID.
        name (str): Name of the spread.
        description (str): Description of the spread.
        num_cards (int): Number of cards in the spread.
    """

    id: int
    name: str
    description: str
    num_cards: int

    class Config:
        from_attributes = True


# Shared Reading Models
class SharedReadingCreate(BaseModel):
    """Schema for creating a shared tarot reading.

    Attributes:
        title (str): Title of the shared reading.
        concern (str): Concern or question for the reading.
        cards (list[CardResponse]): List of cards in the reading.
        spread_name (Optional[str]): Name of the spread used.
        deck_name (Optional[str]): Name of the deck used.
        expires_in_days (Optional[int]): Days until expiration.
    """

    title: str
    concern: str
    cards: list[CardResponse]
    spread_name: str | None = None
    deck_name: str | None = None
    expires_in_days: int | None = None  # Number of days until expiration

    @field_validator("title")
    def validate_title(cls, v):
        """Validate the title of the shared reading.

        Args:
            v (str): The title to validate.
        Returns:
            str: The sanitized title.
        """
        return _sanitize_string(v, "Title", min_length=1, max_length=100)

    @field_validator("concern")
    def validate_concern(cls, v):
        """Validate the concern/question for the shared reading.

        Args:
            v (str): The concern/question to validate.
        Returns:
            str: The sanitized concern.
        """
        return _sanitize_string(v, "Concern", min_length=2, max_length=2000)


class SharedReadingResponse(BaseModel):
    uuid: str
    title: str
    concern: str
    cards: list[CardResponse]
    spread_name: str | None = None
    deck_name: str | None = None
    created_at: datetime
    expires_at: datetime | None = None
    is_public: bool
    view_count: int
    creator_username: str

    class Config:
        from_attributes = True
        json_encoders = {datetime: lambda v: v.isoformat()}


class SharedReadingListResponse(BaseModel):
    uuid: str
    title: str
    created_at: datetime
    view_count: int
    is_public: bool

    class Config:
        from_attributes = True
        json_encoders = {datetime: lambda v: v.isoformat()}


class SharedReadingStatsResponse(BaseModel):
    total_shared: int
    total_views: int
    most_viewed: SharedReadingListResponse | None = None

    class Config:
        from_attributes = True
        json_encoders = {datetime: lambda v: v.isoformat()}


# Admin Portal Schemas
class AdminUserResponse(BaseModel):
    id: int
    username: str
    email: str
    full_name: str | None = None
    created_at: datetime
    is_active: bool
    is_admin: bool = False
    is_specialized_premium: bool = False
    favorite_deck_id: int | None = None
    # Subscription and turn fields (read-only)
    subscription_status: str = "none"
    number_of_free_turns: int = 3
    number_of_paid_turns: int = 0
    total_turns: int = 3  # -1 for unlimited (specialized premium)
    last_free_turns_reset: datetime | None = None
    lemon_squeezy_customer_id: str | None = None
    # Avatar
    avatar_url: str | None = None
    # Counts
    chat_sessions_count: int = 0
    shared_readings_count: int = 0

    class Config:
        from_attributes = True
        json_encoders = {datetime: lambda v: v.isoformat()}


class AdminUserUpdate(BaseModel):
    username: str | None = None
    email: str | None = None
    full_name: str | None = None
    is_active: bool | None = None
    is_specialized_premium: bool | None = None
    favorite_deck_id: int | None = None

    @field_validator("username")
    def validate_username(cls, v):
        if v is not None:
            return _validate_username(v)
        return v

    @field_validator("full_name")
    def validate_full_name(cls, v):
        """Validate the full name.

        Args:
            v (str): The full name to validate.
        Returns:
            str: The sanitized full name.
        """
        if v is None or v == "":
            return None
        # Strip whitespace first and check if empty
        stripped = v.strip() if isinstance(v, str) else v
        if not stripped:
            return None
        return _sanitize_string(v, "Full name", min_length=1, max_length=100, allow_empty=False)


class AdminChatSessionResponse(BaseModel):
    id: int
    title: str
    created_at: datetime
    user_id: int
    username: str
    messages_count: int = 0

    class Config:
        from_attributes = True
        json_encoders = {datetime: lambda v: v.isoformat()}


class AdminMessageResponse(BaseModel):
    id: int
    content: str
    role: str
    created_at: datetime
    chat_session_id: int
    chat_session_title: str
    username: str
    cards_count: int = 0

    class Config:
        from_attributes = True
        json_encoders = {datetime: lambda v: v.isoformat()}


class AdminCardResponse(BaseModel):
    id: int
    name: str
    suit: str | None = None
    rank: str | None = None
    image_url: str | None = None
    description_short: str | None = None
    description_upright: str | None = None
    description_reversed: str | None = None
    element: str | None = None
    astrology: str | None = None
    numerology: int | None = None
    deck_id: int | None = None
    deck_name: str | None = None
    message_associations_count: int = 0

    class Config:
        from_attributes = True
        json_encoders = {datetime: lambda v: v.isoformat()}


class AdminCardCreate(BaseModel):
    name: str
    suit: str | None = None
    rank: str | None = None
    image_url: str | None = None
    description_short: str | None = None
    description_upright: str | None = None
    description_reversed: str | None = None
    element: str | None = None
    astrology: str | None = None
    numerology: int | None = None
    deck_id: int | None = None

    @field_validator("name")
    def validate_name(cls, v):  # noqa: N805
        return _sanitize_string(v, "Card name", min_length=1, max_length=100)


class AdminCardUpdate(BaseModel):
    name: str | None = None
    suit: str | None = None
    rank: str | None = None
    image_url: str | None = None
    description_short: str | None = None
    description_upright: str | None = None
    description_reversed: str | None = None
    element: str | None = None
    astrology: str | None = None
    numerology: int | None = None
    deck_id: int | None = None

    @field_validator("name")
    def validate_name(cls, v):  # noqa: N805
        if v is not None:
            return _sanitize_string(v, "Card name", min_length=1, max_length=100)
        return v


class AdminDeckResponse(BaseModel):
    id: int
    name: str
    description: str | None = None
    created_at: datetime
    cards_count: int = 0

    class Config:
        from_attributes = True
        json_encoders = {datetime: lambda v: v.isoformat()}


class AdminDeckCreate(BaseModel):
    name: str
    description: str | None = None

    @field_validator("name")
    def validate_name(cls, v):  # noqa: N805
        return _sanitize_string(v, "Deck name", min_length=1, max_length=100)

    @field_validator("description")
    def validate_description(cls, v):
        if v is not None:
            return _sanitize_string(v, "Description", min_length=1, max_length=500, allow_empty=True)
        return v


class AdminDeckUpdate(BaseModel):
    name: str | None = None
    description: str | None = None

    @field_validator("name")
    def validate_name(cls, v):
        if v is not None:
            return _sanitize_string(v, "Deck name", min_length=1, max_length=100)
        return v

    @field_validator("description")
    def validate_description(cls, v):  # noqa: N805
        if v is not None:
            return _sanitize_string(v, "Description", min_length=1, max_length=500, allow_empty=True)
        return v


class AdminSpreadResponse(BaseModel):
    id: int
    name: str
    description: str
    num_cards: int
    positions: list[dict]
    created_at: datetime

    class Config:
        from_attributes = True
        json_encoders = {datetime: lambda v: v.isoformat()}


class AdminSpreadCreate(BaseModel):
    name: str
    description: str
    num_cards: int
    positions: list[dict]

    @field_validator("name")
    def validate_name(cls, v):  # noqa: N805
        return _sanitize_string(v, "Spread name", min_length=1, max_length=100)

    @field_validator("description")
    def validate_description(cls, v):  # noqa: N805
        return _sanitize_string(v, "Description", min_length=1, max_length=500)

    @field_validator("num_cards")
    def validate_num_cards(cls, v):
        if v < 1:
            raise ValueError("Number of cards must be at least 1")
        if v > 78:
            raise ValueError("Number of cards cannot exceed 78")
        return v


class AdminSpreadUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    num_cards: int | None = None
    positions: list[dict] | None = None

    @field_validator("name")
    def validate_name(cls, v):
        if v is not None:
            return _sanitize_string(v, "Spread name", min_length=1, max_length=100)
        return v

    @field_validator("description")
    def validate_description(cls, v):
        if v is not None:
            return _sanitize_string(v, "Description", min_length=1, max_length=500)
        return v

    @field_validator("num_cards")
    def validate_num_cards(cls, v):  # noqa: N805
        if v is not None:
            if v < 1:
                raise ValueError("Number of cards must be at least 1")
            if v > 78:
                raise ValueError("Number of cards cannot exceed 78")
        return v


class AdminSharedReadingResponse(BaseModel):
    id: int
    uuid: str
    title: str
    concern: str
    cards_data: list[dict]
    spread_name: str | None = None
    deck_name: str | None = None
    created_at: datetime
    expires_at: datetime | None = None
    is_public: bool
    view_count: int
    user_id: int
    username: str

    class Config:
        from_attributes = True
        json_encoders = {datetime: lambda v: v.isoformat()}


class AdminDashboardStats(BaseModel):
    total_users: int
    active_users: int
    total_chat_sessions: int
    total_messages: int
    total_cards: int
    total_decks: int
    total_spreads: int
    total_shared_readings: int
    total_views: int
    recent_users: list[AdminUserResponse]
    recent_chat_sessions: list[AdminChatSessionResponse]
    recent_shared_readings: list[AdminSharedReadingResponse]


class AdminSearchRequest(BaseModel):
    query: str
    model_type: str  # 'users', 'chat_sessions', 'messages', 'cards', 'decks', 'spreads', 'shared_readings'
    limit: int = 20
    offset: int = 0

    @field_validator("query")
    def validate_query(cls, v):  # noqa: N805
        return _sanitize_string(v, "Search query", min_length=1, max_length=100)

    @field_validator("model_type")
    def validate_model_type(cls, v):  # noqa: N805
        allowed_types = ["users", "chat_sessions", "messages", "cards", "decks", "spreads", "shared_readings"]
        if v not in allowed_types:
            raise ValueError(f"Model type must be one of: {', '.join(allowed_types)}")
        return v

    @field_validator("limit")
    def validate_limit(cls, v):  # noqa: N805
        if v < 1 or v > 100:
            raise ValueError("Limit must be between 1 and 100")
        return v

    @field_validator("offset")
    def validate_offset(cls, v):  # noqa: N805
        if v < 0:
            raise ValueError("Offset must be non-negative")
        return v


# Subscription and Turn Management Schemas
class TurnsResponse(BaseModel):
    """Response schema for user's turn counts.

    Attributes:
        number_of_free_turns (int): Number of free turns available.
        number_of_paid_turns (int): Number of paid turns available.
        total_turns (int): Total number of turns available (-1 for unlimited).
        subscription_status (str): Current subscription status.
        is_specialized_premium (bool): Whether the user has unlimited turns.
        last_free_turns_reset (Optional[datetime]): Last free turns reset timestamp.
    """

    number_of_free_turns: int
    number_of_paid_turns: int
    total_turns: int  # -1 indicates unlimited turns
    subscription_status: str
    is_specialized_premium: bool = False
    last_free_turns_reset: datetime | None = None

    class Config:
        from_attributes = True
        json_encoders = {datetime: lambda v: v.isoformat()}


class SubscriptionResponse(BaseModel):
    """Response schema for subscription information.

    Attributes:
        subscription_status (str): Current subscription status.
        lemon_squeezy_customer_id (Optional[str]): Lemon Squeezy customer ID.
        number_of_paid_turns (int): Number of paid turns available.
        last_subscription_sync (Optional[datetime]): Last subscription sync timestamp.
    """

    subscription_status: str
    lemon_squeezy_customer_id: str | None = None
    number_of_paid_turns: int
    last_subscription_sync: datetime | None = None

    class Config:
        from_attributes = True
        json_encoders = {datetime: lambda v: v.isoformat()}


class CheckoutRequest(BaseModel):
    """Request schema for creating a checkout session.

    Attributes:
        product_variant (str): Product variant ('10_turns' or '20_turns').
    """

    product_variant: str

    @field_validator("product_variant")
    def validate_product_variant(cls, v):
        """Validate the product variant.

        Args:
            v (str): The product variant to validate.
        Returns:
            str: The validated product variant.
        """
        if v not in ["10_turns", "20_turns"]:
            raise ValueError("Product variant must be '10_turns' or '20_turns'")
        return v


class CheckoutResponse(BaseModel):
    """Response schema for checkout session creation.

    Attributes:
        checkout_url (str): URL to redirect user to for payment.
    """

    checkout_url: str


class LemonSqueezyWebhookEvent(BaseModel):
    """Schema for Lemon Squeezy webhook events.

    Attributes:
        meta (dict): Webhook metadata.
        data (dict): Event data.
    """

    meta: dict
    data: dict


class TurnConsumptionResult(BaseModel):
    """Response schema for turn consumption.

    Attributes:
        success (bool): Whether the turn was successfully consumed.
        remaining_free_turns (int): Remaining free turns.
        remaining_paid_turns (int): Remaining paid turns.
        total_remaining_turns (int): Total remaining turns (-1 for unlimited).
        turn_type_consumed (Optional[str]): Type of turn consumed ('free', 'paid', or 'unlimited').
        is_specialized_premium (bool): Whether the user has unlimited turns.
    """

    success: bool
    remaining_free_turns: int
    remaining_paid_turns: int
    total_remaining_turns: int  # -1 indicates unlimited turns
    turn_type_consumed: str | None = None  # 'free', 'paid', or 'unlimited'
    is_specialized_premium: bool = False


class EthereumPaymentRequest(BaseModel):
    """Request schema for Ethereum payment verification.

    Attributes:
        transaction_hash (str): Ethereum transaction hash.
        product_variant (str): Product variant ('10_turns' or '20_turns').
        eth_amount (str): Amount of ETH sent.
        wallet_address (str): Sender's wallet address.
    """

    transaction_hash: str
    product_variant: str
    eth_amount: str
    wallet_address: str

    @field_validator("transaction_hash")
    def validate_transaction_hash(cls, v):
        """Validate the transaction hash format."""
        if not v.startswith("0x") or len(v) != 66:
            raise ValueError("Invalid transaction hash format")
        return v.lower()

    @field_validator("product_variant")
    def validate_product_variant(cls, v):
        """Validate the product variant."""
        if v not in ["10_turns", "20_turns"]:
            raise ValueError("Product variant must be either '10_turns' or '20_turns'")
        return v

    @field_validator("wallet_address")
    def validate_wallet_address(cls, v):
        """Validate the wallet address format."""
        if not v.startswith("0x") or len(v) != 42:
            raise ValueError("Invalid wallet address format")
        return v.lower()


class EthereumPaymentResponse(BaseModel):
    """Response schema for Ethereum payment verification.

    Attributes:
        success (bool): Whether the payment was successful.
        transaction_verified (bool): Whether the transaction was verified on blockchain.
        turns_added (int): Number of turns added to the user's account.
        message (str): Status message.
        transaction_hash (Optional[str]): Verified transaction hash.
    """

    success: bool
    transaction_verified: bool
    turns_added: int
    message: str
    transaction_hash: str | None = None


# --- Subscription History Schemas ---


class SubscriptionEventResponse(BaseModel):
    """Response schema for subscription events.

    Attributes:
        id (int): Event ID.
        event_type (str): Type of event (created, updated, cancelled, resumed, etc.).
        event_source (str): Source of the event (lemon_squeezy, ethereum, system).
        external_id (Optional[str]): External reference ID from payment processor.
        subscription_status (str): Status after this event.
        turns_affected (int): Number of turns added/removed in this event.
        event_data (Optional[dict]): Raw event data from processor for debugging.
        processed_at (datetime): When this event was processed.
        created_at (datetime): When this event occurred.
    """

    id: int
    event_type: str
    event_source: str
    external_id: str | None = None
    subscription_status: str
    turns_affected: int
    event_data: dict | None = None
    processed_at: datetime
    created_at: datetime

    class Config:
        from_attributes = True
        json_encoders = {datetime: lambda v: v.isoformat()}


class PaymentTransactionResponse(BaseModel):
    """Response schema for payment transactions.

    Attributes:
        id (int): Transaction ID.
        transaction_type (str): Type of transaction (purchase, refund, etc.).
        payment_method (str): Payment method used (lemon_squeezy, ethereum).
        external_transaction_id (str): Transaction ID from payment processor.
        amount (str): Amount paid (currency depends on method).
        currency (str): Currency code (USD for Lemon Squeezy, ETH for Ethereum).
        product_variant (str): Product purchased (e.g., '10_turns', '20_turns').
        turns_purchased (int): Number of turns purchased.
        status (str): Transaction status (pending, completed, failed, refunded).
        processor_fee (Optional[str]): Fee charged by payment processor.
        net_amount (Optional[str]): Net amount received after fees.
        transaction_metadata (Optional[dict]): Additional transaction metadata.
        processed_at (Optional[datetime]): When transaction was processed.
        created_at (datetime): When transaction was initiated.
    """

    id: int
    transaction_type: str
    payment_method: str
    external_transaction_id: str
    amount: str
    currency: str
    product_variant: str
    turns_purchased: int
    status: str
    processor_fee: str | None = None
    net_amount: str | None = None
    transaction_metadata: dict | None = None
    processed_at: datetime | None = None
    created_at: datetime

    class Config:
        from_attributes = True
        json_encoders = {datetime: lambda v: v.isoformat()}


class TurnUsageHistoryResponse(BaseModel):
    """Response schema for turn usage history.

    Attributes:
        id (int): Usage record ID.
        turn_type (str): Type of turn consumed (free, paid, unlimited).
        usage_context (str): Context where turn was used (reading, chat).
        turns_before (int): Number of turns before consumption.
        turns_after (int): Number of turns after consumption.
        feature_used (Optional[str]): Specific feature that consumed the turn.
        session_id (Optional[str]): Optional session identifier for tracking.
        usage_metadata (Optional[dict]): Additional usage metadata.
        consumed_at (datetime): When the turn was consumed.
    """

    id: int
    turn_type: str
    usage_context: str
    turns_before: int
    turns_after: int
    feature_used: str | None = None
    session_id: str | None = None
    usage_metadata: dict | None = None
    consumed_at: datetime

    class Config:
        from_attributes = True
        json_encoders = {datetime: lambda v: v.isoformat()}


class SubscriptionPlanResponse(BaseModel):
    """Response schema for subscription plans.

    Attributes:
        id (int): Plan ID.
        plan_name (str): Name of the subscription plan.
        plan_code (str): Unique code for the plan (e.g., '10_turns', '20_turns').
        description (Optional[str]): Description of the plan.
        price_usd (str): Price in USD (as string for precision).
        price_eth (str): Price in ETH (as string for precision).
        turns_included (int): Number of turns included in this plan.
        is_active (bool): Whether this plan is currently available.
        sort_order (int): Display order for plans.
        features (Optional[list]): Additional features included in this plan.
        lemon_squeezy_product_id (Optional[str]): Lemon Squeezy product/variant ID.
        created_at (datetime): When this plan was created.
        updated_at (datetime): When this plan was last updated.
    """

    id: int
    plan_name: str
    plan_code: str
    description: str | None = None
    price_usd: str
    price_eth: str
    turns_included: int
    is_active: bool
    sort_order: int
    features: list | None = None
    lemon_squeezy_product_id: str | None = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
        json_encoders = {datetime: lambda v: v.isoformat()}


class SubscriptionHistoryResponse(BaseModel):
    """Response schema for comprehensive subscription history.

    Attributes:
        subscription_events (list[SubscriptionEventResponse]): List of subscription events.
        payment_transactions (list[PaymentTransactionResponse]): List of payment transactions.
        turn_usage_history (list[TurnUsageHistoryResponse]): List of turn usage records.
        subscription_plans (list[SubscriptionPlanResponse]): Available subscription plans.
        summary (dict): Summary statistics.
    """

    subscription_events: list[SubscriptionEventResponse]
    payment_transactions: list[PaymentTransactionResponse]
    turn_usage_history: list[TurnUsageHistoryResponse]
    subscription_plans: list[SubscriptionPlanResponse]
    summary: dict

    class Config:
        from_attributes = True
        json_encoders = {datetime: lambda v: v.isoformat()}


# --- Journal Schemas ---


class JournalEntryCreate(BaseModel):
    """Schema for creating a journal entry.

    Attributes:
        reading_id (Optional[int]): Optional reference to a shared reading.
        reading_snapshot (Dict[str, Any]): Snapshot of the reading data.
        personal_notes (Optional[str]): Personal notes and reflections.
        mood_before (Optional[int]): Mood rating before reading (1-10).
        mood_after (Optional[int]): Mood rating after reading (1-10).
        outcome_rating (Optional[int]): Outcome satisfaction rating (1-5).
        follow_up_date (Optional[datetime]): Optional follow-up reminder date.
        tags (Optional[List[str]): Array of user-defined tags.
        is_favorite (bool): Whether entry is marked as favorite.
    """

    reading_id: Optional[int] = None
    reading_snapshot: dict[str, Any]
    personal_notes: Optional[str] = None
    mood_before: Optional[int] = Field(None, ge=1, le=10)
    mood_after: Optional[int] = Field(None, ge=1, le=10)
    outcome_rating: Optional[int] = Field(None, ge=1, le=5)
    follow_up_date: Optional[datetime] = None
    tags: Optional[list[str]] = []
    is_favorite: bool = False

    @field_validator("personal_notes")
    def validate_personal_notes(cls, v):
        """Validate personal notes field."""
        if v is not None:
            return _sanitize_string(v, "Personal notes", min_length=0, max_length=10000, allow_empty=True)
        return v

    @field_validator("tags")
    def validate_tags(cls, v):
        """Validate tags field."""
        if v is not None:
            # Limit to 10 tags, each max 50 characters
            if len(v) > 10:
                raise ValueError("Maximum 10 tags allowed.")
            validated_tags = []
            for tag in v:
                if not isinstance(tag, str):
                    raise ValueError("All tags must be strings.")
                validated_tag = _sanitize_string(tag, "Tag", min_length=1, max_length=50)
                validated_tags.append(validated_tag)
            return validated_tags
        return v


class JournalEntryUpdate(BaseModel):
    """Schema for updating a journal entry.

    Attributes:
        personal_notes (Optional[str]): Updated personal notes.
        mood_after (Optional[int]): Updated mood after reading.
        outcome_rating (Optional[int]): Updated outcome rating.
        follow_up_date (Optional[datetime]): Updated follow-up date.
        tags (Optional[List[str]]): Updated tags.
        is_favorite (Optional[bool]): Updated favorite status.
        follow_up_completed (Optional[bool]): Whether follow-up was completed.
    """

    personal_notes: Optional[str] = None
    mood_after: Optional[int] = Field(None, ge=1, le=10)
    outcome_rating: Optional[int] = Field(None, ge=1, le=5)
    follow_up_date: Optional[datetime] = None
    tags: Optional[list[str]] = None
    is_favorite: Optional[bool] = None
    follow_up_completed: Optional[bool] = None

    @field_validator("personal_notes")
    def validate_personal_notes(cls, v):
        """Validate personal notes field."""
        if v is not None:
            return _sanitize_string(v, "Personal notes", min_length=0, max_length=10000, allow_empty=True)
        return v

    @field_validator("tags")
    def validate_tags(cls, v):
        """Validate tags field."""
        if v is not None:
            if len(v) > 10:
                raise ValueError("Maximum 10 tags allowed.")
            validated_tags = []
            for tag in v:
                if not isinstance(tag, str):
                    raise ValueError("All tags must be strings.")
                validated_tag = _sanitize_string(tag, "Tag", min_length=1, max_length=50)
                validated_tags.append(validated_tag)
            return validated_tags
        return v


class JournalEntryResponse(BaseModel):
    """Response schema for a journal entry.

    Attributes:
        id (int): Entry ID.
        user_id (int): User ID who owns the entry.
        reading_id (Optional[int]): Optional reference to shared reading.
        reading_snapshot (Dict[str, Any]): Snapshot of the reading data.
        personal_notes (Optional[str]): Personal notes and reflections.
        mood_before (Optional[int]): Mood rating before reading.
        mood_after (Optional[int]): Mood rating after reading.
        outcome_rating (Optional[int]): Outcome satisfaction rating.
        follow_up_date (Optional[datetime]): Follow-up reminder date.
        follow_up_completed (bool): Whether follow-up was completed.
        tags (List[str]): Array of user-defined tags.
        is_favorite (bool): Whether entry is marked as favorite.
        created_at (datetime): Creation timestamp.
        updated_at (datetime): Last update timestamp.
    """

    id: int
    user_id: int
    reading_id: Optional[int]
    reading_snapshot: dict[str, Any]
    personal_notes: Optional[str]
    mood_before: Optional[int]
    mood_after: Optional[int]
    outcome_rating: Optional[int]
    follow_up_date: Optional[datetime]
    follow_up_completed: bool
    tags: list[str]
    is_favorite: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
        json_encoders = {datetime: lambda v: v.isoformat()}


class PersonalCardMeaningCreate(BaseModel):
    """Schema for creating a personal card meaning.

    Attributes:
        card_id (int): ID of the card.
        personal_meaning (str): User's personal interpretation.
        emotional_keywords (Optional[List[str]]): Emotional associations.
    """

    card_id: int
    personal_meaning: str
    emotional_keywords: Optional[list[str]] = []

    @field_validator("personal_meaning")
    def validate_personal_meaning(cls, v):
        """Validate personal meaning field."""
        return _sanitize_string(v, "Personal meaning", min_length=10, max_length=5000)

    @field_validator("emotional_keywords")
    def validate_emotional_keywords(cls, v):
        """Validate emotional keywords field."""
        if v is not None:
            if len(v) > 20:
                raise ValueError("Maximum 20 emotional keywords allowed.")
            validated_keywords = []
            for keyword in v:
                if not isinstance(keyword, str):
                    raise ValueError("All keywords must be strings.")
                validated_keyword = _sanitize_string(keyword, "Keyword", min_length=1, max_length=30)
                validated_keywords.append(validated_keyword)
            return validated_keywords
        return v


class PersonalCardMeaningUpdate(BaseModel):
    """Schema for updating a personal card meaning.

    Attributes:
        personal_meaning (Optional[str]): Updated personal interpretation.
        emotional_keywords (Optional[List[str]]): Updated emotional associations.
    """

    personal_meaning: Optional[str] = None
    emotional_keywords: Optional[list[str]] = None

    @field_validator("personal_meaning")
    def validate_personal_meaning(cls, v):
        """Validate personal meaning field."""
        if v is not None:
            return _sanitize_string(v, "Personal meaning", min_length=10, max_length=5000)
        return v

    @field_validator("emotional_keywords")
    def validate_emotional_keywords(cls, v):
        """Validate emotional keywords field."""
        if v is not None:
            if len(v) > 20:
                raise ValueError("Maximum 20 emotional keywords allowed.")
            validated_keywords = []
            for keyword in v:
                if not isinstance(keyword, str):
                    raise ValueError("All keywords must be strings.")
                validated_keyword = _sanitize_string(keyword, "Keyword", min_length=1, max_length=30)
                validated_keywords.append(validated_keyword)
            return validated_keywords
        return v


class PersonalCardMeaningResponse(BaseModel):
    """Response schema for a personal card meaning.

    Attributes:
        id (int): Meaning ID.
        user_id (int): User ID who created the meaning.
        card_id (int): Card ID.
        personal_meaning (str): User's personal interpretation.
        emotional_keywords (List[str]): Emotional associations.
        usage_count (int): Number of times referenced.
        is_active (bool): Whether meaning is active.
        created_at (datetime): Creation timestamp.
        updated_at (datetime): Last update timestamp.
        card (Optional[Card]): Card details.
    """

    id: int
    user_id: int
    card_id: int
    personal_meaning: str
    emotional_keywords: list[str]
    usage_count: int
    is_active: bool
    created_at: datetime
    updated_at: datetime
    card: Optional[Card] = None

    class Config:
        from_attributes = True
        json_encoders = {datetime: lambda v: v.isoformat()}


class JournalAnalytics(BaseModel):
    """Schema for journal analytics data.

    Attributes:
        total_entries (int): Total number of journal entries.
        entries_this_month (int): Entries created this month.
        favorite_cards (List[Dict[str, Any]]): Most frequently drawn cards.
        mood_trends (Dict[str, Any]): Mood tracking trends.
        reading_frequency (Dict[str, int]): Reading frequency by time period.
        growth_metrics (Dict[str, Any]): Personal growth indicators.
        average_mood_improvement (Optional[float]): Average mood improvement.
        most_used_tags (List[Dict[str, Any]]): Most commonly used tags.
        follow_up_completion_rate (Optional[float]): Rate of follow-up completion.
    """

    total_entries: int
    entries_this_month: int
    favorite_cards: list[dict[str, Any]]
    mood_trends: dict[str, Any]
    reading_frequency: dict[str, int]
    growth_metrics: dict[str, Any]
    average_mood_improvement: Optional[float] = None
    most_used_tags: list[dict[str, Any]]
    follow_up_completion_rate: Optional[float] = None


class ReminderCreate(BaseModel):
    """Schema for creating a reminder.

    Attributes:
        journal_entry_id (int): Journal entry ID.
        reminder_type (str): Type of reminder.
        reminder_date (datetime): When reminder should trigger.
        message (Optional[str]): Custom message.
    """

    journal_entry_id: int
    reminder_type: str = Field(..., pattern="^(anniversary|follow_up|milestone)$")
    reminder_date: datetime
    message: Optional[str] = None

    @field_validator("message")
    def validate_message(cls, v):
        """Validate reminder message."""
        if v is not None:
            return _sanitize_string(v, "Reminder message", min_length=0, max_length=500, allow_empty=True)
        return v


class ReminderResponse(BaseModel):
    """Response schema for a reminder.

    Attributes:
        id (int): Reminder ID.
        user_id (int): User ID.
        journal_entry_id (int): Journal entry ID.
        reminder_type (str): Type of reminder.
        reminder_date (datetime): When reminder should trigger.
        message (Optional[str]): Custom message.
        is_sent (bool): Whether reminder was sent.
        is_completed (bool): Whether reminder was completed.
        created_at (datetime): Creation timestamp.
        journal_entry (Optional[JournalEntryResponse]): Related journal entry.
    """

    id: int
    user_id: int
    journal_entry_id: int
    reminder_type: str
    reminder_date: datetime
    message: Optional[str]
    is_sent: bool
    is_completed: bool
    created_at: datetime
    journal_entry: Optional[JournalEntryResponse] = None

    class Config:
        from_attributes = True
        json_encoders = {datetime: lambda v: v.isoformat()}


class JournalFilters(BaseModel):
    """Schema for journal entry filtering.

    Attributes:
        tags (Optional[str]): Comma-separated tags to filter by.
        favorite_only (bool): Show only favorite entries.
        start_date (Optional[date]): Start date for filtering.
        end_date (Optional[date]): End date for filtering.
        mood_min (Optional[int]): Minimum mood rating.
        mood_max (Optional[int]): Maximum mood rating.
        has_follow_up (Optional[bool]): Filter by follow-up status.
        completed_follow_up (Optional[bool]): Filter by completed follow-ups.
        search_notes (Optional[str]): Search in personal notes.
    """

    tags: Optional[str] = None
    favorite_only: bool = False
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    mood_min: Optional[int] = Field(None, ge=1, le=10)
    mood_max: Optional[int] = Field(None, ge=1, le=10)
    has_follow_up: Optional[bool] = None
    completed_follow_up: Optional[bool] = None
    search_notes: Optional[str] = None

    @field_validator("search_notes")
    def validate_search_notes(cls, v):
        """Validate search notes field."""
        if v is not None:
            return _sanitize_string(v, "Search notes", min_length=0, max_length=200, allow_empty=True)
        return v


# Support System Schemas
class SupportTicketCreate(BaseModel):
    """Schema for creating a support ticket.

    Attributes:
        title (str): Title/subject of the support ticket
        description (str): Detailed description of the issue or request
    """

    title: str = Field(..., min_length=1, max_length=200)
    description: str = Field(..., min_length=1, max_length=2000)

    @field_validator("title")
    def validate_title(cls, v):
        """Validate title field."""
        return _sanitize_string(v, "Title", min_length=1, max_length=200)

    @field_validator("description")
    def validate_description(cls, v):
        """Validate description field."""
        return _sanitize_string(v, "Description", min_length=1, max_length=2000)


class SupportTicketResponse(BaseModel):
    """Schema for support ticket response.

    Attributes:
        message (str): Success message
        ticket_id (str): Unique identifier for the ticket
        slack_message_id (Optional[str]): Slack message ID if successfully sent
    """

    message: str
    ticket_id: str
    slack_message_id: Optional[str] = None
