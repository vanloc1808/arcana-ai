from sqlalchemy import (
    Column,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
)
from sqlalchemy.ext.hybrid import hybrid_property
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from .base import Base


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
    # Composite index backing the session-list query, which filters by user_id
    # and orders by created_at DESC.
    __table_args__ = (Index("ix_chat_sessions_user_id_created_at", "user_id", "created_at"),)

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
