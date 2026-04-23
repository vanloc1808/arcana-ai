"""add ad_views table and ad turn fields to users

Revision ID: add_ad_views_table
Revises: 58b706ad7d4e
Create Date: 2026-04-23 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "add_ad_views_table"
down_revision: Union[str, None] = "58b706ad7d4e"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add ad-watching fields to users table
    op.add_column("users", sa.Column("ad_turns_earned_today", sa.Integer(), nullable=True, server_default="0"))
    op.add_column("users", sa.Column("ad_turns_reset_date", sa.Date(), nullable=True))

    # Create ad_views table
    op.create_table(
        "ad_views",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False, index=True),
        sa.Column("ad_provider", sa.String(), nullable=False, server_default="adsterra"),
        sa.Column("turns_awarded", sa.Integer(), server_default="1"),
        sa.Column("viewed_at", sa.DateTime(timezone=True), server_default=sa.func.now(), index=True),
    )


def downgrade() -> None:
    op.drop_table("ad_views")
    op.drop_column("users", "ad_turns_reset_date")
    op.drop_column("users", "ad_turns_earned_today")
