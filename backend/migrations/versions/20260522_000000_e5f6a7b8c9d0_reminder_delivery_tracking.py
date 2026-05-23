"""add delivery tracking columns to reading_reminders

Revision ID: e5f6a7b8c9d0
Revises: d4e5f6a7b8c9
Create Date: 2026-05-22 00:00:00.000000+00:00

Adds ``delivery_attempts`` and ``last_attempt_at`` so the web-push reminder
task can distinguish a delivered reminder from one that merely failed to
send, and bound retries instead of marking every attempted row as sent.
"""

from collections.abc import Sequence
from typing import Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect as sa_inspect

revision: str = "e5f6a7b8c9d0"
down_revision: Union[str, None] = "d4e5f6a7b8c9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa_inspect(bind)
    columns = {col["name"] for col in inspector.get_columns("reading_reminders")}

    with op.batch_alter_table("reading_reminders") as batch_op:
        if "delivery_attempts" not in columns:
            batch_op.add_column(
                sa.Column("delivery_attempts", sa.Integer(), nullable=False, server_default="0")
            )
        if "last_attempt_at" not in columns:
            batch_op.add_column(sa.Column("last_attempt_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa_inspect(bind)
    columns = {col["name"] for col in inspector.get_columns("reading_reminders")}

    with op.batch_alter_table("reading_reminders") as batch_op:
        if "last_attempt_at" in columns:
            batch_op.drop_column("last_attempt_at")
        if "delivery_attempts" in columns:
            batch_op.drop_column("delivery_attempts")
