"""add is_deleted to users

Revision ID: c9d0e1f2a3b4
Revises: b7c8d9e0f1a2
Create Date: 2026-05-25 04:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'c9d0e1f2a3b4'
down_revision = 'b7c8d9e0f1a2'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('users', sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default=sa.false()))
    op.create_index(op.f('ix_users_is_deleted'), 'users', ['is_deleted'], unique=False)
    bind = op.get_bind()
    if bind.dialect.name != "sqlite":
        op.alter_column('users', 'is_deleted', server_default=None)


def downgrade() -> None:
    op.drop_index(op.f('ix_users_is_deleted'), table_name='users')
    op.drop_column('users', 'is_deleted')
