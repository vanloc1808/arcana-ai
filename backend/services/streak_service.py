"""Streak and achievement service.

Activity is bucketed by UTC calendar date. Any of these counts as activity
for a date: a journal entry created, a chat message authored by the user, a
turn consumed (reading), or a card-of-the-day pull.

`record_activity` is called from the routers after a qualifying action and
updates the per-user streak row plus evaluates newly-unlocked achievements.
`recompute_from_history` rebuilds the streak row and all earned achievements
from existing tables — used by the migration backfill and an admin endpoint.
"""

from __future__ import annotations

from datetime import UTC, date, datetime, timedelta

from sqlalchemy import func
from sqlalchemy.orm import Session

from models import (
    Card,
    ChatSession,
    DailyCardPull,
    Message,
    MessageCardAssociation,
    TurnUsageHistory,
    UserAchievement,
    UserReadingJournal,
    UserStreak,
)
from services.achievements import REGISTRY, UserStats, evaluate


def _today_utc() -> date:
    return datetime.now(UTC).date()


def _collect_active_dates(db: Session, user_id: int) -> set[date]:
    """Union of all historical activity dates for a user.

    Raw timestamps are fetched and bucketed to UTC dates in Python rather than
    via a SQL ``date()`` call, so the logic is identical on SQLite (local) and
    PostgreSQL/Supabase (production) regardless of server version.
    """
    active: set[date] = set()

    journal_ts = (
        db.query(UserReadingJournal.created_at)
        .filter(UserReadingJournal.user_id == user_id)
        .all()
    )
    for (ts,) in journal_ts:
        if ts:
            active.add(_as_date(ts))

    message_ts = (
        db.query(Message.created_at)
        .join(ChatSession, Message.chat_session_id == ChatSession.id)
        .filter(ChatSession.user_id == user_id, Message.role == "user")
        .all()
    )
    for (ts,) in message_ts:
        if ts:
            active.add(_as_date(ts))

    turn_ts = (
        db.query(TurnUsageHistory.consumed_at)
        .filter(TurnUsageHistory.user_id == user_id)
        .all()
    )
    for (ts,) in turn_ts:
        if ts:
            active.add(_as_date(ts))

    pull_dates = (
        db.query(DailyCardPull.pull_date)
        .filter(DailyCardPull.user_id == user_id)
        .all()
    )
    for (d,) in pull_dates:
        if d:
            active.add(_as_date(d))

    return active


def _as_date(value) -> date:
    """SQLAlchemy date() returns a string on SQLite and a date on Postgres."""
    if isinstance(value, date) and not isinstance(value, datetime):
        return value
    if isinstance(value, datetime):
        return value.date()
    return date.fromisoformat(str(value))


def _streak_lengths(active_dates: set[date], today: date) -> tuple[int, int]:
    """Return (current_streak, longest_streak).

    Current streak is non-zero only if today or yesterday is in the set,
    counted backward from the most recent activity day."""
    if not active_dates:
        return 0, 0

    sorted_dates = sorted(active_dates)
    longest = 1
    run = 1
    for prev, curr in zip(sorted_dates, sorted_dates[1:]):
        if (curr - prev).days == 1:
            run += 1
            longest = max(longest, run)
        else:
            run = 1

    last = sorted_dates[-1]
    if last not in (today, today - timedelta(days=1)):
        current = 0
    else:
        current = 1
        cursor = last
        while (cursor - timedelta(days=1)) in active_dates:
            cursor -= timedelta(days=1)
            current += 1

    return current, longest


def _build_stats(db: Session, user_id: int, streak: UserStreak) -> UserStats:
    journal_count = (
        db.query(func.count(UserReadingJournal.id))
        .filter(UserReadingJournal.user_id == user_id)
        .scalar()
        or 0
    )
    message_count = (
        db.query(func.count(Message.id))
        .join(ChatSession, Message.chat_session_id == ChatSession.id)
        .filter(ChatSession.user_id == user_id, Message.role == "user")
        .scalar()
        or 0
    )
    reading_count = (
        db.query(func.count(TurnUsageHistory.id))
        .filter(TurnUsageHistory.user_id == user_id)
        .scalar()
        or 0
    )
    distinct_major = (
        db.query(func.count(func.distinct(Card.id)))
        .join(MessageCardAssociation, MessageCardAssociation.card_id == Card.id)
        .join(Message, Message.id == MessageCardAssociation.message_id)
        .join(ChatSession, ChatSession.id == Message.chat_session_id)
        .filter(ChatSession.user_id == user_id, Card.suit == "Major Arcana")
        .scalar()
        or 0
    )
    daily_pulls = (
        db.query(func.count(DailyCardPull.id))
        .filter(DailyCardPull.user_id == user_id)
        .scalar()
        or 0
    )

    return UserStats(
        total_active_days=streak.total_active_days,
        longest_streak=streak.longest_streak,
        current_streak=streak.current_streak,
        journal_entry_count=journal_count,
        message_count=message_count,
        reading_count=reading_count,
        distinct_major_arcana_drawn=distinct_major,
        daily_card_pull_count=daily_pulls,
    )


def _get_or_create_streak(db: Session, user_id: int) -> UserStreak:
    streak = db.query(UserStreak).filter(UserStreak.user_id == user_id).one_or_none()
    if streak is None:
        streak = UserStreak(user_id=user_id, current_streak=0, longest_streak=0, total_active_days=0)
        db.add(streak)
        db.flush()
    return streak


def _apply_activity_date(streak: UserStreak, activity_date: date) -> bool:
    """Update streak fields for a new activity date. Returns True if it was a new day."""
    last = streak.last_activity_date
    if last == activity_date:
        return False
    if last is None or activity_date - last > timedelta(days=1):
        streak.current_streak = 1
    elif activity_date - last == timedelta(days=1):
        streak.current_streak = (streak.current_streak or 0) + 1
    else:
        # activity_date is in the past relative to last; defer to full recompute
        return False
    streak.last_activity_date = activity_date
    streak.longest_streak = max(streak.longest_streak or 0, streak.current_streak)
    streak.total_active_days = (streak.total_active_days or 0) + 1
    return True


def record_activity(db: Session, user_id: int, activity_date: date | None = None) -> list[str]:
    """Record activity for a user and unlock any newly-earned achievements.

    Returns the list of newly-unlocked achievement codes. The caller is
    responsible for committing the surrounding transaction.
    """
    activity_date = activity_date or _today_utc()
    streak = _get_or_create_streak(db, user_id)
    _apply_activity_date(streak, activity_date)
    return _evaluate_and_persist(db, user_id, streak)


def _evaluate_and_persist(db: Session, user_id: int, streak: UserStreak) -> list[str]:
    already = {
        code
        for (code,) in db.query(UserAchievement.code).filter(UserAchievement.user_id == user_id).all()
    }
    stats = _build_stats(db, user_id, streak)
    newly = evaluate(stats, already)
    for ach in newly:
        db.add(UserAchievement(user_id=user_id, code=ach.code))
    if newly:
        db.flush()
    return [a.code for a in newly]


def recompute_from_history(db: Session, user_id: int) -> UserStreak:
    """Rebuild the streak row and re-evaluate achievements from existing data."""
    today = _today_utc()
    active_dates = _collect_active_dates(db, user_id)
    current, longest = _streak_lengths(active_dates, today)
    last = max(active_dates) if active_dates else None

    streak = _get_or_create_streak(db, user_id)
    streak.current_streak = current
    streak.longest_streak = longest
    streak.last_activity_date = last
    streak.total_active_days = len(active_dates)
    db.flush()

    _evaluate_and_persist(db, user_id, streak)
    return streak


def get_progress_snapshot(db: Session, user_id: int) -> tuple[UserStreak, UserStats, set[str]]:
    """Bundle used by the GET endpoints."""
    streak = _get_or_create_streak(db, user_id)
    stats = _build_stats(db, user_id, streak)
    unlocked = {
        code
        for (code,) in db.query(UserAchievement.code).filter(UserAchievement.user_id == user_id).all()
    }
    return streak, stats, unlocked


def list_all_achievements() -> list[dict]:
    """Public catalog used by the frontend."""
    return [
        {"code": a.code, "title": a.title, "description": a.description}
        for a in REGISTRY
    ]
