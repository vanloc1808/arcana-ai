"""Update Thoth deck with real CDN images and correct Thoth card names

Revision ID: cd2e3f4a5b67
Revises: ab1c2d3e4f56
Create Date: 2026-04-22 00:01:00.000000+00:00

"""
from typing import Sequence, Union

from alembic import op
from sqlalchemy import text

revision: str = 'cd2e3f4a5b67'
down_revision: Union[str, None] = 'ab1c2d3e4f56'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

CDN_BASE = "https://cdn.nguyenvanloc.com"

# Thoth card name → CDN URL (78 cards)
THOTH_CDN = {
    # Major Arcana (Trumps)
    "The Fool":        f"{CDN_BASE}/thoth/cards/sm_Thot-T-00.jpg",
    "The Magus":       f"{CDN_BASE}/thoth/cards/sm_Thot-T-01.jpg",
    "The Priestess":   f"{CDN_BASE}/thoth/cards/sm_Thot-T-02.jpg",
    "The Empress":     f"{CDN_BASE}/thoth/cards/sm_Thot-T-03.jpg",
    "The Emperor":     f"{CDN_BASE}/thoth/cards/sm_Thot-T-04.jpg",
    "The Hierophant":  f"{CDN_BASE}/thoth/cards/sm_Thot-T-05.jpg",
    "The Lovers":      f"{CDN_BASE}/thoth/cards/sm_Thot-T-06.jpg",
    "The Chariot":     f"{CDN_BASE}/thoth/cards/sm_Thot-T-07.jpg",
    "Adjustment":      f"{CDN_BASE}/thoth/cards/sm_Thot-T-08.jpg",  # Justice in RW
    "The Hermit":      f"{CDN_BASE}/thoth/cards/sm_Thot-T-09.jpg",
    "Fortune":         f"{CDN_BASE}/thoth/cards/sm_Thot-T-10.jpg",  # Wheel of Fortune in RW
    "Lust":            f"{CDN_BASE}/thoth/cards/sm_Thot-T-11.jpg",  # Strength in RW
    "The Hanged Man":  f"{CDN_BASE}/thoth/cards/sm_Thot-T-12.jpg",
    "Death":           f"{CDN_BASE}/thoth/cards/sm_Thot-T-13.jpg",
    "Art":             f"{CDN_BASE}/thoth/cards/sm_Thot-T-14.jpg",  # Temperance in RW
    "The Devil":       f"{CDN_BASE}/thoth/cards/sm_Thot-T-15.jpg",
    "The Tower":       f"{CDN_BASE}/thoth/cards/sm_Thot-T-16.jpg",
    "The Star":        f"{CDN_BASE}/thoth/cards/sm_Thot-T-17.jpg",
    "The Moon":        f"{CDN_BASE}/thoth/cards/sm_Thot-T-18.jpg",
    "The Sun":         f"{CDN_BASE}/thoth/cards/sm_Thot-T-19.jpg",
    "The Aeon":        f"{CDN_BASE}/thoth/cards/sm_Thot-T-20.jpg",  # Judgement in RW
    "The Universe":    f"{CDN_BASE}/thoth/cards/sm_Thot-T-21.jpg",  # The World in RW
    # Cups
    "Ace of Cups":       f"{CDN_BASE}/thoth/cards/sm_Thot-C-0A.jpg",
    "Two of Cups":       f"{CDN_BASE}/thoth/cards/sm_Thot-C-02.jpg",
    "Three of Cups":     f"{CDN_BASE}/thoth/cards/sm_Thot-C-03.jpg",
    "Four of Cups":      f"{CDN_BASE}/thoth/cards/sm_Thot-C-04.jpg",
    "Five of Cups":      f"{CDN_BASE}/thoth/cards/sm_Thot-C-05.jpg",
    "Six of Cups":       f"{CDN_BASE}/thoth/cards/sm_Thot-C-06.jpg",
    "Seven of Cups":     f"{CDN_BASE}/thoth/cards/sm_Thot-C-07.jpg",
    "Eight of Cups":     f"{CDN_BASE}/thoth/cards/sm_Thot-C-08.jpg",
    "Nine of Cups":      f"{CDN_BASE}/thoth/cards/sm_Thot-C-09.jpg",
    "Ten of Cups":       f"{CDN_BASE}/thoth/cards/sm_Thot-C-10.jpg",
    "Princess of Cups":  f"{CDN_BASE}/thoth/cards/sm_Thot-C-PS.jpg",
    "Prince of Cups":    f"{CDN_BASE}/thoth/cards/sm_Thot-C-PN.jpg",
    "Queen of Cups":     f"{CDN_BASE}/thoth/cards/sm_Thot-C-QU.jpg",
    "Knight of Cups":    f"{CDN_BASE}/thoth/cards/sm_Thot-C-KN.jpg",
    # Disks (Pentacles in RW)
    "Ace of Disks":      f"{CDN_BASE}/thoth/cards/sm_Thot-D-0A.jpg",
    "Two of Disks":      f"{CDN_BASE}/thoth/cards/sm_Thot-D-02.jpg",
    "Three of Disks":    f"{CDN_BASE}/thoth/cards/sm_Thot-D-03.jpg",
    "Four of Disks":     f"{CDN_BASE}/thoth/cards/sm_Thot-D-04.jpg",
    "Five of Disks":     f"{CDN_BASE}/thoth/cards/sm_Thot-D-05.jpg",
    "Six of Disks":      f"{CDN_BASE}/thoth/cards/sm_Thot-D-06.jpg",
    "Seven of Disks":    f"{CDN_BASE}/thoth/cards/sm_Thot-D-07.jpg",
    "Eight of Disks":    f"{CDN_BASE}/thoth/cards/sm_Thot-D-08.jpg",
    "Nine of Disks":     f"{CDN_BASE}/thoth/cards/sm_Thot-D-09.jpg",
    "Ten of Disks":      f"{CDN_BASE}/thoth/cards/sm_Thot-D-10.jpg",
    "Princess of Disks": f"{CDN_BASE}/thoth/cards/sm_Thot-D-PS.jpg",
    "Prince of Disks":   f"{CDN_BASE}/thoth/cards/sm_Thot-D-PN.jpg",
    "Queen of Disks":    f"{CDN_BASE}/thoth/cards/sm_Thot-D-QU.jpg",
    "Knight of Disks":   f"{CDN_BASE}/thoth/cards/sm_Thot-D-KN.jpg",
    # Swords
    "Ace of Swords":     f"{CDN_BASE}/thoth/cards/sm_Thot-S-0A.jpg",
    "Two of Swords":     f"{CDN_BASE}/thoth/cards/sm_Thot-S-02.jpg",
    "Three of Swords":   f"{CDN_BASE}/thoth/cards/sm_Thot-S-03.jpg",
    "Four of Swords":    f"{CDN_BASE}/thoth/cards/sm_Thot-S-04.jpg",
    "Five of Swords":    f"{CDN_BASE}/thoth/cards/sm_Thot-S-05.jpg",
    "Six of Swords":     f"{CDN_BASE}/thoth/cards/sm_Thot-S-06.jpg",
    "Seven of Swords":   f"{CDN_BASE}/thoth/cards/sm_Thot-S-07.jpg",
    "Eight of Swords":   f"{CDN_BASE}/thoth/cards/sm_Thot-S-08.jpg",
    "Nine of Swords":    f"{CDN_BASE}/thoth/cards/sm_Thot-S-09.jpg",
    "Ten of Swords":     f"{CDN_BASE}/thoth/cards/sm_Thot-S-10.jpg",
    "Princess of Swords": f"{CDN_BASE}/thoth/cards/sm_Thot-S-PS.jpg",
    "Prince of Swords":  f"{CDN_BASE}/thoth/cards/sm_Thot-S-PN.jpg",
    "Queen of Swords":   f"{CDN_BASE}/thoth/cards/sm_Thot-S-QU.jpg",
    "Knight of Swords":  f"{CDN_BASE}/thoth/cards/sm_Thot-S-KN.jpg",
    # Wands
    "Ace of Wands":      f"{CDN_BASE}/thoth/cards/sm_Thot-W-0A.jpg",
    "Two of Wands":      f"{CDN_BASE}/thoth/cards/sm_Thot-W-02.jpg",
    "Three of Wands":    f"{CDN_BASE}/thoth/cards/sm_Thot-W-03.jpg",
    "Four of Wands":     f"{CDN_BASE}/thoth/cards/sm_Thot-W-04.jpg",
    "Five of Wands":     f"{CDN_BASE}/thoth/cards/sm_Thot-W-05.jpg",
    "Six of Wands":      f"{CDN_BASE}/thoth/cards/sm_Thot-W-06.jpg",
    "Seven of Wands":    f"{CDN_BASE}/thoth/cards/sm_Thot-W-07.jpg",
    "Eight of Wands":    f"{CDN_BASE}/thoth/cards/sm_Thot-W-08.jpg",
    "Nine of Wands":     f"{CDN_BASE}/thoth/cards/sm_Thot-W-09.jpg",
    "Ten of Wands":      f"{CDN_BASE}/thoth/cards/sm_Thot-W-10.jpg",
    "Princess of Wands": f"{CDN_BASE}/thoth/cards/sm_Thot-W-PS.jpg",
    "Prince of Wands":   f"{CDN_BASE}/thoth/cards/sm_Thot-W-PN.jpg",
    "Queen of Wands":    f"{CDN_BASE}/thoth/cards/sm_Thot-W-QU.jpg",
    "Knight of Wands":   f"{CDN_BASE}/thoth/cards/sm_Thot-W-KN.jpg",
}

# Rider-Waite major arcana names that differ in Thoth
MAJOR_RENAMES = {
    "The Magician":    "The Magus",
    "The High Priestess": "The Priestess",
    "Wheel of Fortune": "Fortune",
    "Justice":         "Adjustment",
    "Strength":        "Lust",
    "Temperance":      "Art",
    "Judgement":       "The Aeon",
    "The World":       "The Universe",
}

# Suits that keep their name in Thoth
UNCHANGED_SUITS = ["Wands", "Cups", "Swords"]


def upgrade() -> None:
    """Rename Thoth deck cards to proper Thoth names and set real CDN image URLs."""
    connection = op.get_bind()

    result = connection.execute(
        text("SELECT id FROM decks WHERE name = 'Thoth Tarot'")
    )
    row = result.fetchone()
    if not row:
        print("Warning: Thoth Tarot deck not found – skipping")
        return
    thoth_id = row[0]

    # ----------------------------------------------------------------
    # Phase 1: Knights → Princes (all suits, including Pentacles→Disks)
    # Must come before Kings→Knights to avoid name collision.
    # ----------------------------------------------------------------
    for rw_suit, thoth_suit in [
        ("Wands", "Wands"), ("Cups", "Cups"), ("Swords", "Swords"), ("Pentacles", "Disks")
    ]:
        connection.execute(
            text("""
                UPDATE cards
                   SET name = :new_name, suit = :thoth_suit, rank = 'Prince'
                 WHERE deck_id = :thoth_id AND name = :old_name
            """),
            {
                "new_name": f"Prince of {thoth_suit}",
                "thoth_suit": thoth_suit,
                "old_name": f"Knight of {rw_suit}",
                "thoth_id": thoth_id,
            },
        )

    # ----------------------------------------------------------------
    # Phase 2: Kings → Knights (now safe, former Knights are Princes)
    # ----------------------------------------------------------------
    for rw_suit, thoth_suit in [
        ("Wands", "Wands"), ("Cups", "Cups"), ("Swords", "Swords"), ("Pentacles", "Disks")
    ]:
        connection.execute(
            text("""
                UPDATE cards
                   SET name = :new_name, suit = :thoth_suit, rank = 'Knight'
                 WHERE deck_id = :thoth_id AND name = :old_name
            """),
            {
                "new_name": f"Knight of {thoth_suit}",
                "thoth_suit": thoth_suit,
                "old_name": f"King of {rw_suit}",
                "thoth_id": thoth_id,
            },
        )

    # ----------------------------------------------------------------
    # Phase 3: Pages → Princesses (all suits)
    # ----------------------------------------------------------------
    for rw_suit, thoth_suit in [
        ("Wands", "Wands"), ("Cups", "Cups"), ("Swords", "Swords"), ("Pentacles", "Disks")
    ]:
        connection.execute(
            text("""
                UPDATE cards
                   SET name = :new_name, suit = :thoth_suit, rank = 'Princess'
                 WHERE deck_id = :thoth_id AND name = :old_name
            """),
            {
                "new_name": f"Princess of {thoth_suit}",
                "thoth_suit": thoth_suit,
                "old_name": f"Page of {rw_suit}",
                "thoth_id": thoth_id,
            },
        )

    # ----------------------------------------------------------------
    # Phase 4: Queens + number cards for Pentacles → Disks
    # ----------------------------------------------------------------
    connection.execute(
        text("""
            UPDATE cards
               SET name = 'Queen of Disks', suit = 'Disks'
             WHERE deck_id = :thoth_id AND name = 'Queen of Pentacles'
        """),
        {"thoth_id": thoth_id},
    )

    for rank in ["Ace", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"]:
        connection.execute(
            text("""
                UPDATE cards
                   SET name = :new_name, suit = 'Disks'
                 WHERE deck_id = :thoth_id AND name = :old_name
            """),
            {
                "new_name": f"{rank} of Disks",
                "old_name": f"{rank} of Pentacles",
                "thoth_id": thoth_id,
            },
        )

    # ----------------------------------------------------------------
    # Phase 5: Major arcana renames
    # ----------------------------------------------------------------
    for rw_name, thoth_name in MAJOR_RENAMES.items():
        connection.execute(
            text("""
                UPDATE cards
                   SET name = :thoth_name
                 WHERE deck_id = :thoth_id AND name = :rw_name
            """),
            {"thoth_name": thoth_name, "rw_name": rw_name, "thoth_id": thoth_id},
        )

    # ----------------------------------------------------------------
    # Phase 6: Set CDN image URLs (all 78 cards by their now-final Thoth name)
    # ----------------------------------------------------------------
    updated = 0
    for thoth_name, cdn_url in THOTH_CDN.items():
        result = connection.execute(
            text("""
                UPDATE cards
                   SET image_url = :cdn_url
                 WHERE deck_id = :thoth_id AND name = :thoth_name
            """),
            {"cdn_url": cdn_url, "thoth_name": thoth_name, "thoth_id": thoth_id},
        )
        updated += result.rowcount

    print(f"Thoth deck: renamed cards to Thoth names and updated {updated}/78 image URLs")


def downgrade() -> None:
    """Restore Thoth deck cards to Rider-Waite names and copy image_url from Rider-Waite deck."""
    connection = op.get_bind()

    result = connection.execute(text("SELECT id FROM decks WHERE name = 'Thoth Tarot'"))
    row = result.fetchone()
    if not row:
        return
    thoth_id = row[0]

    result = connection.execute(text("SELECT id FROM decks WHERE name = 'Rider-Waite Tarot'"))
    row = result.fetchone()
    if not row:
        return
    rw_id = row[0]

    # Reverse major arcana renames
    for rw_name, thoth_name in MAJOR_RENAMES.items():
        connection.execute(
            text("UPDATE cards SET name = :rw_name WHERE deck_id = :thoth_id AND name = :thoth_name"),
            {"rw_name": rw_name, "thoth_name": thoth_name, "thoth_id": thoth_id},
        )

    # Reverse Disks → Pentacles (number cards + Queen)
    for rank in ["Ace", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"]:
        connection.execute(
            text("UPDATE cards SET name = :rw, suit = 'Pentacles' WHERE deck_id = :tid AND name = :th"),
            {"rw": f"{rank} of Pentacles", "tid": thoth_id, "th": f"{rank} of Disks"},
        )
    connection.execute(
        text("UPDATE cards SET name = 'Queen of Pentacles', suit = 'Pentacles' WHERE deck_id = :tid AND name = 'Queen of Disks'"),
        {"tid": thoth_id},
    )

    # Reverse court cards – must undo in reverse order (Knights→Kings, then Princes→Knights, then Princesses→Pages)
    for thoth_suit, rw_suit in [
        ("Wands", "Wands"), ("Cups", "Cups"), ("Swords", "Swords"), ("Disks", "Pentacles")
    ]:
        # Knight of X → King of X (restore Kings first)
        connection.execute(
            text("UPDATE cards SET name = :rw, suit = :rs, rank = 'King' WHERE deck_id = :tid AND name = :th"),
            {"rw": f"King of {rw_suit}", "rs": rw_suit, "tid": thoth_id, "th": f"Knight of {thoth_suit}"},
        )
    for thoth_suit, rw_suit in [
        ("Wands", "Wands"), ("Cups", "Cups"), ("Swords", "Swords"), ("Disks", "Pentacles")
    ]:
        # Prince of X → Knight of X
        connection.execute(
            text("UPDATE cards SET name = :rw, suit = :rs, rank = 'Knight' WHERE deck_id = :tid AND name = :th"),
            {"rw": f"Knight of {rw_suit}", "rs": rw_suit, "tid": thoth_id, "th": f"Prince of {thoth_suit}"},
        )
        # Princess of X → Page of X
        connection.execute(
            text("UPDATE cards SET name = :rw, suit = :rs, rank = 'Page' WHERE deck_id = :tid AND name = :th"),
            {"rw": f"Page of {rw_suit}", "rs": rw_suit, "tid": thoth_id, "th": f"Princess of {thoth_suit}"},
        )

    # Restore image_url from Rider-Waite cards
    connection.execute(
        text("""
            UPDATE cards AS t
               SET image_url = (
                   SELECT r.image_url FROM cards r
                    WHERE r.deck_id = :rw_id AND r.name = t.name
               )
             WHERE t.deck_id = :thoth_id
        """),
        {"rw_id": rw_id, "thoth_id": thoth_id},
    )
    print("Thoth deck downgrade: restored Rider-Waite card names and image URLs")
