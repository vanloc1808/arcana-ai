"""add_description_short_to_cards_table

Revision ID: 62d8afeb7b5a
Revises: 1506a96ef8b8
Create Date: 2025-05-30 09:01:56.234932+00:00

"""
from typing import Sequence, Union
import json
import os

from alembic import op
import sqlalchemy as sa
from sqlalchemy import text


# revision identifiers, used by Alembic.
revision: str = "62d8afeb7b5a"
down_revision: Union[str, None] = "1506a96ef8b8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Check if the column already exists
    connection = op.get_bind()
    inspector = sa.inspect(connection)
    columns = [col["name"] for col in inspector.get_columns("cards")]

    # Add the new column only if it doesn't exist
    if "description_short" not in columns:
        op.add_column(
            "cards", sa.Column("description_short", sa.String(), nullable=True)
        )
        print("Added description_short column to cards table")
    else:
        print("description_short column already exists, skipping column creation")

    # Load tarot cards data from JSON
    current_dir = os.path.dirname(os.path.abspath(__file__))
    # Go up two directories to reach the backend root
    backend_root = os.path.dirname(os.path.dirname(current_dir))
    json_path = os.path.join(backend_root, "tarot_cards.json")

    try:
        with open(json_path, "r") as f:
            tarot_data = json.load(f)

        # Create mapping of card names to description_short
        card_descriptions = {}

        # Process Major Arcana
        for card in tarot_data.get("major_arcana", []):
            if "description_short" in card:
                card_descriptions[card["name"]] = card["description_short"]

        # Process Minor Arcana
        minor_arcana = tarot_data.get("minor_arcana", {})
        for suit in ["wands", "cups", "swords", "pentacles"]:
            if suit in minor_arcana:
                for card in minor_arcana[suit]:
                    if "description_short" in card:
                        card_descriptions[card["name"]] = card["description_short"]

        # Update cards in database
        updated_count = 0
        for card_name, description_short in card_descriptions.items():
            result = connection.execute(
                text("UPDATE cards SET description_short = :desc WHERE name = :name"),
                {"desc": description_short, "name": card_name},
            )
            if result.rowcount > 0:
                updated_count += 1

        print(f"Updated {updated_count} cards with description_short values")

    except FileNotFoundError:
        print(
            f"Warning: Could not find {json_path}. description_short column added but not populated."
        )
    except json.JSONDecodeError:
        print(
            f"Warning: Could not decode JSON from {json_path}. description_short column added but not populated."
        )
    except Exception as e:
        print(f"Warning: Error populating description_short values: {e}")


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("cards", "description_short")
