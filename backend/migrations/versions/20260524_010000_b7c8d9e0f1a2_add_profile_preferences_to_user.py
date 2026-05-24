"""add profile details and reading preferences to user model

Revision ID: b7c8d9e0f1a2
Revises: a6b7c8d9e0f1
Create Date: 2026-05-24 01:00:00.000000+00:00

Adds user-editable profile fields exposed on the /profile page: a free-text
bio, an IANA timezone, and four reading preferences (lunar phase awareness,
card animation style, reading language, and whether reversed cards appear).
"""

from collections.abc import Sequence
from typing import Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect as sa_inspect

revision: str = "b7c8d9e0f1a2"
down_revision: Union[str, None] = "a6b7c8d9e0f1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

TABLE_NAME = "users"


def _new_columns():
    return [
        sa.Column("bio", sa.Text(), nullable=True),
        sa.Column("timezone", sa.String(), nullable=True),
        sa.Column("lunar_phase_awareness", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("card_animations", sa.String(), nullable=False, server_default="cinematic"),
        sa.Column("reading_language", sa.String(), nullable=False, server_default="English"),
        sa.Column("reversed_cards", sa.Boolean(), nullable=False, server_default=sa.true()),
    ]


def upgrade() -> None:
    bind = op.get_bind()
    existing = {col["name"] for col in sa_inspect(bind).get_columns(TABLE_NAME)}
    for column in _new_columns():
        if column.name not in existing:
            op.add_column(TABLE_NAME, column)


def downgrade() -> None:
    bind = op.get_bind()
    existing = {col["name"] for col in sa_inspect(bind).get_columns(TABLE_NAME)}
    for column in reversed(_new_columns()):
        if column.name in existing:
            op.drop_column(TABLE_NAME, column.name)
