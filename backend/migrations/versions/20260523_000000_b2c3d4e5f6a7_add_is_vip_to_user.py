"""add is_vip field to user

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-05-23 00:00:00.000000+00:00

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "b2c3d4e5f6a7"
down_revision: Union[str, None] = "a1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("is_vip", sa.Boolean(), nullable=True))
    op.execute("UPDATE users SET is_vip = false WHERE is_vip IS NULL")
    op.execute("UPDATE users SET is_vip = true WHERE username = 'msc.mon'")


def downgrade() -> None:
    op.drop_column("users", "is_vip")
