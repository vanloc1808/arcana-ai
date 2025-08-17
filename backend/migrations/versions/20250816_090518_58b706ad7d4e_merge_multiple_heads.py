"""merge multiple heads

Revision ID: 58b706ad7d4e
Revises: f0a8a7c02d69, c8d9e3f1a4b5
Create Date: 2025-08-16 09:05:18.571933+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '58b706ad7d4e'
down_revision: Union[str, None] = ('f0a8a7c02d69', 'c8d9e3f1a4b5')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
