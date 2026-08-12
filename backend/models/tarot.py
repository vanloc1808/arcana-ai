from sqlalchemy import (
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from .base import Base


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

    __table_args__ = (
        UniqueConstraint('name', 'deck_id', name='ix_cards_name_deck_id'),
    )

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
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
