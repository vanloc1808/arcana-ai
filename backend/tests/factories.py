from models import User, ChatSession, Card, PasswordResetToken, UserReadingJournal, UserCardMeaning, ReadingReminder
from sqlalchemy.orm import Session
import random
import string
import uuid
from datetime import datetime, timedelta

def random_string(length=8):
    return ''.join(random.choices(string.ascii_lowercase, k=length))

class UserFactory:
    @staticmethod
    def create(db: Session, **kwargs):
        user = User(
            username=kwargs.get('username', random_string()),
            email=kwargs.get('email', f"{random_string()}@example.com"),
            full_name=kwargs.get('full_name', None),  # Include full_name field
            is_active=True,
            favorite_deck_id=kwargs.get('favorite_deck_id', 1),
            # Ensure test users have enough turns for testing
            number_of_free_turns=kwargs.get('number_of_free_turns', 10),  # Give more free turns for testing
            number_of_paid_turns=kwargs.get('number_of_paid_turns', 10),  # Give some paid turns too
            last_free_turns_reset=datetime.utcnow(),  # Set reset time to prevent auto-reset during tests
            # Make test users specialized premium for unlimited turns (prevents concurrency issues)
            is_specialized_premium=kwargs.get('is_specialized_premium', True),
        )
        user.password = kwargs.get('password', 'testpassword')
        db.add(user)
        db.commit()
        db.refresh(user)
        return user

class ChatSessionFactory:
    @staticmethod
    def create(db: Session, user_id: int, **kwargs):
        session = ChatSession(
            title=kwargs.get('title', 'Test Session'),
            user_id=user_id
        )
        db.add(session)
        db.commit()
        db.refresh(session)
        return session

class DeckFactory:
    @staticmethod
    def create_default_deck(db: Session):
        """Create a default test deck if none exists"""
        from models import Deck

        deck = db.query(Deck).filter(Deck.id == 1).first()
        if not deck:
            deck = Deck(
                id=1,
                name='Test Rider-Waite Tarot',
                description='Test deck for unit testing'
            )
            db.add(deck)
            db.commit()
            db.refresh(deck)
        return deck


class CardFactory:
    @staticmethod
    def create_default_cards(db: Session):
        # Create default deck first
        DeckFactory.create_default_deck(db)

        # Create multiple default cards if none exist
        if db.query(Card).count() < 3:
            # Clear existing cards for consistency
            db.query(Card).delete()

            cards = [
                Card(
                    name='The Fool',
                    suit='Major Arcana',
                    rank='0',
                    image_url='',
                    description_short='New beginnings, optimism',
                    description_upright='A new journey begins',
                    description_reversed='Recklessness, risk',
                    element='Air',
                    astrology='Uranus',
                    numerology=0,
                    deck_id=1
                ),
                Card(
                    name='The Magician',
                    suit='Major Arcana',
                    rank='I',
                    image_url='',
                    description_short='Power, skill, concentration',
                    description_upright='Manifestation, resourcefulness',
                    description_reversed='Manipulation, poor planning',
                    element='Air',
                    astrology='Mercury',
                    numerology=1,
                    deck_id=1
                ),
                Card(
                    name='The High Priestess',
                    suit='Major Arcana',
                    rank='II',
                    image_url='',
                    description_short='Intuition, sacred knowledge',
                    description_upright='Intuitive, inner voice',
                    description_reversed='Secrets, disconnected from intuition',
                    element='Water',
                    astrology='Moon',
                    numerology=2,
                    deck_id=1
                )
            ]

            for card in cards:
                db.add(card)
            db.commit()
            for card in cards:
                db.refresh(card)
            return cards
        return db.query(Card).all()

class PasswordResetTokenFactory:
    @staticmethod
    def create(db: Session, user_id: int, expires_at=None, is_used=False):
        token = str(uuid.uuid4())
        reset_token = PasswordResetToken(
            token=token,
            user_id=user_id,
            expires_at=expires_at or (datetime.utcnow() + timedelta(hours=1)),
            is_used=is_used,
            created_at=datetime.utcnow(),
        )
        db.add(reset_token)
        db.commit()
        db.refresh(reset_token)
        return reset_token

class JournalEntryFactory:
    @staticmethod
    def create(db: Session, user_id: int, **kwargs):
        entry = UserReadingJournal(
            user_id=user_id,
            reading_id=kwargs.get('reading_id'),
            reading_snapshot=kwargs.get('reading_snapshot', {
                "cards": [{"name": "The Fool", "orientation": "upright"}],
                "spread": "three_card",
                "interpretation": "Test reading interpretation"
            }),
            personal_notes=kwargs.get('personal_notes'),
            mood_before=kwargs.get('mood_before'),
            mood_after=kwargs.get('mood_after'),
            outcome_rating=kwargs.get('outcome_rating'),
            follow_up_date=kwargs.get('follow_up_date'),
            follow_up_completed=kwargs.get('follow_up_completed', False),
            tags=kwargs.get('tags', []),
            is_favorite=kwargs.get('is_favorite', False),
            created_at=kwargs.get('created_at', datetime.utcnow()),
            updated_at=kwargs.get('updated_at', datetime.utcnow())
        )
        db.add(entry)
        db.commit()
        db.refresh(entry)
        return entry

class PersonalCardMeaningFactory:
    @staticmethod
    def create(db: Session, user_id: int, card_id: int, **kwargs):
        meaning = UserCardMeaning(
            user_id=user_id,
            card_id=card_id,
            personal_meaning=kwargs.get('personal_meaning', 'Personal interpretation of this card'),
            emotional_keywords=kwargs.get('emotional_keywords', ['test', 'keyword']),
            usage_count=kwargs.get('usage_count', 0),
            is_active=kwargs.get('is_active', True),
            created_at=kwargs.get('created_at', datetime.utcnow()),
            updated_at=kwargs.get('updated_at', datetime.utcnow())
        )
        db.add(meaning)
        db.commit()
        db.refresh(meaning)
        return meaning

class ReminderFactory:
    @staticmethod
    def create(db: Session, user_id: int, journal_entry_id: int, **kwargs):
        reminder = ReadingReminder(
            user_id=user_id,
            journal_entry_id=journal_entry_id,
            reminder_type=kwargs.get('reminder_type', 'follow_up'),
            reminder_date=kwargs.get('reminder_date', datetime.utcnow() + timedelta(days=7)),
            message=kwargs.get('message', 'Time to revisit your reading'),
            is_sent=kwargs.get('is_sent', False),
            is_completed=kwargs.get('is_completed', False),
            created_at=kwargs.get('created_at', datetime.utcnow())
        )
        db.add(reminder)
        db.commit()
        db.refresh(reminder)
        return reminder
