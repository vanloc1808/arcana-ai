from sqlalchemy import (
    Boolean,
    Column,
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
    token_hash = Column(String, unique=True, nullable=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    expires_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    is_used = Column(Boolean, default=False)

    # Relationships
    user = relationship("User")


class AuthSession(Base):
    """Server-side record for a rotatable refresh-token session."""

    __tablename__ = "auth_sessions"

    id = Column(String, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    family_id = Column(String, nullable=False, index=True)
    refresh_token_hash = Column(String, unique=True, nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    last_used_at = Column(DateTime(timezone=True), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=False, index=True)
    revoked_at = Column(DateTime(timezone=True), nullable=True, index=True)
    revoked_reason = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)
    ip_address = Column(String, nullable=True)

    user = relationship("User", back_populates="auth_sessions")


class WebPushSubscription(Base):
    """A browser/device's Web Push subscription for a user.

    A user may have multiple subscriptions (one per browser/device). The endpoint
    URL is unique per browser-VAPID pair, so it's used as the dedup key. The
    p256dh and auth values come straight from the PushSubscription.getKey()
    output on the client and are needed to encrypt push payloads.
    """

    __tablename__ = "web_push_subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    endpoint = Column(Text, nullable=False)
    p256dh = Column(String(255), nullable=False)
    auth = Column(String(255), nullable=False)
    user_agent = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_used_at = Column(DateTime(timezone=True), nullable=True)

    user = relationship("User")

    __table_args__ = (
        UniqueConstraint("user_id", "endpoint", name="uq_web_push_endpoint_per_user"),
    )
