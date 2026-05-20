"""Update Tarot de Marseille deck with real CDN images

Revision ID: de4f5a6b7c89
Revises: cd2e3f4a5b67
Create Date: 2026-04-22 00:02:00.000000+00:00

Card name notes
---------------
Tarot de Marseille uses the same English card names as Rider-Waite, so no
card renaming is required.  The key structural differences are:
  - Justice is trump VIII  (Rider-Waite has it as trump XI)
  - Strength is trump XI   (Rider-Waite has it as trump VIII)
But those differences affect only the trump *number*, not the card name.

Suit mapping (Marseille French → English DB name):
  B Bâtons   → Wands
  C Coupes   → Cups
  D Deniers  → Pentacles
  S Épées    → Swords

Court card mapping (Marseille French → English DB rank):
  J1 Valet    → Page
  J2 Cavalier → Knight
  QU Reine    → Queen
  KI Roi      → King
"""

from typing import Sequence, Union

from alembic import op
from sqlalchemy import text

revision: str = "de4f5a6b7c89"
down_revision: Union[str, None] = "cd2e3f4a5b67"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

CDN_BASE = "https://cdn.nguyenvanloc.com"

# Tarot de Marseille card name → CDN URL (all 78 cards)
MARSEILLE_CDN: dict[str, str] = {
    # ----------------------------------------------------------------
    # Major Arcana (Trumps)
    # ----------------------------------------------------------------
    "The Fool":          f"{CDN_BASE}/marseille/cards/sm_MaNC-T-00.jpg",
    "The Magician":      f"{CDN_BASE}/marseille/cards/sm_MaNC-T-01.jpg",   # I   Le Bateleur
    "The High Priestess": f"{CDN_BASE}/marseille/cards/sm_MaNC-T-02.jpg",
    "The Empress":        f"{CDN_BASE}/marseille/cards/sm_MaNC-T-03.jpg",
    "The Emperor":        f"{CDN_BASE}/marseille/cards/sm_MaNC-T-04.jpg",
    "The Hierophant":     f"{CDN_BASE}/marseille/cards/sm_MaNC-T-05.jpg",
    "The Lovers":         f"{CDN_BASE}/marseille/cards/sm_MaNC-T-06.jpg",
    "The Chariot":        f"{CDN_BASE}/marseille/cards/sm_MaNC-T-07.jpg",
    "Justice":            f"{CDN_BASE}/marseille/cards/sm_MaNC-T-08.jpg",   # Marseille VIII
    "The Hermit":         f"{CDN_BASE}/marseille/cards/sm_MaNC-T-09.jpg",
    "Wheel of Fortune":   f"{CDN_BASE}/marseille/cards/sm_MaNC-T-10.jpg",
    "Strength":           f"{CDN_BASE}/marseille/cards/sm_MaNC-T-11.jpg",   # Marseille XI
    "The Hanged Man":     f"{CDN_BASE}/marseille/cards/sm_MaNC-T-12.jpg",
    "Death":              f"{CDN_BASE}/marseille/cards/sm_MaNC-T-13.jpg",
    "Temperance":         f"{CDN_BASE}/marseille/cards/sm_MaNC-T-14.jpg",
    "The Devil":          f"{CDN_BASE}/marseille/cards/sm_MaNC-T-15.jpg",
    "The Tower":          f"{CDN_BASE}/marseille/cards/sm_MaNC-T-16.jpg",
    "The Star":           f"{CDN_BASE}/marseille/cards/sm_MaNC-T-17.jpg",
    "The Moon":           f"{CDN_BASE}/marseille/cards/sm_MaNC-T-18.jpg",
    "The Sun":            f"{CDN_BASE}/marseille/cards/sm_MaNC-T-19.jpg",
    "Judgement":          f"{CDN_BASE}/marseille/cards/sm_MaNC-T-20.jpg",
    "The World":          f"{CDN_BASE}/marseille/cards/sm_MaNC-T-21.jpg",
    # ----------------------------------------------------------------
    # Wands (Bâtons)
    # ----------------------------------------------------------------
    "Ace of Wands":   f"{CDN_BASE}/marseille/cards/sm_MaNC-B-01.jpg",
    "Two of Wands":   f"{CDN_BASE}/marseille/cards/sm_MaNC-B-02.jpg",
    "Three of Wands": f"{CDN_BASE}/marseille/cards/sm_MaNC-B-03.jpg",
    "Four of Wands":  f"{CDN_BASE}/marseille/cards/sm_MaNC-B-04.jpg",
    "Five of Wands":  f"{CDN_BASE}/marseille/cards/sm_MaNC-B-05.jpg",
    "Six of Wands":   f"{CDN_BASE}/marseille/cards/sm_MaNC-B-06.jpg",
    "Seven of Wands": f"{CDN_BASE}/marseille/cards/sm_MaNC-B-07.jpg",
    "Eight of Wands": f"{CDN_BASE}/marseille/cards/sm_MaNC-B-08.jpg",
    "Nine of Wands":  f"{CDN_BASE}/marseille/cards/sm_MaNC-B-09.jpg",
    "Ten of Wands":   f"{CDN_BASE}/marseille/cards/sm_MaNC-B-10.jpg",
    "Page of Wands":   f"{CDN_BASE}/marseille/cards/sm_MaNC-B-J1.jpg",   # Valet
    "Knight of Wands": f"{CDN_BASE}/marseille/cards/sm_MaNC-B-J2.jpg",   # Cavalier
    "Queen of Wands":  f"{CDN_BASE}/marseille/cards/sm_MaNC-B-QU.jpg",
    "King of Wands":   f"{CDN_BASE}/marseille/cards/sm_MaNC-B-KI.jpg",
    # ----------------------------------------------------------------
    # Cups (Coupes)
    # ----------------------------------------------------------------
    "Ace of Cups":   f"{CDN_BASE}/marseille/cards/sm_MaNC-C-01.jpg",
    "Two of Cups":   f"{CDN_BASE}/marseille/cards/sm_MaNC-C-02.jpg",
    "Three of Cups": f"{CDN_BASE}/marseille/cards/sm_MaNC-C-03.jpg",
    "Four of Cups":  f"{CDN_BASE}/marseille/cards/sm_MaNC-C-04.jpg",
    "Five of Cups":  f"{CDN_BASE}/marseille/cards/sm_MaNC-C-05.jpg",
    "Six of Cups":   f"{CDN_BASE}/marseille/cards/sm_MaNC-C-06.jpg",
    "Seven of Cups": f"{CDN_BASE}/marseille/cards/sm_MaNC-C-07.jpg",
    "Eight of Cups": f"{CDN_BASE}/marseille/cards/sm_MaNC-C-08.jpg",
    "Nine of Cups":  f"{CDN_BASE}/marseille/cards/sm_MaNC-C-09.jpg",
    "Ten of Cups":   f"{CDN_BASE}/marseille/cards/sm_MaNC-C-10.jpg",
    "Page of Cups":   f"{CDN_BASE}/marseille/cards/sm_MaNC-C-J1.jpg",
    "Knight of Cups": f"{CDN_BASE}/marseille/cards/sm_MaNC-C-J2.jpg",
    "Queen of Cups":  f"{CDN_BASE}/marseille/cards/sm_MaNC-C-QU.jpg",
    "King of Cups":   f"{CDN_BASE}/marseille/cards/sm_MaNC-C-KI.jpg",
    # ----------------------------------------------------------------
    # Pentacles (Deniers / Coins)
    # ----------------------------------------------------------------
    "Ace of Pentacles":   f"{CDN_BASE}/marseille/cards/sm_MaNC-D-01.jpg",
    "Two of Pentacles":   f"{CDN_BASE}/marseille/cards/sm_MaNC-D-02.jpg",
    "Three of Pentacles": f"{CDN_BASE}/marseille/cards/sm_MaNC-D-03.jpg",
    "Four of Pentacles":  f"{CDN_BASE}/marseille/cards/sm_MaNC-D-04.jpg",
    "Five of Pentacles":  f"{CDN_BASE}/marseille/cards/sm_MaNC-D-05.jpg",
    "Six of Pentacles":   f"{CDN_BASE}/marseille/cards/sm_MaNC-D-06.jpg",
    "Seven of Pentacles": f"{CDN_BASE}/marseille/cards/sm_MaNC-D-07.jpg",
    "Eight of Pentacles": f"{CDN_BASE}/marseille/cards/sm_MaNC-D-08.jpg",
    "Nine of Pentacles":  f"{CDN_BASE}/marseille/cards/sm_MaNC-D-09.jpg",
    "Ten of Pentacles":   f"{CDN_BASE}/marseille/cards/sm_MaNC-D-10.jpg",
    "Page of Pentacles":   f"{CDN_BASE}/marseille/cards/sm_MaNC-D-J1.jpg",
    "Knight of Pentacles": f"{CDN_BASE}/marseille/cards/sm_MaNC-D-J2.jpg",
    "Queen of Pentacles":  f"{CDN_BASE}/marseille/cards/sm_MaNC-D-QU.jpg",
    "King of Pentacles":   f"{CDN_BASE}/marseille/cards/sm_MaNC-D-KI.jpg",
    # ----------------------------------------------------------------
    # Swords (Épées)
    # ----------------------------------------------------------------
    "Ace of Swords":   f"{CDN_BASE}/marseille/cards/sm_MaNC-S-01.jpg",
    "Two of Swords":   f"{CDN_BASE}/marseille/cards/sm_MaNC-S-02.jpg",
    "Three of Swords": f"{CDN_BASE}/marseille/cards/sm_MaNC-S-03.jpg",
    "Four of Swords":  f"{CDN_BASE}/marseille/cards/sm_MaNC-S-04.jpg",
    "Five of Swords":  f"{CDN_BASE}/marseille/cards/sm_MaNC-S-05.jpg",
    "Six of Swords":   f"{CDN_BASE}/marseille/cards/sm_MaNC-S-06.jpg",
    "Seven of Swords": f"{CDN_BASE}/marseille/cards/sm_MaNC-S-07.jpg",
    "Eight of Swords": f"{CDN_BASE}/marseille/cards/sm_MaNC-S-08.jpg",
    "Nine of Swords":  f"{CDN_BASE}/marseille/cards/sm_MaNC-S-09.jpg",
    "Ten of Swords":   f"{CDN_BASE}/marseille/cards/sm_MaNC-S-10.jpg",
    "Page of Swords":   f"{CDN_BASE}/marseille/cards/sm_MaNC-S-J1.jpg",
    "Knight of Swords": f"{CDN_BASE}/marseille/cards/sm_MaNC-S-J2.jpg",
    "Queen of Swords":  f"{CDN_BASE}/marseille/cards/sm_MaNC-S-QU.jpg",
    "King of Swords":   f"{CDN_BASE}/marseille/cards/sm_MaNC-S-KI.jpg",
}


def upgrade() -> None:
    """Set Tarot de Marseille CDN image URLs for all available cards."""
    connection = op.get_bind()

    result = connection.execute(
        text("SELECT id FROM decks WHERE name = 'Tarot de Marseille'")
    )
    row = result.fetchone()
    if not row:
        print("Warning: Tarot de Marseille deck not found – skipping")
        return
    marseille_id = row[0]

    updated = 0
    for card_name, cdn_url in MARSEILLE_CDN.items():
        result = connection.execute(
            text("""
                UPDATE cards
                   SET image_url = :cdn_url
                 WHERE deck_id = :deck_id AND name = :card_name
            """),
            {"cdn_url": cdn_url, "deck_id": marseille_id, "card_name": card_name},
        )
        updated += result.rowcount

    expected = len(MARSEILLE_CDN)   # 78
    print(f"Tarot de Marseille: updated {updated}/{expected} image URLs")


def downgrade() -> None:
    """Restore Tarot de Marseille image URLs from the Rider-Waite deck."""
    connection = op.get_bind()

    result = connection.execute(
        text("SELECT id FROM decks WHERE name = 'Tarot de Marseille'")
    )
    row = result.fetchone()
    if not row:
        return
    marseille_id = row[0]

    result = connection.execute(
        text("SELECT id FROM decks WHERE name = 'Rider-Waite Tarot'")
    )
    row = result.fetchone()
    if not row:
        return
    rw_id = row[0]

    connection.execute(
        text("""
            UPDATE cards AS m
               SET image_url = (
                   SELECT r.image_url
                     FROM cards r
                    WHERE r.deck_id = :rw_id AND r.name = m.name
               )
             WHERE m.deck_id = :marseille_id
        """),
        {"rw_id": rw_id, "marseille_id": marseille_id},
    )
    print("Tarot de Marseille downgrade: restored Rider-Waite image URLs")
