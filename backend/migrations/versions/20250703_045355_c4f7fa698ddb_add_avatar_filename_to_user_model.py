"""Add avatar_filename to user model

Revision ID: c4f7fa698ddb
Revises: a40a63247210
Create Date: 2025-07-03 04:53:55.902906+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import text


# revision identifiers, used by Alembic.
revision: str = 'c4f7fa698ddb'
down_revision: Union[str, None] = 'a40a63247210'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Check if avatar_filename column exists before adding it
    connection = op.get_bind()

    # Check if column exists (SQLite compatible)
    result = connection.execute(text("PRAGMA table_info(users)"))
    columns = [row[1] for row in result.fetchall()]

    if 'avatar_filename' not in columns:
        op.add_column('users', sa.Column('avatar_filename', sa.String(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    # Check if avatar_filename column exists before dropping it
    connection = op.get_bind()

    # Check if column exists (SQLite compatible)
    result = connection.execute(text("PRAGMA table_info(users)"))
    columns = [row[1] for row in result.fetchall()]

    if 'avatar_filename' in columns:
        op.drop_column('users', sa.Column('avatar_filename'))
