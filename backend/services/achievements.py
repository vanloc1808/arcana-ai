"""Achievement registry and evaluation logic.

Achievements are evaluated against a snapshot of user stats and unlocked
when their threshold is met. The registry lives here so backfill (migration)
and runtime hooks share the same definitions.
"""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass


@dataclass(frozen=True)
class Achievement:
    code: str
    title: str
    description: str
    predicate: Callable[[UserStats], bool]


@dataclass
class UserStats:
    """Snapshot of a user's lifetime stats used to evaluate achievements."""

    total_active_days: int = 0
    longest_streak: int = 0
    current_streak: int = 0
    journal_entry_count: int = 0
    message_count: int = 0
    reading_count: int = 0
    distinct_major_arcana_drawn: int = 0
    daily_card_pull_count: int = 0


REGISTRY: tuple[Achievement, ...] = (
    Achievement(
        code="FIRST_READING",
        title="First Steps",
        description="Complete your first tarot reading.",
        predicate=lambda s: s.reading_count >= 1 or s.message_count >= 1,
    ),
    Achievement(
        code="FIRST_JOURNAL",
        title="Dear Diary",
        description="Save your first journal entry.",
        predicate=lambda s: s.journal_entry_count >= 1,
    ),
    Achievement(
        code="STREAK_3",
        title="Three-Day Spark",
        description="Three days of tarot activity in a row.",
        predicate=lambda s: s.longest_streak >= 3,
    ),
    Achievement(
        code="STREAK_7",
        title="Weekly Devotee",
        description="A full week of consecutive tarot activity.",
        predicate=lambda s: s.longest_streak >= 7,
    ),
    Achievement(
        code="STREAK_30",
        title="Lunar Cycle",
        description="Thirty days of consecutive tarot activity.",
        predicate=lambda s: s.longest_streak >= 30,
    ),
    Achievement(
        code="STREAK_100",
        title="Centurion of the Cards",
        description="One hundred days in a row. Astonishing.",
        predicate=lambda s: s.longest_streak >= 100,
    ),
    Achievement(
        code="JOURNAL_10",
        title="Scribe",
        description="Record ten journal entries.",
        predicate=lambda s: s.journal_entry_count >= 10,
    ),
    Achievement(
        code="JOURNAL_50",
        title="Chronicler",
        description="Record fifty journal entries.",
        predicate=lambda s: s.journal_entry_count >= 50,
    ),
    Achievement(
        code="MAJOR_ARCANA_COMPLETE",
        title="Walking the Fool's Journey",
        description="Encounter all 22 Major Arcana cards across your readings.",
        predicate=lambda s: s.distinct_major_arcana_drawn >= 22,
    ),
    Achievement(
        code="DAILY_CARD_7",
        title="Sunrise Ritual",
        description="Pull the card of the day on seven different days.",
        predicate=lambda s: s.daily_card_pull_count >= 7,
    ),
    Achievement(
        code="DAILY_CARD_30",
        title="Faithful Morning",
        description="Pull the card of the day on thirty different days.",
        predicate=lambda s: s.daily_card_pull_count >= 30,
    ),
)


def evaluate(stats: UserStats, already_unlocked: set[str]) -> list[Achievement]:
    """Return achievements newly unlocked by the given stats."""
    return [a for a in REGISTRY if a.code not in already_unlocked and a.predicate(stats)]
