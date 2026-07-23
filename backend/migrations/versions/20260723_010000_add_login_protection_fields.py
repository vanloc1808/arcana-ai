"""add login abuse protection fields

Revision ID: 20260723_login_protection
Revises: 20260723_auth_sessions
Create Date: 2026-07-23 01:00:00.000000
"""

import sqlalchemy as sa
from alembic import op

revision = "20260723_login_protection"
down_revision = "20260723_auth_sessions"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("failed_login_attempts", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("users", sa.Column("login_locked_until", sa.DateTime(timezone=True), nullable=True))
    op.create_index("ix_users_login_locked_until", "users", ["login_locked_until"])
    bind = op.get_bind()
    if bind.dialect.name != "sqlite":
        op.alter_column("users", "failed_login_attempts", server_default=None)


def downgrade() -> None:
    op.drop_index("ix_users_login_locked_until", table_name="users")
    op.drop_column("users", "login_locked_until")
    op.drop_column("users", "failed_login_attempts")
