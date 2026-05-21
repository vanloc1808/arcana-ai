"""add user streaks, achievements, and daily card pulls + backfill from history

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-05-21 01:00:00.000000+00:00

Creates three new tables and backfills streak state and earned achievements
from the user's existing UserReadingJournal entries, chat messages, and
TurnUsageHistory rows. Backfill is done in pure SQL via the migration's bind
so it does not depend on importable application services.
"""
from collections import defaultdict
from collections.abc import Sequence
from datetime import UTC, date, datetime, timedelta
from typing import Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect as sa_inspect

revision: str = "b2c3d4e5f6a7"
down_revision: Union[str, None] = "a1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# Mirrors services.achievements.REGISTRY. Kept here so the migration is
# self-contained — predicates take a `stats` dict.
ACHIEVEMENTS = (
    ("FIRST_READING", lambda s: s["reading_count"] >= 1 or s["message_count"] >= 1),
    ("FIRST_JOURNAL", lambda s: s["journal_count"] >= 1),
    ("STREAK_3", lambda s: s["longest_streak"] >= 3),
    ("STREAK_7", lambda s: s["longest_streak"] >= 7),
    ("STREAK_30", lambda s: s["longest_streak"] >= 30),
    ("STREAK_100", lambda s: s["longest_streak"] >= 100),
    ("JOURNAL_10", lambda s: s["journal_count"] >= 10),
    ("JOURNAL_50", lambda s: s["journal_count"] >= 50),
    ("MAJOR_ARCANA_COMPLETE", lambda s: s["distinct_major"] >= 22),
    ("DAILY_CARD_7", lambda s: s["daily_pull_count"] >= 7),
    ("DAILY_CARD_30", lambda s: s["daily_pull_count"] >= 30),
)


def _as_date(value) -> date | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    try:
        return date.fromisoformat(str(value)[:10])
    except ValueError:
        return None


def _streak_lengths(active_dates: set[date], today: date) -> tuple[int, int]:
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


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa_inspect(bind)
    existing_tables = set(inspector.get_table_names())

    if "user_streaks" not in existing_tables:
        op.create_table(
            "user_streaks",
            sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
            sa.Column("current_streak", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("longest_streak", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("last_activity_date", sa.Date(), nullable=True),
            sa.Column("total_active_days", sa.Integer(), nullable=False, server_default="0"),
            sa.Column(
                "updated_at",
                sa.DateTime(timezone=True),
                server_default=sa.func.now(),
                nullable=True,
            ),
        )
        op.create_index("ix_user_streaks_last_activity_date", "user_streaks", ["last_activity_date"])

    if "user_achievements" not in existing_tables:
        op.create_table(
            "user_achievements",
            sa.Column("id", sa.Integer(), primary_key=True, index=True),
            sa.Column(
                "user_id",
                sa.Integer(),
                sa.ForeignKey("users.id", ondelete="CASCADE"),
                nullable=False,
                index=True,
            ),
            sa.Column("code", sa.String(length=64), nullable=False, index=True),
            sa.Column(
                "unlocked_at",
                sa.DateTime(timezone=True),
                server_default=sa.func.now(),
                nullable=False,
            ),
            sa.Column("progress", sa.JSON(), nullable=True),
            sa.UniqueConstraint("user_id", "code", name="uq_user_achievement_code"),
        )

    if "daily_card_pulls" not in existing_tables:
        op.create_table(
            "daily_card_pulls",
            sa.Column("id", sa.Integer(), primary_key=True, index=True),
            sa.Column(
                "user_id",
                sa.Integer(),
                sa.ForeignKey("users.id", ondelete="CASCADE"),
                nullable=False,
                index=True,
            ),
            sa.Column("pull_date", sa.Date(), nullable=False, index=True),
            sa.Column("card_id", sa.Integer(), sa.ForeignKey("cards.id", ondelete="SET NULL"), nullable=True),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.func.now(),
                nullable=True,
            ),
            sa.UniqueConstraint("user_id", "pull_date", name="uq_daily_card_pull_per_day"),
        )

    _backfill(bind)


def _backfill(bind) -> None:
    today = datetime.now(UTC).date()

    user_rows = bind.execute(sa.text("SELECT id FROM users")).fetchall()
    user_ids = [row[0] for row in user_rows]
    if not user_ids:
        return

    journal_rows = bind.execute(
        sa.text("SELECT user_id, created_at FROM user_reading_journal")
    ).fetchall()
    message_rows = bind.execute(
        sa.text(
            "SELECT cs.user_id, m.created_at "
            "FROM messages m JOIN chat_sessions cs ON cs.id = m.chat_session_id "
            "WHERE m.role = 'user'"
        )
    ).fetchall()
    turn_rows = bind.execute(
        sa.text("SELECT user_id, consumed_at FROM turn_usage_history")
    ).fetchall()

    active_by_user: dict[int, set[date]] = defaultdict(set)
    journal_count_by_user: dict[int, int] = defaultdict(int)
    message_count_by_user: dict[int, int] = defaultdict(int)
    reading_count_by_user: dict[int, int] = defaultdict(int)

    for user_id, ts in journal_rows:
        d = _as_date(ts)
        if d:
            active_by_user[user_id].add(d)
        journal_count_by_user[user_id] += 1

    for user_id, ts in message_rows:
        d = _as_date(ts)
        if d:
            active_by_user[user_id].add(d)
        message_count_by_user[user_id] += 1

    for user_id, ts in turn_rows:
        d = _as_date(ts)
        if d:
            active_by_user[user_id].add(d)
        reading_count_by_user[user_id] += 1

    distinct_major_rows = bind.execute(
        sa.text(
            "SELECT cs.user_id, COUNT(DISTINCT c.id) "
            "FROM message_cards mc "
            "JOIN messages m ON m.id = mc.message_id "
            "JOIN chat_sessions cs ON cs.id = m.chat_session_id "
            "JOIN cards c ON c.id = mc.card_id "
            "WHERE c.suit = 'Major Arcana' "
            "GROUP BY cs.user_id"
        )
    ).fetchall()
    distinct_major_by_user = {row[0]: row[1] for row in distinct_major_rows}

    streak_insert = sa.text(
        "INSERT INTO user_streaks "
        "(user_id, current_streak, longest_streak, last_activity_date, total_active_days) "
        "VALUES (:user_id, :current_streak, :longest_streak, :last_activity_date, :total_active_days)"
    )
    achievement_insert = sa.text(
        "INSERT INTO user_achievements (user_id, code, unlocked_at) "
        "VALUES (:user_id, :code, :unlocked_at)"
    )
    now = datetime.now(UTC)

    for user_id in user_ids:
        active = active_by_user.get(user_id, set())
        current, longest = _streak_lengths(active, today)
        last = max(active) if active else None
        bind.execute(
            streak_insert,
            {
                "user_id": user_id,
                "current_streak": current,
                "longest_streak": longest,
                "last_activity_date": last,
                "total_active_days": len(active),
            },
        )

        stats = {
            "longest_streak": longest,
            "journal_count": journal_count_by_user.get(user_id, 0),
            "message_count": message_count_by_user.get(user_id, 0),
            "reading_count": reading_count_by_user.get(user_id, 0),
            "distinct_major": distinct_major_by_user.get(user_id, 0),
            "daily_pull_count": 0,
        }
        for code, predicate in ACHIEVEMENTS:
            if predicate(stats):
                bind.execute(
                    achievement_insert,
                    {"user_id": user_id, "code": code, "unlocked_at": now},
                )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa_inspect(bind)
    existing_tables = set(inspector.get_table_names())

    if "daily_card_pulls" in existing_tables:
        op.drop_table("daily_card_pulls")
    if "user_achievements" in existing_tables:
        op.drop_table("user_achievements")
    if "user_streaks" in existing_tables:
        op.drop_table("user_streaks")
