"""add hashed password reset token storage

Revision ID: 20260723_reset_token_hash
Revises: 20260723_login_protection
Create Date: 2026-07-23 02:00:00.000000
"""

import sqlalchemy as sa
from alembic import op

revision = "20260723_reset_token_hash"
down_revision = "20260723_login_protection"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("password_reset_tokens", sa.Column("token_hash", sa.String(), nullable=True))
    op.create_index("ix_password_reset_tokens_token_hash", "password_reset_tokens", ["token_hash"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_password_reset_tokens_token_hash", table_name="password_reset_tokens")
    op.drop_column("password_reset_tokens", "token_hash")
