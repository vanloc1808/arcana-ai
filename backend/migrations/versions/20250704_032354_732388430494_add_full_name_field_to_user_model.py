"""add full_name field to user model

Revision ID: 732388430494
Revises: c4f7fa698ddb
Create Date: 2025-07-04 03:23:54.741825+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import text


# revision identifiers, used by Alembic.
revision: str = '732388430494'
down_revision: Union[str, None] = 'c4f7fa698ddb'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Check if full_name column exists before adding it
    connection = op.get_bind()

    # Check if column exists (SQLite compatible)
    result = connection.execute(text("PRAGMA table_info(users)"))
    columns = [row[1] for row in result.fetchall()]

    if 'full_name' not in columns:
        op.add_column('users', sa.Column('full_name', sa.String(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    # Check if full_name column exists before dropping it
    connection = op.get_bind()

    # Check if column exists (SQLite compatible)
    result = connection.execute(text("PRAGMA table_info(users)"))
    columns = [row[1] for row in result.fetchall()]

    if 'full_name' in columns:
        op.drop_column('users', sa.Column('full_name'))
