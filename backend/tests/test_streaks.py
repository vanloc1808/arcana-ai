"""Tests for the streak + achievement service and API."""
from datetime import UTC, date, datetime, timedelta

from fastapi import status

from models import (
    ChatSession,
    Message,
    TurnUsageHistory,
    UserAchievement,
    UserReadingJournal,
    UserStreak,
)
from services.streak_service import (
    _streak_lengths,
    recompute_from_history,
    record_activity,
)


class TestStreakMath:
    def test_empty_set(self):
        today = date(2026, 5, 21)
        assert _streak_lengths(set(), today) == (0, 0)

    def test_single_day_today(self):
        today = date(2026, 5, 21)
        assert _streak_lengths({today}, today) == (1, 1)

    def test_single_day_yesterday_still_active(self):
        today = date(2026, 5, 21)
        assert _streak_lengths({today - timedelta(days=1)}, today) == (1, 1)

    def test_single_day_two_days_ago_broken(self):
        today = date(2026, 5, 21)
        current, longest = _streak_lengths({today - timedelta(days=2)}, today)
        assert current == 0
        assert longest == 1

    def test_consecutive_run_ending_today(self):
        today = date(2026, 5, 21)
        active = {today - timedelta(days=i) for i in range(5)}
        assert _streak_lengths(active, today) == (5, 5)

    def test_broken_streak_keeps_longest(self):
        today = date(2026, 5, 21)
        # 10-day run ending 5 days ago, plus today
        old_run = {today - timedelta(days=5 + i) for i in range(10)}
        active = old_run | {today}
        current, longest = _streak_lengths(active, today)
        assert current == 1
        assert longest == 10


class TestRecordActivity:
    def test_creates_streak_row_on_first_activity(self, db_session, test_user):
        codes = record_activity(db_session, test_user.id, date(2026, 5, 21))
        db_session.commit()
        streak = db_session.query(UserStreak).filter_by(user_id=test_user.id).one()
        assert streak.current_streak == 1
        assert streak.longest_streak == 1
        assert streak.last_activity_date == date(2026, 5, 21)
        assert "FIRST_READING" not in codes  # no message/reading yet, just activity
        assert codes == []

    def test_consecutive_days_extend_streak(self, db_session, test_user):
        record_activity(db_session, test_user.id, date(2026, 5, 19))
        record_activity(db_session, test_user.id, date(2026, 5, 20))
        record_activity(db_session, test_user.id, date(2026, 5, 21))
        db_session.commit()
        streak = db_session.query(UserStreak).filter_by(user_id=test_user.id).one()
        assert streak.current_streak == 3
        assert streak.longest_streak == 3
        assert streak.total_active_days == 3

    def test_same_day_does_not_double_count(self, db_session, test_user):
        record_activity(db_session, test_user.id, date(2026, 5, 21))
        record_activity(db_session, test_user.id, date(2026, 5, 21))
        db_session.commit()
        streak = db_session.query(UserStreak).filter_by(user_id=test_user.id).one()
        assert streak.current_streak == 1
        assert streak.total_active_days == 1

    def test_gap_resets_current_streak(self, db_session, test_user):
        record_activity(db_session, test_user.id, date(2026, 5, 10))
        record_activity(db_session, test_user.id, date(2026, 5, 11))
        record_activity(db_session, test_user.id, date(2026, 5, 21))
        db_session.commit()
        streak = db_session.query(UserStreak).filter_by(user_id=test_user.id).one()
        assert streak.current_streak == 1
        assert streak.longest_streak == 2


class TestRecomputeFromHistory:
    def test_backfills_from_journal_entries(self, db_session, test_user):
        # Three journal entries on three consecutive days
        base = datetime(2026, 5, 19, 12, 0, tzinfo=UTC)
        for i in range(3):
            entry = UserReadingJournal(
                user_id=test_user.id,
                reading_snapshot={"cards": []},
            )
            db_session.add(entry)
            db_session.flush()
            entry.created_at = base + timedelta(days=i)
        db_session.commit()

        streak = recompute_from_history(db_session, test_user.id)
        db_session.commit()
        assert streak.longest_streak == 3
        assert streak.total_active_days == 3
        # FIRST_JOURNAL unlocked
        codes = {ua.code for ua in db_session.query(UserAchievement).filter_by(user_id=test_user.id).all()}
        assert "FIRST_JOURNAL" in codes
        assert "STREAK_3" in codes

    def test_backfills_unions_all_sources(self, db_session, test_user):
        # Journal day 1, chat message day 2, turn history day 3
        d1 = datetime(2026, 5, 19, 10, 0, tzinfo=UTC)
        d2 = datetime(2026, 5, 20, 10, 0, tzinfo=UTC)
        d3 = datetime(2026, 5, 21, 10, 0, tzinfo=UTC)

        entry = UserReadingJournal(user_id=test_user.id, reading_snapshot={"cards": []})
        db_session.add(entry)
        db_session.flush()
        entry.created_at = d1

        session = ChatSession(title="t", user_id=test_user.id)
        db_session.add(session)
        db_session.flush()
        msg = Message(chat_session_id=session.id, content="hi", role="user")
        db_session.add(msg)
        db_session.flush()
        msg.created_at = d2

        usage = TurnUsageHistory(
            user_id=test_user.id,
            turn_type="paid",
            usage_context="reading",
            turns_before=10,
            turns_after=9,
            feature_used="tarot_reading",
        )
        db_session.add(usage)
        db_session.flush()
        usage.consumed_at = d3
        db_session.commit()

        streak = recompute_from_history(db_session, test_user.id)
        db_session.commit()
        assert streak.total_active_days == 3
        assert streak.longest_streak == 3

    def test_backfill_unlocks_first_reading_from_history(self, db_session, test_user):
        session = ChatSession(title="t", user_id=test_user.id)
        db_session.add(session)
        db_session.flush()
        msg = Message(chat_session_id=session.id, content="hi", role="user")
        db_session.add(msg)
        db_session.commit()

        recompute_from_history(db_session, test_user.id)
        db_session.commit()
        codes = {ua.code for ua in db_session.query(UserAchievement).filter_by(user_id=test_user.id).all()}
        assert "FIRST_READING" in codes


class TestStreakAPI:
    def test_get_my_progress_returns_locked_achievements(self, client, auth_headers):
        response = client.get("/api/streaks/me", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["streak"]["current_streak"] == 0
        assert data["streak"]["longest_streak"] == 0
        assert isinstance(data["achievements"], list)
        assert len(data["achievements"]) >= 5
        for item in data["achievements"]:
            assert item["unlocked"] is False
            assert item["unlocked_at"] is None

    def test_journal_entry_creation_records_streak(self, client, auth_headers, test_user, db_session):
        user_id = test_user.id
        entry_data = {
            "reading_snapshot": {"cards": [], "spread": "single_card"},
            "personal_notes": "test",
        }
        response = client.post("/api/journal/entries", json=entry_data, headers=auth_headers)
        assert response.status_code == status.HTTP_201_CREATED

        streak = db_session.query(UserStreak).filter_by(user_id=user_id).one()
        assert streak.current_streak >= 1
        assert streak.total_active_days >= 1

        progress = client.get("/api/streaks/me", headers=auth_headers).json()
        codes = {a["code"]: a["unlocked"] for a in progress["achievements"]}
        assert codes["FIRST_JOURNAL"] is True

    def test_recompute_endpoint_rebuilds_state(self, client, auth_headers, test_user, db_session):
        user_id = test_user.id
        # Seed historical journal entries directly
        base = datetime(2025, 1, 1, 12, 0, tzinfo=UTC)
        for i in range(5):
            entry = UserReadingJournal(user_id=user_id, reading_snapshot={"cards": []})
            db_session.add(entry)
            db_session.flush()
            entry.created_at = base + timedelta(days=i)
        db_session.commit()

        response = client.post("/api/streaks/recompute", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["streak"]["longest_streak"] == 5
        assert data["streak"]["total_active_days"] == 5
        codes = {a["code"]: a["unlocked"] for a in data["achievements"]}
        assert codes["FIRST_JOURNAL"] is True
        assert codes["STREAK_3"] is True

    def test_get_my_progress_requires_auth(self, client):
        response = client.get("/api/streaks/me")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
