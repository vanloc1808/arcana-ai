"""drop ad_views table and ad_turns columns on databases that ran the removed migration

Revision ID: a1b2c3d4e5f6
Revises: f2a3b4c5d6e7
Create Date: 2026-05-21 00:00:00.000000+00:00

The ad-watching turn system was removed. The migration that created
``ad_views`` and the ``users.ad_turns_earned_today`` / ``users.ad_turns_reset_date``
columns has been deleted from history, but databases that already ran it
still carry that schema. This migration drops them if present; on fresh
databases it is a no-op.
"""
from typing import Sequence, Union

from alembic import op
from sqlalchemy import inspect as sa_inspect


revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, None] = "f2a3b4c5d6e7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


AD_COLUMNS = ("ad_turns_earned_today", "ad_turns_reset_date")


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa_inspect(bind)

    if "ad_views" in inspector.get_table_names():
        op.drop_table("ad_views")

    user_columns = {col["name"] for col in inspector.get_columns("users")}
    columns_to_drop = [name for name in AD_COLUMNS if name in user_columns]
    if columns_to_drop:
        with op.batch_alter_table("users") as batch_op:
            for column_name in columns_to_drop:
                batch_op.drop_column(column_name)


def downgrade() -> None:
    # The ad-watching feature has been removed; recreating the schema is
    # intentionally not supported.
    pass
