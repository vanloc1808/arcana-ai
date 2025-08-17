#!/usr/bin/env python3
"""
Migrate image URLs from IMGBB to Cloudflare CDN.
This script updates the database to use the new Cloudflare CDN URLs
instead of the slow IMGBB URLs.
"""

import json
import os
import sys
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from sqlalchemy import create_engine, text

# Add the parent directory to the path to import from the backend
sys.path.append(str(Path(__file__).parent.parent))

load_dotenv()


def load_cloudflare_results() -> dict[str, Any]:
    """Load results from the Cloudflare upload process."""
    results_file = Path(__file__).parent.parent.parent / "cloudflare_upload_results.json"

    if not results_file.exists():
        print(f"❌ Results file not found: {results_file}")
        print("   Please run upload_to_cloudflare_r2.py first")
        return {}

    try:
        with results_file.open() as f:
            return json.load(f)
    except json.JSONDecodeError as e:
        print(f"❌ Invalid JSON in results file: {e}")
        return {}
    except Exception as e:
        print(f"❌ Failed to load results file: {e}")
        return {}


def create_database_connection():
    """Create database connection."""
    database_url = os.getenv("SQLALCHEMY_DATABASE_URL", "sqlite:///./tarot.db")

    try:
        engine = create_engine(database_url)
        # Test the connection
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return engine
    except Exception as e:
        print(f"❌ Failed to connect to database: {e}")
        return None


def backup_current_urls(engine):
    """Create a backup of current image URLs."""
    backup_file = Path(__file__).parent.parent.parent / "image_urls_backup.json"

    try:
        with engine.connect() as conn:
            # Backup cards table
            result = conn.execute(text("SELECT id, name, image_url FROM cards WHERE image_url IS NOT NULL"))
            cards_backup = [{"id": row[0], "name": row[1], "image_url": row[2]} for row in result]

            # Backup any other tables with image URLs if they exist
            backup_data = {
                "cards": cards_backup,
                "backup_timestamp": str(Path(__file__).stat().st_mtime),
                "original_source": "IMGBB",
            }

            with backup_file.open("w") as f:
                json.dump(backup_data, f, indent=2)

            print(f"✅ Backup created: {backup_file}")
            print(f"   Backed up {len(cards_backup)} card URLs")

    except Exception as e:
        print(f"❌ Failed to create backup: {e}")
        raise


def map_filename_to_card(filename: str) -> str:
    """Map a filename to card name pattern for database matching."""
    # Remove extension
    base_name = filename.replace(".jpg", "").replace(".jpeg", "").replace(".png", "").replace(".webp", "")

    # Handle different naming patterns
    # Major arcana: m00.jpg -> 00, m01.jpg -> 01, etc.
    if base_name.startswith("m"):
        return base_name[1:]  # Remove 'm' prefix

    # Minor arcana: w01.jpg -> wands 01, c01.jpg -> cups 01, etc.
    suit_map = {"w": "wands", "c": "cups", "s": "swords", "p": "pentacles"}

    if len(base_name) >= 2 and base_name[0] in suit_map:
        suit = suit_map[base_name[0]]
        number = base_name[1:]
        return f"{suit} {number}"

    # Return as-is for other patterns
    return base_name


def update_card_urls(engine, cloudflare_results: dict[str, Any]) -> dict[str, int]:
    """Update card URLs in the database."""
    update_stats = {"updated": 0, "not_found": 0, "errors": 0}

    successful_uploads = {k: v for k, v in cloudflare_results.items() if v.get("status") == "success"}

    print(f"📄 Processing {len(successful_uploads)} successful uploads...")

    with engine.connect() as conn:
        # Start a transaction
        trans = conn.begin()

        try:
            for filename, result in successful_uploads.items():
                new_url = result["image_url"]

                # Try multiple matching strategies
                patterns_to_try = [
                    f"%{filename}%",  # Direct filename match
                    f"%{filename.replace('.jpg', '')}%",  # Without extension
                    f"%{map_filename_to_card(filename)}%",  # Mapped card name
                ]

                updated = False

                for pattern in patterns_to_try:
                    if updated:
                        break

                    # Try to update cards with this pattern
                    update_query = text(
                        """
                        UPDATE cards
                        SET image_url = :new_url
                        WHERE (image_url LIKE :pattern OR name LIKE :pattern)
                        AND image_url != :new_url
                    """
                    )

                    result_obj = conn.execute(update_query, {"new_url": new_url, "pattern": pattern})

                    if result_obj.rowcount > 0:
                        print(f"  ✅ Updated {result_obj.rowcount} card(s) for {filename} -> {new_url}")
                        update_stats["updated"] += result_obj.rowcount
                        updated = True

                if not updated:
                    print(f"  ⚠️  No matching cards found for {filename}")
                    update_stats["not_found"] += 1

            # Commit the transaction
            trans.commit()
            print("✅ Database transaction committed successfully")

        except Exception as e:
            trans.rollback()
            print(f"❌ Database transaction rolled back due to error: {e}")
            update_stats["errors"] += 1
            raise

    return update_stats


def verify_migration(engine, cloudflare_results: dict[str, Any]):
    """Verify that the migration was successful."""
    print("\n🔍 Verifying migration...")

    with engine.connect() as conn:
        # Count cards with old IMGBB URLs
        imgbb_count = conn.execute(text("SELECT COUNT(*) FROM cards WHERE image_url LIKE '%i.ibb.co%'")).scalar()

        # Count cards with new Cloudflare URLs
        cloudflare_count = conn.execute(
            text("SELECT COUNT(*) FROM cards WHERE image_url LIKE :domain"),
            {"domain": f"%{os.getenv('CLOUDFLARE_R2_CUSTOM_DOMAIN')}%"},
        ).scalar()

        # Count total cards with image URLs
        total_count = conn.execute(text("SELECT COUNT(*) FROM cards WHERE image_url IS NOT NULL")).scalar()

        print("📊 Migration Verification:")
        print(f"   🔗 Total cards with images: {total_count}")
        print(f"   🌐 Cloudflare CDN URLs: {cloudflare_count}")
        print(f"   📷 Remaining IMGBB URLs: {imgbb_count}")

        if imgbb_count == 0:
            print("   ✅ All URLs successfully migrated to Cloudflare!")
        else:
            print(f"   ⚠️  {imgbb_count} URLs still using IMGBB")

            # Show examples of unmigrated URLs
            examples = conn.execute(
                text("SELECT name, image_url FROM cards WHERE image_url LIKE '%i.ibb.co%' LIMIT 5")
            ).fetchall()

            if examples:
                print("   📝 Examples of unmigrated cards:")
                for name, url in examples:
                    print(f"      - {name}: {url}")


def migrate_image_urls():
    """Main migration function."""
    print("🚀 Starting image URL migration from IMGBB to Cloudflare CDN...")

    # Load Cloudflare upload results
    cloudflare_results = load_cloudflare_results()
    if not cloudflare_results:
        return False

    successful_count = len([r for r in cloudflare_results.values() if r.get("status") == "success"])
    print(f"📄 Found {successful_count} successful uploads to migrate")

    if successful_count == 0:
        print("❌ No successful uploads found. Nothing to migrate.")
        return False

    # Connect to database
    engine = create_database_connection()
    if not engine:
        return False

    try:
        # Create backup
        print("\n💾 Creating backup of current URLs...")
        backup_current_urls(engine)

        # Update URLs
        print("\n🔄 Updating image URLs in database...")
        stats = update_card_urls(engine, cloudflare_results)

        # Verify migration
        verify_migration(engine, cloudflare_results)

        # Print final summary
        print("\n📊 Migration Summary:")
        print(f"   ✅ Cards updated: {stats['updated']}")
        print(f"   ⚠️  Cards not found: {stats['not_found']}")
        print(f"   ❌ Errors: {stats['errors']}")

        if stats["updated"] > 0:
            print("\n🎉 Migration completed successfully!")
            print("   📝 Next steps:")
            print("      1. Test your application to ensure images load correctly")
            print("      2. Monitor Cloudflare analytics for cache performance")
            print("      3. Consider cleanup of old IMGBB images after verification")

        return stats["updated"] > 0

    except Exception as e:
        print(f"💥 Migration failed: {e}")
        return False


def main():
    """Main function."""
    try:
        success = migrate_image_urls()
        return 0 if success else 1

    except KeyboardInterrupt:
        print("\n⚠️  Migration interrupted by user.")
        return 1
    except Exception as e:
        print(f"\n💥 Unexpected error: {e}")
        return 1


if __name__ == "__main__":
    exit(main())
