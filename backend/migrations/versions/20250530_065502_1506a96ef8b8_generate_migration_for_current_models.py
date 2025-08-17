"""Seed tarot cards data from JSON files

Revision ID: 1506a96ef8b8
Revises: ec3f7fdaef13
Create Date: 2025-05-30 06:55:02.560224+00:00

"""
from typing import Sequence, Union
import os
import json  # For loading data from JSON files

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "1506a96ef8b8"
down_revision: Union[str, None] = "ec3f7fdaef13"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# --- Helper function to load JSON data ---
# Path to the backend directory from the migration script's location
# (migrations/versions/your_script.py -> migrations/ -> backend/)
_BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
_UPLOAD_RESULTS_PATH = os.path.join(_BACKEND_DIR, "upload_results.json")
_TAROT_DEFINITIONS_PATH = os.path.join(_BACKEND_DIR, "tarot_cards.json")


def _load_json_data(file_path: str):
    """Loads JSON data from the given file path."""
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        op.execute(
            f"RAISE EXCEPTION 'Essential data file not found during migration: {file_path}. Migration cannot proceed.'"
        )
    except json.JSONDecodeError as e:
        op.execute(
            f"RAISE EXCEPTION 'Error decoding JSON from {file_path}: {e.msg}. Migration cannot proceed.'"
        )
    return None  # Should not be reached if exception is raised


# --- Image URL resolver ---
def _get_image_url(original_url: str, uploaded_img_data: dict) -> str:
    """Gets the new image URL from the uploaded_images_data, falling back to original if not found."""
    filename = os.path.basename(original_url)
    if (
        filename in uploaded_img_data
        and uploaded_img_data[filename].get("status") == "success"
    ):
        return uploaded_img_data[filename]["image_url"]

    simplified_filename = None
    parts = original_url.split("/")
    if len(parts) > 2:
        suit_dir = parts[-2]
        original_file_part = parts[-1]
        if suit_dir == "major_arcana":
            num_part = original_file_part.split("_")[0]
            simplified_filename = f"m{num_part}.jpg"
        elif suit_dir == "wands":
            simplified_filename = f"w{original_file_part.replace('wands', '')}"
        elif suit_dir == "cups":
            simplified_filename = f"c{original_file_part.replace('cups', '')}"
        elif suit_dir == "swords":
            simplified_filename = f"s{original_file_part.replace('swords', '')}"
        elif suit_dir == "pentacles":
            simplified_filename = f"p{original_file_part.replace('pentacles', '')}"

    if (
        simplified_filename
        and simplified_filename in uploaded_img_data
        and uploaded_img_data[simplified_filename].get("status") == "success"
    ):
        return uploaded_img_data[simplified_filename]["image_url"]

    # print(f"Migration Warning: Could not find uploaded image for {original_url}. Using original URL.") # Optional: for debugging
    return original_url


# --- Rank mapping helper ---
_MINOR_RANK_MAP = {
    1: "Ace",
    2: "Two",
    3: "Three",
    4: "Four",
    5: "Five",
    6: "Six",
    7: "Seven",
    8: "Eight",
    9: "Nine",
    10: "Ten",
    11: "Page",
    12: "Knight",
    13: "Queen",
    14: "King",
}
_MAJOR_RANK_MAP = {
    0: "0",
    1: "I",
    2: "II",
    3: "III",
    4: "IV",
    5: "V",
    6: "VI",
    7: "VII",
    8: "VIII",
    9: "IX",
    10: "X",
    11: "XI",
    12: "XII",
    13: "XIII",
    14: "XIV",
    15: "XV",
    16: "XVI",
    17: "XVII",
    18: "XVIII",
    19: "XIX",
    20: "XX",
    21: "XXI",
}


def _get_rank_from_number(card_number, suit_name):
    if card_number is None:
        return None
    if suit_name == "Major Arcana":
        return _MAJOR_RANK_MAP.get(card_number, str(card_number))
    else:
        return _MINOR_RANK_MAP.get(card_number, str(card_number))


# --- Table definition ---
# Ensure column types (especially String lengths) match your models.py Card model
cards_table_definition = sa.Table(
    "cards",
    sa.MetaData(),
    sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
    sa.Column("name", sa.String(255), nullable=False),
    sa.Column("suit", sa.String(50)),
    sa.Column("rank", sa.String(50)),
    sa.Column("description_short", sa.String(255)),
    sa.Column("description_upright", sa.Text),
    sa.Column("description_reversed", sa.Text),
    sa.Column("image_url", sa.String(512)),  # Ensure length accommodates URLs
    sa.Column("element", sa.String(50), nullable=True),
    sa.Column("astrology", sa.String(100), nullable=True),
    sa.Column("numerology", sa.Integer, nullable=True),
)


def upgrade() -> None:
    """Seed cards data by loading from JSON files."""
    conn = op.get_bind()

    try:
        result = conn.execute(
            sa.text("SELECT COUNT(id) FROM cards")
        ).scalar_one_or_none()
    except Exception as e:
        print(
            f"Migration Info: Could not check card count (table might not exist as per Alembic's view yet, or other DB issue): {e}"
        )
        print(
            "Migration Info: Assuming table is empty or will be created by a preceding schema migration."
        )
        result = 0

    if result == 0 or result is None:
        print(f"Migration {revision}: Cards table is empty, proceeding with seeding.")

        uploaded_images_data = _load_json_data(_UPLOAD_RESULTS_PATH)
        raw_card_definitions = _load_json_data(_TAROT_DEFINITIONS_PATH)

        if uploaded_images_data is None or raw_card_definitions is None:
            # Error already raised by _load_json_data via op.execute for database raising
            # but good to have a Python-level stop too if op.execute isn't available or fails.
            raise RuntimeError(
                "Failed to load essential JSON data for seeding. Migration cannot proceed."
            )

        all_cards_to_process = []  # Will store tuples of (card_dict, suit_name_for_db)
        major_arcana_list = raw_card_definitions.get("major_arcana", [])
        if isinstance(major_arcana_list, list):
            for card_def in major_arcana_list:
                if isinstance(card_def, dict):
                    all_cards_to_process.append((card_def, "Major Arcana"))
                else:
                    print(
                        f"Migration {revision}: Warning - Skipping non-dictionary item in major_arcana list: {card_def}"
                    )

        minor_arcana_dict = raw_card_definitions.get("minor_arcana", {})
        if isinstance(minor_arcana_dict, dict):
            for (
                suit_key,
                suit_card_list,
            ) in minor_arcana_dict.items():  # suit_key is "wands", "cups", etc.
                # Derive suit name for DB (e.g., "wands" -> "Wands")
                suit_name_for_db = suit_key.replace("suit_of_", "").capitalize()
                if isinstance(suit_card_list, list):
                    for card_def in suit_card_list:
                        if isinstance(card_def, dict):
                            all_cards_to_process.append((card_def, suit_name_for_db))
                        else:
                            print(
                                f"Migration {revision}: Warning - Skipping non-dictionary item in {suit_key} list: {card_def}"
                            )
                else:
                    print(
                        f"Migration {revision}: Warning - Expected a list of cards for suit {suit_key}, but got {type(suit_card_list)}."
                    )

        processed_tarot_cards_for_db_insert = []
        for card_data_from_json, suit_name_for_db in all_cards_to_process:
            card_number = card_data_from_json.get("number")
            upright_data = card_data_from_json.get("upright")
            reversed_data = card_data_from_json.get("reversed")
            original_image_url = card_data_from_json.get(
                "image_url"
            )  # This is the path like /cards/major_arcana/00_fool.jpg

            processed_card_for_db = {
                "name": card_data_from_json.get("name"),
                "suit": suit_name_for_db,
                "rank": _get_rank_from_number(card_number, suit_name_for_db),
                "description_short": card_data_from_json.get(
                    "description_short", ""
                ),  # Defaults to "" as not in current JSON
                "description_upright": " ".join(upright_data)
                if isinstance(upright_data, list)
                else (str(upright_data) if upright_data is not None else ""),
                "description_reversed": " ".join(reversed_data)
                if isinstance(reversed_data, list)
                else (str(reversed_data) if reversed_data is not None else ""),
                "image_url": _get_image_url(original_image_url, uploaded_images_data)
                if original_image_url
                else None,
                "element": card_data_from_json.get("elemental"),
                "astrology": card_data_from_json.get(
                    "astrology"
                ),  # Not in current JSON, will be None
                "numerology": card_number,
            }
            processed_tarot_cards_for_db_insert.append(processed_card_for_db)

        if not processed_tarot_cards_for_db_insert:
            print(
                f"Migration {revision}: Warning - No card data processed from JSON files. Seeding will be skipped."
            )
            return

        print(
            f"Migration {revision}: Seeding {len(processed_tarot_cards_for_db_insert)} tarot cards..."
        )
        op.bulk_insert(cards_table_definition, processed_tarot_cards_for_db_insert)
        print(f"Migration {revision}: Tarot cards data seeded.")
    else:
        print(
            f"Migration {revision}: Cards table already contains {result} records. Seeding skipped."
        )


def downgrade() -> None:
    """Remove seeded cards data."""
    print(
        f"Migration {revision}: Deleting all tarot cards data from 'cards' table (downgrade)..."
    )
    op.execute(sa.text("DELETE FROM cards"))  # This deletes ALL cards
    print(f"Migration {revision}: All tarot cards data deleted from 'cards' table.")
