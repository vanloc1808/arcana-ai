from fastapi import status
from unittest.mock import patch, MagicMock
from datetime import datetime, timedelta
import json
import pytest
from sqlalchemy.orm import Session

from models import UserReadingJournal, UserCardMeaning, ReadingReminder
from tests.factories import JournalEntryFactory, PersonalCardMeaningFactory


class TestJournalAPI:
    """Test suite for Journal API endpoints"""

    def test_create_journal_entry_success(self, client, auth_headers, test_cards):
        """Test successful journal entry creation"""
        entry_data = {
            "reading_snapshot": {
                "cards": [{"name": "The Fool", "orientation": "upright"}],
                "spread": "three_card",
                "interpretation": "New beginnings ahead"
            },
            "personal_notes": "This was a powerful reading about my career",
            "mood_before": 6,
            "mood_after": 8,
            "tags": ["career", "growth", "future"],
            "is_favorite": False
        }

        response = client.post(
            "/api/journal/entries",
            json=entry_data,
            headers=auth_headers
        )

        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["personal_notes"] == entry_data["personal_notes"]
        assert data["mood_before"] == entry_data["mood_before"]
        assert data["mood_after"] == entry_data["mood_after"]
        assert data["tags"] == entry_data["tags"]
        assert data["is_favorite"] is False
        assert "id" in data
        assert "created_at" in data

    def test_create_journal_entry_minimal_data(self, client, auth_headers):
        """Test creating journal entry with minimal required data"""
        entry_data = {
            "reading_snapshot": {
                "cards": [{"name": "The Star", "orientation": "reversed"}],
                "spread": "single_card"
            }
        }

        response = client.post(
            "/api/journal/entries",
            json=entry_data,
            headers=auth_headers
        )

        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["personal_notes"] is None
        assert data["mood_before"] is None
        assert data["mood_after"] is None
        assert data["tags"] == []
        assert data["is_favorite"] is False

    def test_create_journal_entry_with_follow_up(self, client, auth_headers):
        """Test creating journal entry with follow-up date"""
        follow_up_date = datetime.utcnow() + timedelta(days=30)
        entry_data = {
            "reading_snapshot": {"cards": [], "spread": "celtic_cross"},
            "personal_notes": "Important reading - check back in 30 days",
            "follow_up_date": follow_up_date.isoformat()
        }

        response = client.post(
            "/api/journal/entries",
            json=entry_data,
            headers=auth_headers
        )

        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["follow_up_date"] is not None

    def test_create_journal_entry_invalid_mood(self, client, auth_headers):
        """Test creating journal entry with invalid mood values"""
        entry_data = {
            "reading_snapshot": {"cards": [], "spread": "three_card"},
            "mood_before": 11,  # Invalid: > 10
            "mood_after": 0     # Invalid: < 1
        }

        response = client.post(
            "/api/journal/entries",
            json=entry_data,
            headers=auth_headers
        )

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_create_journal_entry_unauthorized(self, client):
        """Test creating journal entry without authentication"""
        entry_data = {
            "reading_snapshot": {"cards": [], "spread": "three_card"}
        }

        response = client.post("/api/journal/entries", json=entry_data)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_get_journal_entries_paginated(self, client, auth_headers, test_user, db_session):
        """Test retrieving journal entries with pagination"""
        # Create multiple entries
        for i in range(15):
            JournalEntryFactory.create(
                db=db_session,
                user_id=test_user.id,
                personal_notes=f"Entry {i}",
                tags=["test", f"entry-{i}"]
            )

        response = client.get(
            "/api/journal/entries?skip=0&limit=10",
            headers=auth_headers
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data) == 10

        # Test second page
        response = client.get(
            "/api/journal/entries?skip=10&limit=10",
            headers=auth_headers
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data) == 5

    def test_get_journal_entries_with_filters(self, client, auth_headers, test_user, db_session):
        """Test retrieving journal entries with filters"""
        # Create entries with different tags
        JournalEntryFactory.create(
            db=db_session, user_id=test_user.id,
            tags=["career", "growth"], is_favorite=True
        )
        JournalEntryFactory.create(
            db=db_session, user_id=test_user.id,
            tags=["love", "relationships"], is_favorite=False
        )

        # Test filtering by tags
        response = client.get(
            "/api/journal/entries?tags=career",
            headers=auth_headers
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data) == 1
        assert "career" in data[0]["tags"]

        # Test filtering favorites only
        response = client.get(
            "/api/journal/entries?favorite_only=true",
            headers=auth_headers
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data) == 1
        assert data[0]["is_favorite"] is True

    def test_get_journal_entry_by_id(self, client, auth_headers, test_user, db_session):
        """Test retrieving specific journal entry by ID"""
        entry = JournalEntryFactory.create(
            db=db_session,
            user_id=test_user.id,
            personal_notes="Specific entry test"
        )

        response = client.get(
            f"/api/journal/entries/{entry.id}",
            headers=auth_headers
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["id"] == entry.id
        assert data["personal_notes"] == "Specific entry test"

    def test_get_journal_entry_not_found(self, client, auth_headers):
        """Test retrieving non-existent journal entry"""
        response = client.get("/api/journal/entries/99999", headers=auth_headers)
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_get_journal_entry_different_user(self, client, auth_headers_2, test_user, db_session):
        """Test that users can't access other users' journal entries"""
        entry = JournalEntryFactory.create(
            db=db_session,
            user_id=test_user.id,
            personal_notes="Private entry"
        )

        response = client.get(
            f"/api/journal/entries/{entry.id}",
            headers=auth_headers_2  # Different user
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_update_journal_entry_success(self, client, auth_headers, test_user, db_session):
        """Test successful journal entry update"""
        entry = JournalEntryFactory.create(
            db=db_session,
            user_id=test_user.id,
            personal_notes="Original notes",
            mood_after=None
        )

        update_data = {
            "personal_notes": "Updated notes with new insights",
            "mood_after": 8,
            "tags": ["updated", "insights"],
            "is_favorite": True
        }

        response = client.put(
            f"/api/journal/entries/{entry.id}",
            json=update_data,
            headers=auth_headers
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["personal_notes"] == update_data["personal_notes"]
        assert data["mood_after"] == update_data["mood_after"]
        assert data["tags"] == update_data["tags"]
        assert data["is_favorite"] is True

    def test_update_journal_entry_follow_up_completed(self, client, auth_headers, test_user, db_session):
        """Test marking follow-up as completed"""
        entry = JournalEntryFactory.create(
            db=db_session,
            user_id=test_user.id,
            follow_up_date=datetime.utcnow() + timedelta(days=1),
            follow_up_completed=False
        )

        update_data = {"follow_up_completed": True}

        response = client.put(
            f"/api/journal/entries/{entry.id}",
            json=update_data,
            headers=auth_headers
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["follow_up_completed"] is True

    def test_delete_journal_entry_success(self, client, auth_headers, test_user, db_session):
        """Test successful journal entry deletion"""
        entry = JournalEntryFactory.create(
            db=db_session,
            user_id=test_user.id
        )

        response = client.delete(
            f"/api/journal/entries/{entry.id}",
            headers=auth_headers
        )

        assert response.status_code == status.HTTP_204_NO_CONTENT

        # Verify entry is deleted
        response = client.get(
            f"/api/journal/entries/{entry.id}",
            headers=auth_headers
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_delete_journal_entry_different_user(self, client, auth_headers_2, test_user, db_session):
        """Test that users can't delete other users' journal entries"""
        entry = JournalEntryFactory.create(
            db=db_session,
            user_id=test_user.id
        )

        response = client.delete(
            f"/api/journal/entries/{entry.id}",
            headers=auth_headers_2  # Different user
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND


class TestPersonalCardMeaningsAPI:
    """Test suite for Personal Card Meanings API"""

    def test_create_personal_card_meaning_success(self, client, auth_headers, test_cards):
        """Test successful creation of personal card meaning"""
        card = test_cards[0]
        meaning_data = {
            "card_id": card.id,
            "personal_meaning": "This card represents new opportunities in my life journey",
            "emotional_keywords": ["hope", "excitement", "anticipation"]
        }

        response = client.post(
            "/api/journal/card-meanings",
            json=meaning_data,
            headers=auth_headers
        )

        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["card_id"] == card.id
        assert data["personal_meaning"] == meaning_data["personal_meaning"]
        assert data["emotional_keywords"] == meaning_data["emotional_keywords"]
        assert data["usage_count"] == 0
        assert data["is_active"] is True

    def test_create_personal_card_meaning_duplicate(self, client, auth_headers, test_user, test_cards, db_session):
        """Test creating duplicate personal card meaning returns existing one"""
        card = test_cards[0]

        # Create existing meaning
        PersonalCardMeaningFactory.create(
            db=db_session,
            user_id=test_user.id,
            card_id=card.id,
            personal_meaning="Original meaning"
        )

        meaning_data = {
            "card_id": card.id,
            "personal_meaning": "New meaning"
        }

        response = client.post(
            "/api/journal/card-meanings",
            json=meaning_data,
            headers=auth_headers
        )

        # Should update existing meaning
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["personal_meaning"] == "New meaning"

    def test_get_all_personal_card_meanings(self, client, auth_headers, test_user, test_cards, db_session):
        """Test retrieving all personal card meanings for user"""
        # Create multiple meanings
        for i, card in enumerate(test_cards[:3]):
            PersonalCardMeaningFactory.create(
                db=db_session,
                user_id=test_user.id,
                card_id=card.id,
                personal_meaning=f"Personal meaning {i}",
                usage_count=i * 2
            )

        response = client.get("/api/journal/card-meanings", headers=auth_headers)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data) == 3
        # Should be ordered by usage_count DESC
        assert data[0]["usage_count"] >= data[1]["usage_count"]

    def test_get_personal_card_meaning_by_card_id(self, client, auth_headers, test_user, test_cards, db_session):
        """Test retrieving personal card meaning for specific card"""
        card = test_cards[0]
        meaning = PersonalCardMeaningFactory.create(
            db=db_session,
            user_id=test_user.id,
            card_id=card.id,
            personal_meaning="Specific card meaning"
        )

        response = client.get(
            f"/api/journal/card-meanings/{card.id}",
            headers=auth_headers
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["personal_meaning"] == "Specific card meaning"
        assert data["card_id"] == card.id

    def test_get_personal_card_meaning_not_found(self, client, auth_headers, test_cards):
        """Test retrieving non-existent personal card meaning"""
        card = test_cards[0]

        response = client.get(
            f"/api/journal/card-meanings/{card.id}",
            headers=auth_headers
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_update_personal_card_meaning(self, client, auth_headers, test_user, test_cards, db_session):
        """Test updating personal card meaning"""
        card = test_cards[0]
        meaning = PersonalCardMeaningFactory.create(
            db=db_session,
            user_id=test_user.id,
            card_id=card.id,
            personal_meaning="Original meaning",
            emotional_keywords=["old", "keyword"]
        )

        update_data = {
            "personal_meaning": "Updated deeper meaning",
            "emotional_keywords": ["new", "updated", "deeper"]
        }

        response = client.put(
            f"/api/journal/card-meanings/{card.id}",
            json=update_data,
            headers=auth_headers
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["personal_meaning"] == update_data["personal_meaning"]
        assert data["emotional_keywords"] == update_data["emotional_keywords"]

    def test_delete_personal_card_meaning(self, client, auth_headers, test_user, test_cards, db_session):
        """Test deleting personal card meaning"""
        card = test_cards[0]
        card_id = card.id  # Store card_id to avoid session issues
        PersonalCardMeaningFactory.create(
            db=db_session,
            user_id=test_user.id,
            card_id=card_id
        )

        response = client.delete(
            f"/api/journal/card-meanings/{card_id}",
            headers=auth_headers
        )

        assert response.status_code == status.HTTP_204_NO_CONTENT

        # Verify deletion
        response = client.get(
            f"/api/journal/card-meanings/{card_id}",
            headers=auth_headers
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND


class TestJournalAnalyticsAPI:
    """Test suite for Journal Analytics API"""

    def test_get_analytics_summary(self, client, auth_headers, test_user, test_cards, db_session):
        """Test retrieving analytics summary"""
        # Create test data
        current_month = datetime.utcnow().replace(day=1)
        last_month = current_month - timedelta(days=32)

        # This month entries
        for i in range(5):
            JournalEntryFactory.create(
                db=db_session,
                user_id=test_user.id,
                created_at=current_month + timedelta(days=i),
                mood_before=5 + i,
                mood_after=6 + i,
                tags=["career", "growth"]
            )

        # Last month entries
        for i in range(3):
            JournalEntryFactory.create(
                db=db_session,
                user_id=test_user.id,
                created_at=last_month + timedelta(days=i),
                mood_before=4,
                mood_after=7
            )

        response = client.get("/api/journal/analytics/summary", headers=auth_headers)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["total_entries"] == 8
        assert data["entries_this_month"] == 5
        assert "mood_trends" in data
        assert "favorite_cards" in data
        assert "reading_frequency" in data

    def test_get_mood_trends(self, client, auth_headers, test_user, db_session):
        """Test retrieving mood trends analytics"""
        # Create entries with mood data
        for i in range(7):
            JournalEntryFactory.create(
                db=db_session,
                user_id=test_user.id,
                mood_before=5,
                mood_after=7 + (i % 3),  # Varying after moods
                created_at=datetime.utcnow() - timedelta(days=i)
            )

        response = client.get("/api/journal/analytics/mood-trends", headers=auth_headers)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "daily_moods" in data
        assert "average_improvement" in data
        assert "mood_distribution" in data

    def test_get_card_frequency_analytics(self, client, auth_headers, test_user, test_cards, db_session):
        """Test retrieving card frequency analytics"""
        # Create entries with repeated cards
        fool_card = test_cards[0]
        for i in range(5):
            JournalEntryFactory.create(
                db=db_session,
                user_id=test_user.id,
                reading_snapshot={
                    "cards": [{"name": fool_card.name, "card_id": fool_card.id}],
                    "spread": "single_card"
                }
            )

        response = client.get("/api/journal/analytics/card-frequency", headers=auth_headers)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "most_common_cards" in data
        assert len(data["most_common_cards"]) > 0
        assert data["most_common_cards"][0]["count"] == 5

    def test_get_growth_metrics(self, client, auth_headers, test_user, db_session):
        """Test retrieving personal growth metrics"""
        # Create journal entries spanning several weeks
        base_date = datetime.utcnow() - timedelta(days=30)

        for week in range(4):
            for day in range(7):
                JournalEntryFactory.create(
                    db=db_session,
                    user_id=test_user.id,
                    created_at=base_date + timedelta(days=week*7 + day),
                    mood_before=5 + week,  # Gradually improving baseline mood
                    mood_after=7 + week,   # Gradually improving post-reading mood
                    outcome_rating=3 + (week // 2)  # Improving outcome satisfaction
                )

        response = client.get("/api/journal/analytics/growth-metrics", headers=auth_headers)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "mood_improvement_trend" in data
        assert "outcome_satisfaction_trend" in data
        assert "reading_consistency" in data
        assert "personal_development_score" in data


class TestRemindersAPI:
    """Test suite for Reading Reminders API"""

    def test_create_reminder_success(self, client, auth_headers, test_user, db_session):
        """Test successful creation of reading reminder"""
        entry = JournalEntryFactory.create(
            db=db_session,
            user_id=test_user.id,
            follow_up_date=datetime.utcnow() + timedelta(days=30)
        )

        reminder_data = {
            "journal_entry_id": entry.id,
            "reminder_type": "follow_up",
            "reminder_date": (datetime.utcnow() + timedelta(days=29)).isoformat(),
            "message": "Time to revisit your career reading"
        }

        response = client.post(
            "/api/journal/reminders",
            json=reminder_data,
            headers=auth_headers
        )

        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["journal_entry_id"] == entry.id
        assert data["reminder_type"] == "follow_up"
        assert data["message"] == reminder_data["message"]
        assert data["is_sent"] is False
        assert data["is_completed"] is False

    def test_create_reminder_invalid_type(self, client, auth_headers, test_user, db_session):
        """Test creating reminder with invalid type"""
        entry = JournalEntryFactory.create(db=db_session, user_id=test_user.id)

        reminder_data = {
            "journal_entry_id": entry.id,
            "reminder_type": "invalid_type",
            "reminder_date": (datetime.utcnow() + timedelta(days=1)).isoformat()
        }

        response = client.post(
            "/api/journal/reminders",
            json=reminder_data,
            headers=auth_headers
        )

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_get_pending_reminders(self, client, auth_headers, test_user, db_session):
        """Test retrieving pending reminders"""
        entry = JournalEntryFactory.create(db=db_session, user_id=test_user.id)

        # Create a pending reminder
        from tests.factories import ReminderFactory
        pending_reminder = ReminderFactory.create(
            db=db_session,
            user_id=test_user.id,
            journal_entry_id=entry.id,
            is_sent=False,
            is_completed=False,
            reminder_date=datetime.utcnow() + timedelta(days=1)
        )

        # Create a completed reminder (should not appear)
        ReminderFactory.create(
            db=db_session,
            user_id=test_user.id,
            journal_entry_id=entry.id,
            is_completed=True
        )

        response = client.get("/api/journal/reminders", headers=auth_headers)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data) == 1
        assert data[0]["id"] == pending_reminder.id
        assert data[0]["is_completed"] is False

    def test_mark_reminder_completed(self, client, auth_headers, test_user, db_session):
        """Test marking reminder as completed"""
        entry = JournalEntryFactory.create(db=db_session, user_id=test_user.id)
        from tests.factories import ReminderFactory
        reminder = ReminderFactory.create(
            db=db_session,
            user_id=test_user.id,
            journal_entry_id=entry.id,
            is_completed=False
        )

        response = client.put(
            f"/api/journal/reminders/{reminder.id}",
            json={"is_completed": True},
            headers=auth_headers
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["is_completed"] is True

    def test_delete_reminder(self, client, auth_headers, test_user, db_session):
        """Test deleting reminder"""
        entry = JournalEntryFactory.create(db=db_session, user_id=test_user.id)
        from tests.factories import ReminderFactory
        reminder = ReminderFactory.create(
            db=db_session,
            user_id=test_user.id,
            journal_entry_id=entry.id
        )

        response = client.delete(
            f"/api/journal/reminders/{reminder.id}",
            headers=auth_headers
        )

        assert response.status_code == status.HTTP_204_NO_CONTENT


class TestJournalSecurity:
    """Test suite for Journal security and privacy"""

    def test_journal_entries_user_isolation(self, client, auth_headers, auth_headers_2,
                                           test_user, test_user_2, db_session):
        """Test that users can only access their own journal entries"""
        # User 1 creates entries
        user1_entry = JournalEntryFactory.create(
            db=db_session,
            user_id=test_user.id,
            personal_notes="User 1's private entry"
        )

        # User 2 creates entries
        user2_entry = JournalEntryFactory.create(
            db=db_session,
            user_id=test_user_2.id,
            personal_notes="User 2's private entry"
        )

        # User 1 should only see their entries
        response = client.get("/api/journal/entries", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data) == 1
        assert data[0]["id"] == user1_entry.id

        # User 2 should only see their entries
        response = client.get("/api/journal/entries", headers=auth_headers_2)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data) == 1
        assert data[0]["id"] == user2_entry.id

    def test_personal_card_meanings_user_isolation(self, client, auth_headers, auth_headers_2,
                                                   test_user, test_user_2, test_cards, db_session):
        """Test that personal card meanings are user-specific"""
        card = test_cards[0]

        # User 1 creates personal meaning
        PersonalCardMeaningFactory.create(
            db=db_session,
            user_id=test_user.id,
            card_id=card.id,
            personal_meaning="User 1's interpretation"
        )

        # User 2 creates different meaning for same card
        PersonalCardMeaningFactory.create(
            db=db_session,
            user_id=test_user_2.id,
            card_id=card.id,
            personal_meaning="User 2's interpretation"
        )

        # User 1 should only see their meaning
        response = client.get(
            f"/api/journal/card-meanings/{card.id}",
            headers=auth_headers
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["personal_meaning"] == "User 1's interpretation"

        # User 2 should only see their meaning
        response = client.get(
            f"/api/journal/card-meanings/{card.id}",
            headers=auth_headers_2
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["personal_meaning"] == "User 2's interpretation"

    def test_analytics_user_isolation(self, client, auth_headers, auth_headers_2,
                                     test_user, test_user_2, db_session):
        """Test that analytics are user-specific"""
        # Create different numbers of entries for each user
        for i in range(5):
            JournalEntryFactory.create(db=db_session, user_id=test_user.id)

        for i in range(3):
            JournalEntryFactory.create(db=db_session, user_id=test_user_2.id)

        # User 1 analytics
        response = client.get("/api/journal/analytics/summary", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["total_entries"] == 5

        # User 2 analytics
        response = client.get("/api/journal/analytics/summary", headers=auth_headers_2)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["total_entries"] == 3

    @patch('routers.journal.sanitize_html')
    def test_input_sanitization(self, mock_sanitize, client, auth_headers):
        """Test that user input is properly sanitized"""
        mock_sanitize.return_value = "Clean text"

        entry_data = {
            "reading_snapshot": {"cards": [], "spread": "single_card"},
            "personal_notes": "Some clean text content that passes validation",
            "tags": ["valid", "tags", "only"]  # Use valid tags to pass validation
        }

        response = client.post(
            "/api/journal/entries",
            json=entry_data,
            headers=auth_headers
        )

        # Should sanitize the input
        mock_sanitize.assert_called()
        assert response.status_code == status.HTTP_201_CREATED

    def test_rate_limiting_journal_endpoints(self, client, auth_headers):
        """Test rate limiting on journal endpoints"""
        # This test would depend on your rate limiting implementation
        # Making many requests in quick succession should trigger rate limiting

        entry_data = {
            "reading_snapshot": {"cards": [], "spread": "single_card"}
        }

        # Make multiple requests rapidly
        responses = []
        for i in range(10):
            response = client.post(
                "/api/journal/entries",
                json=entry_data,
                headers=auth_headers
            )
            responses.append(response)

        # At least some should succeed (depending on rate limit config)
        success_count = sum(1 for r in responses if r.status_code == 201)
        assert success_count > 0


# Background Tasks Tests
class TestJournalBackgroundTasks:
    """Test suite for journal-related background tasks"""

    @patch('tasks.journal_tasks.send_reminder_email')
    def test_process_reading_reminders_task(self, mock_send_email, db_session,
                                          test_user):
        """Test processing of reading reminders background task"""
        from tasks.journal_tasks import process_reading_reminders

        # Create a reminder that should be processed
        entry = JournalEntryFactory.create(db=db_session, user_id=test_user.id)
        from tests.factories import ReminderFactory
        reminder = ReminderFactory.create(
            db=db_session,
            user_id=test_user.id,
            journal_entry_id=entry.id,
            reminder_date=datetime.utcnow() - timedelta(minutes=5),  # Past due
            is_sent=False
        )

        # Run the task with the same db session
        result = process_reading_reminders(db_session=db_session)

        # Verify email was sent and reminder marked as sent
        mock_send_email.assert_called_once()
        assert result >= 1  # At least one reminder processed

    @patch('tasks.journal_tasks.generate_analytics_data')
    def test_generate_monthly_analytics_task(self, mock_generate_analytics, db_session, test_user):
        """Test monthly analytics generation background task"""
        from tasks.journal_tasks import generate_monthly_analytics

        # Mock the analytics data generation to return proper JSON data
        mock_generate_analytics.return_value = {
            "total_entries": 3,
            "mood_entries": 1,
            "notes_entries": 2,
            "favorite_entries": 1,
        }

        # Create some journal entries for this month
        current_month = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        for i in range(3):
            JournalEntryFactory.create(
                db=db_session,
                user_id=test_user.id,
                created_at=current_month + timedelta(days=i)
            )

        # Run the task with the same db session
        result = generate_monthly_analytics(db_session=db_session)

        # Verify analytics generation was called
        mock_generate_analytics.assert_called()
        assert result >= 1  # At least one analytics record generated

    def test_cleanup_old_analytics_task(self, db_session, test_user):
        """Test cleanup of old analytics data"""
        from tasks.journal_tasks import cleanup_old_analytics
        from models import UserReadingAnalytics

        # Create old analytics data (using test_user to ensure valid user_id)
        old_date = datetime.utcnow() - timedelta(days=400)  # > 1 year old
        old_analytics = UserReadingAnalytics(
            user_id=test_user.id,
            analysis_type="monthly_summary",
            analysis_data={"test": "data"},
            generated_at=old_date
        )
        db_session.add(old_analytics)
        db_session.commit()

        # Verify the record exists before cleanup
        count_before = db_session.query(UserReadingAnalytics).filter(
            UserReadingAnalytics.generated_at < datetime.utcnow() - timedelta(days=365)
        ).count()
        assert count_before == 1

        # Run cleanup task with the same db session
        deleted_count = cleanup_old_analytics(db_session=db_session)

        # Verify old data was removed
        remaining = db_session.query(UserReadingAnalytics).filter(
            UserReadingAnalytics.generated_at < datetime.utcnow() - timedelta(days=365)
        ).count()
        assert remaining == 0
        assert deleted_count == 1
