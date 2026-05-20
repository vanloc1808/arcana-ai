"""reseed Thoth and Marseille decks on databases where ab1c2d3e4f56 left them empty

Revision ID: f2a3b4c5d6e7
Revises: e1f2a3b4c5d6
Create Date: 2026-05-20 00:01:00.000000+00:00

Some production databases have migration ab1c2d3e4f56 marked applied but
contain only the Rider-Waite deck — the deck inserts never ran (likely
because the constraint swap raised on PostgreSQL and the transaction was
later force-stamped). The subsequent image/name update migrations
(cd2e3f4a5b67 for Thoth, de4f5a6b7c89 for Marseille) then no-op'd because
their target decks did not exist.

This migration brings such databases up to the intended state:

1. Defensively swap UNIQUE(cards.name) → UNIQUE(name, deck_id) if not done.
2. Insert "Thoth Tarot" and "Tarot de Marseille" decks if missing.
3. Copy Rider-Waite cards into any deck that has zero cards.
4. Re-invoke the upgrade() bodies of cd2e3f4a5b67 and de4f5a6b7c89 — both
   are name-based and idempotent, so they're safe on databases where they
   already ran.

On a database where ab1c2d3e4f56 already inserted the decks successfully,
steps 2–3 are no-ops and step 4 is a redundant rerun of update statements
that already match (zero rows affected).
"""
from __future__ import annotations

import importlib.util
from pathlib import Path
from typing import Sequence, Union

from alembic import op
from sqlalchemy import inspect as sa_inspect, text


revision: str = "f2a3b4c5d6e7"
down_revision: Union[str, None] = "e1f2a3b4c5d6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


DECKS = [
    {
        "name": "Thoth Tarot",
        "description": (
            "Designed by Aleister Crowley and painted by Lady Frieda Harris (1938-1943). "
            "Steeped in Hermetic Qabalah, astrology, and Thelemic symbolism. Renames "
            "several majors (e.g., Strength → Lust, Justice → Adjustment) and replaces "
            "the Page/Knight/King court with Princess/Prince/Knight."
        ),
    },
    {
        "name": "Tarot de Marseille",
        "description": (
            "The classical 17th–18th century French pattern that predates Rider-Waite. "
            "Minor arcana are pip cards rather than scenic. Justice is trump VIII and "
            "Strength is trump XI — the opposite of the Rider-Waite numbering."
        ),
    },
]


def _swap_unique_constraint_sqlite(connection) -> None:
    connection.execute(text("ALTER TABLE cards RENAME TO cards_old"))
    connection.execute(text("""
        CREATE TABLE cards (
            id INTEGER NOT NULL PRIMARY KEY,
            name VARCHAR NOT NULL,
            suit VARCHAR,
            rank VARCHAR,
            image_url VARCHAR,
            description_short VARCHAR,
            description_upright VARCHAR,
            description_reversed VARCHAR,
            element VARCHAR,
            astrology VARCHAR,
            numerology INTEGER,
            deck_id INTEGER NOT NULL,
            FOREIGN KEY(deck_id) REFERENCES decks (id),
            UNIQUE (name, deck_id)
        )
    """))
    connection.execute(text("""
        INSERT INTO cards (
            id, name, suit, rank, image_url, description_short,
            description_upright, description_reversed, element, astrology,
            numerology, deck_id
        )
        SELECT
            id, name, suit, rank, image_url, description_short,
            description_upright, description_reversed, element, astrology,
            numerology, deck_id
        FROM cards_old
    """))
    connection.execute(text("DROP TABLE cards_old"))
    connection.execute(text("CREATE INDEX IF NOT EXISTS ix_cards_id ON cards (id)"))
    connection.execute(text("CREATE INDEX IF NOT EXISTS ix_cards_deck_id ON cards (deck_id)"))
    connection.execute(text(
        "CREATE UNIQUE INDEX IF NOT EXISTS ix_cards_name_deck_id ON cards (name, deck_id)"
    ))


def _swap_unique_constraint_generic(connection, inspector) -> None:
    dropped: set[str] = set()
    for constraint in inspector.get_unique_constraints("cards"):
        if constraint.get("column_names") == ["name"] and constraint["name"] not in dropped:
            op.drop_constraint(constraint["name"], "cards", type_="unique")
            dropped.add(constraint["name"])
    inspector = sa_inspect(connection)
    for index in inspector.get_indexes("cards"):
        if (
            index.get("column_names") == ["name"]
            and index.get("unique")
            and index["name"] not in dropped
        ):
            op.drop_index(index["name"], table_name="cards")
            dropped.add(index["name"])
    op.create_unique_constraint("ix_cards_name_deck_id", "cards", ["name", "deck_id"])


def _ensure_composite_unique(connection) -> None:
    inspector = sa_inspect(connection)
    existing_index_names = {idx["name"] for idx in inspector.get_indexes("cards")}
    existing_uniques = {c["name"] for c in inspector.get_unique_constraints("cards")}
    if "ix_cards_name_deck_id" in existing_index_names or "ix_cards_name_deck_id" in existing_uniques:
        return
    if connection.dialect.name == "sqlite":
        _swap_unique_constraint_sqlite(connection)
    else:
        _swap_unique_constraint_generic(connection, inspector)


def _load_sibling_migration(filename: str):
    """Load a sibling migration module by filename (their names start with a date
    prefix that isn't a valid Python identifier, so we can't `import` them)."""
    path = Path(__file__).parent / filename
    spec = importlib.util.spec_from_file_location(f"_reseed_dep_{filename}", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def upgrade() -> None:
    connection = op.get_bind()

    _ensure_composite_unique(connection)

    rider_waite_id = connection.execute(
        text("SELECT id FROM decks WHERE name = 'Rider-Waite Tarot'")
    ).scalar()
    if rider_waite_id is None:
        print("Warning: Rider-Waite Tarot deck not found – skipping reseed")
        return

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
            print(f"Copied Rider-Waite cards into '{deck_info['name']}' (id={deck_id})")

    # Re-apply the Thoth name/image and Marseille image updates. Both are
    # name-based and idempotent, so safe to rerun.
    thoth_mig = _load_sibling_migration(
        "20260422_000001_cd2e3f4a5b67_update_thoth_deck_images_and_names.py"
    )
    thoth_mig.upgrade()

    marseille_mig = _load_sibling_migration(
        "20260422_000002_de4f5a6b7c89_update_marseille_deck_images.py"
    )
    marseille_mig.upgrade()


def downgrade() -> None:
    """No-op: this migration only repairs databases left in a partial state by
    earlier migrations. There is no meaningful reverse operation — running the
    downgrade of ab1c2d3e4f56 (when supported) will remove these decks."""
    pass
