"""add Relationship Cross spread for compatibility readings

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-05-21 02:00:00.000000+00:00

Inserts a 5-card relationship-focused spread. Idempotent: skips if a
spread with the same name already exists. Used by the new
``POST /tarot/compatibility`` endpoint.
"""

import json
from collections.abc import Sequence
from typing import Union

import sqlalchemy as sa
from alembic import op

revision: str = "c3d4e5f6a7b8"
down_revision: Union[str, None] = "b2c3d4e5f6a7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


SPREAD_NAME = "Relationship Cross"
SPREAD_DESCRIPTION = (
    "A five-card spread for compatibility readings. Each card illuminates one "
    "facet of the bond between two people: their individual presences in the "
    "relationship, the connection that links them, the challenge that tests "
    "them, and where the relationship is headed."
)
POSITIONS = [
    {"index": 0, "name": "You", "description": "How the first person shows up in the relationship", "x": 25, "y": 50},
    {"index": 1, "name": "Them", "description": "How the second person shows up in the relationship", "x": 75, "y": 50},
    {"index": 2, "name": "The Connection", "description": "What binds you — the shared current between you", "x": 50, "y": 25},
    {"index": 3, "name": "The Challenge", "description": "What tests the bond — friction, blind spot, or growth edge", "x": 50, "y": 75},
    {"index": 4, "name": "The Outcome", "description": "Where the relationship is heading if the current course holds", "x": 50, "y": 50},
]


def upgrade() -> None:
    bind = op.get_bind()
    existing = bind.execute(
        sa.text("SELECT id FROM spreads WHERE name = :name"), {"name": SPREAD_NAME}
    ).first()
    if existing:
        return
    bind.execute(
        sa.text(
            "INSERT INTO spreads (name, description, num_cards, positions) "
            "VALUES (:name, :description, :num_cards, :positions)"
        ),
        {
            "name": SPREAD_NAME,
            "description": SPREAD_DESCRIPTION,
            "num_cards": len(POSITIONS),
            "positions": json.dumps(POSITIONS),
        },
    )


def downgrade() -> None:
    bind = op.get_bind()
    bind.execute(sa.text("DELETE FROM spreads WHERE name = :name"), {"name": SPREAD_NAME})
