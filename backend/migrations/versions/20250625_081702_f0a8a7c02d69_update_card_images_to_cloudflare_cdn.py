"""update_card_images_to_cloudflare_cdn

Revision ID: f0a8a7c02d69
Revises: f118722afcd0
Create Date: 2025-06-25 08:17:02.341396+00:00

"""
from typing import Sequence, Union
import json
import os
from pathlib import Path

from alembic import op
import sqlalchemy as sa
from sqlalchemy import text


# revision identifiers, used by Alembic.
revision: str = 'f0a8a7c02d69'
down_revision: Union[str, None] = 'f118722afcd0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Create connection
    connection = op.get_bind()

    print("🚀 Starting card image migration to Cloudflare CDN...")

    # Cloudflare URL mappings for the main card images
    cloudflare_mappings = {
        # Major Arcana
        "m00.jpg": "https://cdn.nguyenvanloc.com/kaggle_tarot_images/cards/m00.jpg",
        "m01.jpg": "https://cdn.nguyenvanloc.com/kaggle_tarot_images/cards/m01.jpg",
        "m02.jpg": "https://cdn.nguyenvanloc.com/kaggle_tarot_images/cards/m02.jpg",
        "m03.jpg": "https://cdn.nguyenvanloc.com/kaggle_tarot_images/cards/m03.jpg",
        "m04.jpg": "https://cdn.nguyenvanloc.com/kaggle_tarot_images/cards/m04.jpg",
        "m05.jpg": "https://cdn.nguyenvanloc.com/kaggle_tarot_images/cards/m05.jpg",
        "m06.jpg": "https://cdn.nguyenvanloc.com/kaggle_tarot_images/cards/m06.jpg",
        "m07.jpg": "https://cdn.nguyenvanloc.com/kaggle_tarot_images/cards/m07.jpg",
        "m08.jpg": "https://cdn.nguyenvanloc.com/kaggle_tarot_images/cards/m08.jpg",
        "m09.jpg": "https://cdn.nguyenvanloc.com/kaggle_tarot_images/cards/m09.jpg",
        "m10.jpg": "https://cdn.nguyenvanloc.com/kaggle_tarot_images/cards/m10.jpg",
        "m11.jpg": "https://cdn.nguyenvanloc.com/kaggle_tarot_images/cards/m11.jpg",
        "m12.jpg": "https://cdn.nguyenvanloc.com/kaggle_tarot_images/cards/m12.jpg",
        "m13.jpg": "https://cdn.nguyenvanloc.com/kaggle_tarot_images/cards/m13.jpg",
        "m14.jpg": "https://cdn.nguyenvanloc.com/kaggle_tarot_images/cards/m14.jpg",
        "m15.jpg": "https://cdn.nguyenvanloc.com/kaggle_tarot_images/cards/m15.jpg",
        "m16.jpg": "https://cdn.nguyenvanloc.com/kaggle_tarot_images/cards/m16.jpg",
        "m17.jpg": "https://cdn.nguyenvanloc.com/kaggle_tarot_images/cards/m17.jpg",
        "m18.jpg": "https://cdn.nguyenvanloc.com/kaggle_tarot_images/cards/m18.jpg",
        "m19.jpg": "https://cdn.nguyenvanloc.com/kaggle_tarot_images/cards/m19.jpg",
        "m20.jpg": "https://cdn.nguyenvanloc.com/kaggle_tarot_images/cards/m20.jpg",
        "m21.jpg": "https://cdn.nguyenvanloc.com/kaggle_tarot_images/cards/m21.jpg",

        # Cups
        "c01.jpg": "https://cdn.nguyenvanloc.com/kaggle_tarot_images/cards/c01.jpg",
        "c02.jpg": "https://cdn.nguyenvanloc.com/kaggle_tarot_images/cards/c02.jpg",
        "c03.jpg": "https://cdn.nguyenvanloc.com/kaggle_tarot_images/cards/c03.jpg",
        "c04.jpg": "https://cdn.nguyenvanloc.com/kaggle_tarot_images/cards/c04.jpg",
        "c05.jpg": "https://cdn.nguyenvanloc.com/kaggle_tarot_images/cards/c05.jpg",
        "c06.jpg": "https://cdn.nguyenvanloc.com/kaggle_tarot_images/cards/c06.jpg",
        "c07.jpg": "https://cdn.nguyenvanloc.com/kaggle_tarot_images/cards/c07.jpg",
        "c08.jpg": "https://cdn.nguyenvanloc.com/kaggle_tarot_images/cards/c08.jpg",
        "c09.jpg": "https://cdn.nguyenvanloc.com/kaggle_tarot_images/cards/c09.jpg",
        "c10.jpg": "https://cdn.nguyenvanloc.com/kaggle_tarot_images/cards/c10.jpg",
        "c11.jpg": "https://cdn.nguyenvanloc.com/kaggle_tarot_images/cards/c11.jpg",
        "c12.jpg": "https://cdn.nguyenvanloc.com/kaggle_tarot_images/cards/c12.jpg",
        "c13.jpg": "https://cdn.nguyenvanloc.com/kaggle_tarot_images/cards/c13.jpg",
        "c14.jpg": "https://cdn.nguyenvanloc.com/kaggle_tarot_images/cards/c14.jpg",

        # Pentacles
        "p01.jpg": "https://cdn.nguyenvanloc.com/kaggle_tarot_images/cards/p01.jpg",
        "p02.jpg": "https://cdn.nguyenvanloc.com/kaggle_tarot_images/cards/p02.jpg",
        "p03.jpg": "https://cdn.nguyenvanloc.com/kaggle_tarot_images/cards/p03.jpg",
        "p04.jpg": "https://cdn.nguyenvanloc.com/kaggle_tarot_images/cards/p04.jpg",
        "p05.jpg": "https://cdn.nguyenvanloc.com/kaggle_tarot_images/cards/p05.jpg",
        "p06.jpg": "https://cdn.nguyenvanloc.com/kaggle_tarot_images/cards/p06.jpg",
        "p07.jpg": "https://cdn.nguyenvanloc.com/kaggle_tarot_images/cards/p07.jpg",
        "p08.jpg": "https://cdn.nguyenvanloc.com/kaggle_tarot_images/cards/p08.jpg",
        "p09.jpg": "https://cdn.nguyenvanloc.com/kaggle_tarot_images/cards/p09.jpg",
        "p10.jpg": "https://cdn.nguyenvanloc.com/kaggle_tarot_images/cards/p10.jpg",
        "p11.jpg": "https://cdn.nguyenvanloc.com/kaggle_tarot_images/cards/p11.jpg",
        "p12.jpg": "https://cdn.nguyenvanloc.com/kaggle_tarot_images/cards/p12.jpg",
        "p13.jpg": "https://cdn.nguyenvanloc.com/kaggle_tarot_images/cards/p13.jpg",
        "p14.jpg": "https://cdn.nguyenvanloc.com/kaggle_tarot_images/cards/p14.jpg",

        # Swords
        "s01.jpg": "https://cdn.nguyenvanloc.com/kaggle_tarot_images/cards/s01.jpg",
        "s02.jpg": "https://cdn.nguyenvanloc.com/kaggle_tarot_images/cards/s02.jpg",
        "s03.jpg": "https://cdn.nguyenvanloc.com/kaggle_tarot_images/cards/s03.jpg",
        "s04.jpg": "https://cdn.nguyenvanloc.com/kaggle_tarot_images/cards/s04.jpg",
        "s05.jpg": "https://cdn.nguyenvanloc.com/kaggle_tarot_images/cards/s05.jpg",
        "s06.jpg": "https://cdn.nguyenvanloc.com/kaggle_tarot_images/cards/s06.jpg",
        "s07.jpg": "https://cdn.nguyenvanloc.com/kaggle_tarot_images/cards/s07.jpg",
        "s08.jpg": "https://cdn.nguyenvanloc.com/kaggle_tarot_images/cards/s08.jpg",
        "s09.jpg": "https://cdn.nguyenvanloc.com/kaggle_tarot_images/cards/s09.jpg",
        "s10.jpg": "https://cdn.nguyenvanloc.com/kaggle_tarot_images/cards/s10.jpg",
        "s11.jpg": "https://cdn.nguyenvanloc.com/kaggle_tarot_images/cards/s11.jpg",
        "s12.jpg": "https://cdn.nguyenvanloc.com/kaggle_tarot_images/cards/s12.jpg",
        "s13.jpg": "https://cdn.nguyenvanloc.com/kaggle_tarot_images/cards/s13.jpg",
        "s14.jpg": "https://cdn.nguyenvanloc.com/kaggle_tarot_images/cards/s14.jpg",

        # Wands
        "w01.jpg": "https://cdn.nguyenvanloc.com/kaggle_tarot_images/cards/w01.jpg",
        "w02.jpg": "https://cdn.nguyenvanloc.com/kaggle_tarot_images/cards/w02.jpg",
        "w03.jpg": "https://cdn.nguyenvanloc.com/kaggle_tarot_images/cards/w03.jpg",
        "w04.jpg": "https://cdn.nguyenvanloc.com/kaggle_tarot_images/cards/w04.jpg",
        "w05.jpg": "https://cdn.nguyenvanloc.com/kaggle_tarot_images/cards/w05.jpg",
        "w06.jpg": "https://cdn.nguyenvanloc.com/kaggle_tarot_images/cards/w06.jpg",
        "w07.jpg": "https://cdn.nguyenvanloc.com/kaggle_tarot_images/cards/w07.jpg",
        "w08.jpg": "https://cdn.nguyenvanloc.com/kaggle_tarot_images/cards/w08.jpg",
        "w09.jpg": "https://cdn.nguyenvanloc.com/kaggle_tarot_images/cards/w09.jpg",
        "w10.jpg": "https://cdn.nguyenvanloc.com/kaggle_tarot_images/cards/w10.jpg",
        "w11.jpg": "https://cdn.nguyenvanloc.com/kaggle_tarot_images/cards/w11.jpg",
        "w12.jpg": "https://cdn.nguyenvanloc.com/kaggle_tarot_images/cards/w12.jpg",
        "w13.jpg": "https://cdn.nguyenvanloc.com/kaggle_tarot_images/cards/w13.jpg",
        "w14.jpg": "https://cdn.nguyenvanloc.com/kaggle_tarot_images/cards/w14.jpg",
    }

    # Update each card's image URL
    total_updated = 0
    for filename, cloudflare_url in cloudflare_mappings.items():
        # Convert filename format: m00.jpg -> m00-jpg.webp pattern
        base_name = filename.replace('.jpg', '')
        webp_pattern = f"{base_name}-jpg.webp"

        # Update cards that have this pattern in their image_url
        result = connection.execute(
            text("""
                UPDATE cards
                SET image_url = :cloudflare_url
                WHERE image_url LIKE '%' || :webp_pattern || '%'
            """),
            {"cloudflare_url": cloudflare_url, "webp_pattern": webp_pattern}
        )

        if result.rowcount > 0:
            print(f"  ✅ Updated {result.rowcount} card(s) for {filename} (pattern: {webp_pattern})")
            total_updated += result.rowcount

    print(f"🎉 Migration completed! Updated {total_updated} cards with Cloudflare CDN URLs")


def downgrade() -> None:
    """Downgrade schema."""
    print("⚠️  Downgrade: This migration cannot be automatically reversed.")
    print("   Manual intervention required to restore original IMGBB URLs.")
    print("   Use the backup file: image_urls_backup.json")
    pass
