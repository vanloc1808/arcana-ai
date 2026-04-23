"""add additional tarot decks

Revision ID: ab1c2d3e4f56
Revises: 58b706ad7d4e
Create Date: 2026-04-22 00:00:00.000000+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import text, inspect as sa_inspect

revision: str = 'ab1c2d3e4f56'
down_revision: Union[str, None] = '58b706ad7d4e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


DECKS = [
    {
        "name": "Thoth Tarot",
        "description": (
            "Created by Aleister Crowley and Lady Frieda Harris in 1943, the Thoth Tarot "
            "blends Kabbalistic symbolism, astrology, and hermetic philosophy with striking "
            "geometric artwork. Features renamed cards like Lust (Strength) and Adjustment (Justice)."
        ),
    },
    {
        "name": "Tarot de Marseille",
        "description": (
            "One of the oldest and most influential tarot traditions, originating in "
            "16th-century France. Known for its bold woodcut style, vivid primary colors, "
            "and pip-based minor arcana. The foundation from which most modern decks evolved."
        ),
    },
    {
        "name": "Morgan-Greer Tarot",
        "description": (
            "A vibrant 1979 deck inspired by Rider-Waite, featuring bold close-up imagery "
            "with rich, warm colors and expressive borderless figures. Emphasizes emotional "
            "depth and intuitive reading with a modern artistic sensibility."
        ),
    },
    {
        "name": "Golden Dawn Tarot",
        "description": (
            "Rooted in the Hermetic Order of the Golden Dawn's esoteric teachings from the "
            "late 19th century. Blends astrology, numerology, Kabbalah, and ceremonial magic "
            "symbolism. The intellectual ancestor of both Rider-Waite and Thoth traditions."
        ),
    },
]


def upgrade() -> None:
    """Add 4 new tarot decks and fix the unique constraint on cards.name."""
    connection = op.get_bind()
    inspector = sa_inspect(connection)

    # Step 1: Replace the single-column unique constraint on cards.name
    # with a composite unique constraint on (name, deck_id).
    # This allows the same card name to exist in multiple decks.

    # Drop the named unique index (added in migration efa035b1f5e8)
    existing_indexes = {idx['name'] for idx in inspector.get_indexes('cards')}
    if 'ix_cards_name' in existing_indexes:
        op.drop_index('ix_cards_name', table_name='cards')

    # Find and drop any remaining unique constraints on name alone
    unique_constraints = inspector.get_unique_constraints('cards')
    name_only_constraints = [c for c in unique_constraints if c['column_names'] == ['name']]

    with op.batch_alter_table('cards', schema=None, recreate='always') as batch_op:
        for constraint in name_only_constraints:
            try:
                batch_op.drop_constraint(constraint['name'], type_='unique')
            except Exception as e:
                print(f"Note: could not drop constraint '{constraint['name']}': {e}")

        # Create composite unique: one card name per deck
        batch_op.create_index(
            'ix_cards_name_deck_id',
            ['name', 'deck_id'],
            unique=True,
        )

    # Step 2: Get the Rider-Waite deck id (created in migration 2d033e0e569b)
    result = connection.execute(
        text("SELECT id FROM decks WHERE name = 'Rider-Waite Tarot'")
    )
    row = result.fetchone()
    if not row:
        print("Warning: Rider-Waite Tarot deck not found – skipping card copy")
        return
    rider_waite_id = row[0]

    # Step 3: Insert each new deck and copy Rider-Waite cards into it.
    # image_url is copied from the Rider-Waite cards so every card shows a real
    # working image immediately via the existing Cloudflare CDN.  The CDN images
    # are the same artwork for now; replace image_url per-card once deck-specific
    # artwork (Thoth, Marseille, etc.) is uploaded to the CDN.
    for deck_info in DECKS:
        connection.execute(
            text("INSERT INTO decks (name, description) VALUES (:name, :desc)"),
            {"name": deck_info["name"], "desc": deck_info["description"]},
        )

        result = connection.execute(
            text("SELECT id FROM decks WHERE name = :name"),
            {"name": deck_info["name"]},
        )
        new_deck_id = result.fetchone()[0]

        connection.execute(
            text("""
                INSERT INTO cards
                    (name, suit, rank, description_short, description_upright,
                     description_reversed, element, astrology, numerology, deck_id,
                     image_url)
                SELECT
                    name, suit, rank, description_short, description_upright,
                    description_reversed, element, astrology, numerology, :new_deck_id,
                    image_url
                FROM cards
                WHERE deck_id = :rider_waite_id
            """),
            {"new_deck_id": new_deck_id, "rider_waite_id": rider_waite_id},
        )
        print(f"Created deck '{deck_info['name']}' (id={new_deck_id}) with 78 cards")


def downgrade() -> None:
    """Remove the 4 new decks and restore the single-column unique constraint."""
    connection = op.get_bind()

    for deck_info in DECKS:
        result = connection.execute(
            text("SELECT id FROM decks WHERE name = :name"),
            {"name": deck_info["name"]},
        )
        row = result.fetchone()
        if row:
            deck_id = row[0]
            connection.execute(
                text("DELETE FROM cards WHERE deck_id = :deck_id"),
                {"deck_id": deck_id},
            )
            connection.execute(
                text("DELETE FROM decks WHERE id = :deck_id"),
                {"deck_id": deck_id},
            )

    # Restore single-column unique index on name
    inspector = sa_inspect(connection)
    existing_indexes = {idx['name'] for idx in inspector.get_indexes('cards')}
    if 'ix_cards_name_deck_id' in existing_indexes:
        op.drop_index('ix_cards_name_deck_id', table_name='cards')

    op.create_index(op.f('ix_cards_name'), 'cards', ['name'], unique=True)
