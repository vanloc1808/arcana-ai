"""add composite index on chat_sessions (user_id, created_at)

Revision ID: a6b7c8d9e0f1
Revises: e5f6a7b8c9d0
Create Date: 2026-05-24 00:00:00.000000+00:00

The GET /chat/sessions/ endpoint filters by ``user_id`` and orders by
``created_at`` descending. Only single-column indexes existed, forcing a
separate sort step over all of a user's rows. This composite index lets the
database return the rows already ordered.
"""

from collections.abc import Sequence
from typing import Union

from alembic import op
from sqlalchemy import inspect as sa_inspect

revision: str = "a6b7c8d9e0f1"
down_revision: Union[str, None] = "e5f6a7b8c9d0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

INDEX_NAME = "ix_chat_sessions_user_id_created_at"
TABLE_NAME = "chat_sessions"


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa_inspect(bind)
    existing = {idx["name"] for idx in inspector.get_indexes(TABLE_NAME)}
    if INDEX_NAME not in existing:
        op.create_index(INDEX_NAME, TABLE_NAME, ["user_id", "created_at"], unique=False)


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa_inspect(bind)
    existing = {idx["name"] for idx in inspector.get_indexes(TABLE_NAME)}
    if INDEX_NAME in existing:
        op.drop_index(INDEX_NAME, table_name=TABLE_NAME)
