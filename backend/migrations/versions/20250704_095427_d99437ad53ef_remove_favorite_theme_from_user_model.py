"""Remove favorite_theme from user model

Revision ID: d99437ad53ef
Revises: d2a379714fa8
Create Date: 2025-07-04 09:54:27.421435+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd99437ad53ef'
down_revision: Union[str, None] = 'd2a379714fa8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Remove favorite_theme column from users table."""
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.drop_column('favorite_theme')


def downgrade() -> None:
    """Add back favorite_theme column to users table."""
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.add_column(sa.Column('favorite_theme', sa.String(), nullable=True, default=''))
