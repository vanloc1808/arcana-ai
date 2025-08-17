"""populate data for card

Revision ID: 2d033e0e569b
Revises: cc2dc4063546
Create Date: 2025-06-08 04:51:21.728589+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import table, column
from sqlalchemy import Integer, String, DateTime


# revision identifiers, used by Alembic.
revision: str = '2d033e0e569b'
down_revision: Union[str, None] = 'cc2dc4063546'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Create connection
    connection = op.get_bind()

    # Create a Rider-Waite Tarot deck
    decks_table = table('decks',
        column('id', Integer),
        column('name', String),
        column('description', String),
        column('created_at', DateTime)
    )

    # Insert the Rider-Waite Tarot deck
    op.execute(
        decks_table.insert().values(
            name='Rider-Waite Tarot',
            description='The classic Rider-Waite Tarot deck, featuring 78 cards including 22 Major Arcana and 56 Minor Arcana cards.'
        )
    )

    # Get the deck ID that was just inserted
    result = connection.execute(sa.text("SELECT id FROM decks WHERE name = 'Rider-Waite Tarot'"))
    deck_id = result.fetchone()[0]

    # Ensure deck_id column exists
    inspector = sa.inspect(connection)
    columns = [col['name'] for col in inspector.get_columns('cards')]
    if 'deck_id' not in columns:
        with op.batch_alter_table('cards', schema=None) as batch_op:
            batch_op.add_column(sa.Column('deck_id', sa.Integer(), nullable=True))

    # Update all existing cards to belong to this deck
    op.execute(sa.text(f"UPDATE cards SET deck_id = {deck_id} WHERE deck_id IS NULL"))

    # Make card name nullable using batch operations for SQLite compatibility
    with op.batch_alter_table('cards', schema=None) as batch_op:
        batch_op.alter_column('name',
                   existing_type=sa.VARCHAR(length=255),
                   nullable=True)


def downgrade() -> None:
    """Downgrade schema."""
    # Make card name non-nullable using batch operations for SQLite compatibility
    with op.batch_alter_table('cards', schema=None) as batch_op:
        batch_op.alter_column('name',
                   existing_type=sa.VARCHAR(length=255),
                   nullable=False)

    # Remove deck associations from cards
    op.execute(sa.text("UPDATE cards SET deck_id = NULL"))

    # Remove the Rider-Waite Tarot deck
    op.execute(sa.text("DELETE FROM decks WHERE name = 'Rider-Waite Tarot'"))
