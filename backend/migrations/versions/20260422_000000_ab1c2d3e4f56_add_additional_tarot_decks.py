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
]


def _swap_unique_constraint_sqlite(connection) -> None:
    """Rebuild the cards table on SQLite to drop the unnamed UNIQUE(name) constraint.

    SQLite cannot drop an unnamed UNIQUE constraint via ALTER TABLE, and
    batch_alter_table(recreate='always') fails when SQLAlchemy reflects an
    unnamed constraint and cannot render it. Manual rebuild is required.
    """
    connection.execute(text("ALTER TABLE cards RENAME TO cards_old"))
    connection.execute(text("""
        CREATE TABLE cards (
            id INTEGER NOT NULL,
            name VARCHAR(255) NOT NULL,
            suit VARCHAR(50),
            rank VARCHAR(50),
            image_url VARCHAR(512),
            description_short VARCHAR(255),
            description_upright VARCHAR,
            description_reversed VARCHAR,
            element VARCHAR(50),
            astrology VARCHAR(100),
            numerology INTEGER,
            deck_id INTEGER,
            PRIMARY KEY (id),
            CONSTRAINT fk_cards_deck_id FOREIGN KEY (deck_id) REFERENCES decks (id)
        )
    """))
    connection.execute(text("""
        INSERT INTO cards (id, name, suit, rank, image_url, description_short,
                           description_upright, description_reversed, element,
                           astrology, numerology, deck_id)
        SELECT id, name, suit, rank, image_url, description_short,
               description_upright, description_reversed, element,
               astrology, numerology, deck_id
        FROM cards_old
    """))
    connection.execute(text("DROP TABLE cards_old"))

    connection.execute(text("CREATE INDEX IF NOT EXISTS ix_cards_id ON cards (id)"))
    connection.execute(text("CREATE INDEX IF NOT EXISTS ix_cards_deck_id ON cards (deck_id)"))
    connection.execute(text(
        "CREATE UNIQUE INDEX IF NOT EXISTS ix_cards_name_deck_id ON cards (name, deck_id)"
    ))


def _swap_unique_constraint_generic(connection, inspector) -> None:
    """Drop any single-column UNIQUE on cards.name and add the composite UNIQUE(name, deck_id).

    Used for dialects that support ALTER TABLE … DROP CONSTRAINT (e.g. PostgreSQL).
    """
    # Dropping a UNIQUE constraint also removes its backing index, so we must
    # avoid re-dropping the same name when the inspector reports it twice.
    dropped: set[str] = set()

    # Drop any unique constraint whose only column is `name` (Postgres auto-names
    # the one created by sa.UniqueConstraint("name") as `cards_name_key`).
    for constraint in inspector.get_unique_constraints('cards'):
        if constraint.get('column_names') == ['name'] and constraint['name'] not in dropped:
            op.drop_constraint(constraint['name'], 'cards', type_='unique')
            dropped.add(constraint['name'])

    # Re-reflect: the previous drops may have invalidated cached index metadata.
    inspector = sa_inspect(connection)
    for index in inspector.get_indexes('cards'):
        if (
            index.get('column_names') == ['name']
            and index.get('unique')
            and index['name'] not in dropped
        ):
            op.drop_index(index['name'], table_name='cards')
            dropped.add(index['name'])

    op.create_unique_constraint('ix_cards_name_deck_id', 'cards', ['name', 'deck_id'])


def upgrade() -> None:
    """Add the new tarot decks and switch cards.name uniqueness to a composite key.

    Idempotent so it can be retried on a database left in a partial state by a
    previous failed run. Handles SQLite and PostgreSQL (and any other dialect
    that supports ALTER TABLE … DROP CONSTRAINT).
    """
    connection = op.get_bind()
    dialect = connection.dialect.name
    inspector = sa_inspect(connection)

    # Step 1: replace UNIQUE(name) with UNIQUE(name, deck_id).
    # Skip if the composite constraint/index is already in place.
    existing_index_names = {idx['name'] for idx in inspector.get_indexes('cards')}
    existing_uniques = {c['name'] for c in inspector.get_unique_constraints('cards')}
    if 'ix_cards_name_deck_id' not in existing_index_names and 'ix_cards_name_deck_id' not in existing_uniques:
        if dialect == 'sqlite':
            _swap_unique_constraint_sqlite(connection)
        else:
            _swap_unique_constraint_generic(connection, inspector)

    # Step 2: locate the Rider-Waite deck. New decks are seeded with its cards.
    rider_waite_id = connection.execute(
        text("SELECT id FROM decks WHERE name = 'Rider-Waite Tarot'")
    ).scalar()
    if rider_waite_id is None:
        print("Warning: Rider-Waite Tarot deck not found – skipping new deck creation")
        return

    # Step 3: insert decks that are missing and seed their cards from Rider-Waite.
    for deck_info in DECKS:
        deck_id = connection.execute(
            text("SELECT id FROM decks WHERE name = :name"),
            {"name": deck_info["name"]},
        ).scalar()
        if deck_id is None:
            connection.execute(
                text("INSERT INTO decks (name, description) VALUES (:name, :desc)"),
                {"name": deck_info["name"], "desc": deck_info["description"]},
            )
            deck_id = connection.execute(
                text("SELECT id FROM decks WHERE name = :name"),
                {"name": deck_info["name"]},
            ).scalar()
            print(f"Created deck '{deck_info['name']}' (id={deck_id})")

        existing_card_count = connection.execute(
            text("SELECT COUNT(*) FROM cards WHERE deck_id = :deck_id"),
            {"deck_id": deck_id},
        ).scalar()
        if existing_card_count == 0:
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
                {"new_deck_id": deck_id, "rider_waite_id": rider_waite_id},
            )
            print(f"Copied Rider-Waite cards into deck '{deck_info['name']}' (id={deck_id})")


def downgrade() -> None:
    """Remove the added decks and restore the single-column unique on cards.name."""
    connection = op.get_bind()
    dialect = connection.dialect.name

    for deck_info in DECKS:
        deck_id = connection.execute(
            text("SELECT id FROM decks WHERE name = :name"),
            {"name": deck_info["name"]},
        ).scalar()
        if deck_id is not None:
            connection.execute(
                text("DELETE FROM cards WHERE deck_id = :deck_id"),
                {"deck_id": deck_id},
            )
            connection.execute(
                text("DELETE FROM decks WHERE id = :deck_id"),
                {"deck_id": deck_id},
            )

    inspector = sa_inspect(connection)
    existing_index_names = {idx['name'] for idx in inspector.get_indexes('cards')}
    existing_uniques = {c['name'] for c in inspector.get_unique_constraints('cards')}

    if dialect == 'sqlite':
        if 'ix_cards_name_deck_id' in existing_index_names:
            op.drop_index('ix_cards_name_deck_id', table_name='cards')
        connection.execute(text(
            "CREATE UNIQUE INDEX IF NOT EXISTS ix_cards_name ON cards (name)"
        ))
    else:
        if 'ix_cards_name_deck_id' in existing_uniques:
            op.drop_constraint('ix_cards_name_deck_id', 'cards', type_='unique')
        elif 'ix_cards_name_deck_id' in existing_index_names:
            op.drop_index('ix_cards_name_deck_id', table_name='cards')
        op.create_index(op.f('ix_cards_name'), 'cards', ['name'], unique=True)
