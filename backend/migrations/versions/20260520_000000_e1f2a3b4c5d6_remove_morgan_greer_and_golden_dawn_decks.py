"""remove Morgan-Greer and Golden Dawn tarot decks

Revision ID: e1f2a3b4c5d6
Revises: add_ad_views_table
Create Date: 2026-05-20 00:00:00.000000+00:00

Earlier revisions of migration ab1c2d3e4f56 seeded "Morgan-Greer Tarot" and
"Golden Dawn Tarot" decks. That migration was later edited to drop them, but
databases that already ran the original version still have the decks (and the
copied Rider-Waite cards). This migration removes them from those databases.
"""
from typing import Sequence, Union

from alembic import op
from sqlalchemy import text


revision: str = "e1f2a3b4c5d6"
down_revision: Union[str, None] = "add_ad_views_table"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


DECK_NAMES = ("Morgan-Greer Tarot", "Golden Dawn Tarot")


def upgrade() -> None:
    connection = op.get_bind()
    for name in DECK_NAMES:
        deck_id = connection.execute(
            text("SELECT id FROM decks WHERE name = :name"),
            {"name": name},
        ).scalar()
        if deck_id is None:
            continue
        connection.execute(
            text("DELETE FROM cards WHERE deck_id = :deck_id"),
            {"deck_id": deck_id},
        )
        connection.execute(
            text("DELETE FROM decks WHERE id = :deck_id"),
            {"deck_id": deck_id},
        )


def downgrade() -> None:
    """No-op: the deck definitions were removed from migration ab1c2d3e4f56,
    so we cannot reliably reinsert them here."""
    pass
