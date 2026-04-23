#!/usr/bin/env python3
"""
Convert Tarot de Marseille WEBP images to JPG, upload to Cloudflare R2,
and emit a JSON mapping of card name → CDN URL.

Usage:
    # Convert + upload (needs R2 credentials in .env or environment)
    python convert_and_upload_marseille.py

    # Convert only, skip upload (for testing)
    python convert_and_upload_marseille.py --skip-upload

File naming convention (sm_MaNC-<suit>-<rank>.webp):
    Suits:  T=Trump, B=Bâtons (Wands), C=Coupes (Cups),
            D=Deniers (Pentacles), S=Épées (Swords)
    Ranks:  01-10 = Ace/Two…Ten, J1=Page/Valet, J2=Knight/Cavalier,
            QU=Queen, KI=King
    Trumps: T-00=The Fool (unnumbered), T-01…T-21 = I…XXI

Dependencies:
    pip install Pillow boto3 python-dotenv
"""

import argparse
import json
import os
import sys
from pathlib import Path

from dotenv import load_dotenv

# ---------------------------------------------------------------------------
# Card name mapping: filename stem → canonical English card name in the DB
# ---------------------------------------------------------------------------

# Trumps — Marseille numbering I–XXI plus unnumbered Fool (0)
# Note: In Marseille tradition Justice=VIII and Strength=XI (swapped vs
# Rider-Waite), but the English card *names* themselves are identical.
TRUMP_MAP: dict[str, str] = {
    "sm_MaNC-T-00": "The Fool",
    "sm_MaNC-T-01": "The Magician",         # I   Le Bateleur
    "sm_MaNC-T-02": "The High Priestess",   # II  La Papesse
    "sm_MaNC-T-03": "The Empress",           # III L'Impératrice
    "sm_MaNC-T-04": "The Emperor",           # IV  L'Empereur
    "sm_MaNC-T-05": "The Hierophant",        # V   Le Pape
    "sm_MaNC-T-06": "The Lovers",            # VI  Les Amoureux
    "sm_MaNC-T-07": "The Chariot",           # VII Le Chariot
    "sm_MaNC-T-08": "Justice",               # VIII La Justice (Marseille VIII, RW XI)
    "sm_MaNC-T-09": "The Hermit",            # IX  L'Ermite
    "sm_MaNC-T-10": "Wheel of Fortune",      # X   La Roue de Fortune
    "sm_MaNC-T-11": "Strength",              # XI  La Force (Marseille XI, RW VIII)
    "sm_MaNC-T-12": "The Hanged Man",        # XII Le Pendu
    "sm_MaNC-T-13": "Death",                 # XIII La Mort
    "sm_MaNC-T-14": "Temperance",            # XIV Tempérance
    "sm_MaNC-T-15": "The Devil",             # XV  Le Diable
    "sm_MaNC-T-16": "The Tower",             # XVI La Maison Dieu
    "sm_MaNC-T-17": "The Star",              # XVII L'Étoile
    "sm_MaNC-T-18": "The Moon",              # XVIII La Lune
    "sm_MaNC-T-19": "The Sun",               # XIX Le Soleil
    "sm_MaNC-T-20": "Judgement",             # XX  Le Jugement
    "sm_MaNC-T-21": "The World",             # XXI Le Monde
}

# Minor arcana: rank code → English rank label
_RANK: dict[str, str] = {
    "01": "Ace",
    "02": "Two",
    "03": "Three",
    "04": "Four",
    "05": "Five",
    "06": "Six",
    "07": "Seven",
    "08": "Eight",
    "09": "Nine",
    "10": "Ten",
    "J1": "Page",     # Valet in French Marseille
    "J2": "Knight",   # Cavalier in French Marseille
    "QU": "Queen",    # Reine
    "KI": "King",     # Roi
}

# Suit code (in filename) → English suit name used in the DB
_SUIT: dict[str, str] = {
    "B": "Wands",      # Bâtons
    "C": "Cups",       # Coupes
    "D": "Pentacles",  # Deniers (Coins)
    "S": "Swords",     # Épées
}


def _build_minor_map() -> dict[str, str]:
    mapping: dict[str, str] = {}
    for suit_code, suit_name in _SUIT.items():
        for rank_code, rank_label in _RANK.items():
            stem = f"sm_MaNC-{suit_code}-{rank_code}"
            mapping[stem] = f"{rank_label} of {suit_name}"
    return mapping


CARD_NAME_MAP: dict[str, str] = {**TRUMP_MAP, **_build_minor_map()}

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------

SCRIPT_DIR = Path(__file__).parent
MARSEILLE_DIR = SCRIPT_DIR / "decks" / "marseille"
JPG_DIR = MARSEILLE_DIR / "jpg"       # converted JPGs land here
RESULT_FILE = SCRIPT_DIR / "marseille_upload_results.json"


# ---------------------------------------------------------------------------
# Step 1: Convert WEBP → JPG
# ---------------------------------------------------------------------------

def convert_webp_to_jpg(quality: int = 90) -> list[Path]:
    """Convert every *.webp in MARSEILLE_DIR to JPG in JPG_DIR."""
    try:
        from PIL import Image
    except ImportError:
        sys.exit("Pillow is required: pip install Pillow")

    JPG_DIR.mkdir(parents=True, exist_ok=True)

    webp_files = sorted(MARSEILLE_DIR.glob("*.webp"))
    if not webp_files:
        sys.exit(f"No .webp files found in {MARSEILLE_DIR}")

    converted: list[Path] = []
    print(f"Converting {len(webp_files)} WEBP files → JPG (quality={quality}) …")

    for src in webp_files:
        dst = JPG_DIR / (src.stem + ".jpg")
        if dst.exists():
            print(f"  [skip]  {dst.name} already exists")
        else:
            with Image.open(src) as img:
                rgb = img.convert("RGB")   # WEBP may have alpha; JPG does not
                rgb.save(dst, "JPEG", quality=quality, optimize=True)
            print(f"  [ok]    {src.name} → {dst.name}")
        converted.append(dst)

    print(f"Converted: {len(converted)} files → {JPG_DIR}\n")
    return converted


# ---------------------------------------------------------------------------
# Step 2: Upload to Cloudflare R2
# ---------------------------------------------------------------------------

def upload_to_r2(jpg_files: list[Path]) -> dict[str, str]:
    """Upload every JPG to Cloudflare R2 and return {stem: cdn_url}."""
    try:
        import boto3
        from botocore.config import Config
        from botocore.exceptions import ClientError
    except ImportError:
        sys.exit("boto3 is required: pip install boto3")

    load_dotenv(SCRIPT_DIR.parent / ".env")

    account_id = os.getenv("CLOUDFLARE_R2_ACCOUNT_ID")
    access_key = os.getenv("CLOUDFLARE_R2_ACCESS_KEY_ID")
    secret_key = os.getenv("CLOUDFLARE_R2_SECRET_ACCESS_KEY")
    bucket     = os.getenv("CLOUDFLARE_R2_BUCKET_NAME", "tarot-images")
    cdn_domain = os.getenv("CLOUDFLARE_R2_CUSTOM_DOMAIN") or os.getenv("IMAGE_CDN_URL", "")

    missing = [k for v, k in [
        (account_id, "CLOUDFLARE_R2_ACCOUNT_ID"),
        (access_key,  "CLOUDFLARE_R2_ACCESS_KEY_ID"),
        (secret_key,  "CLOUDFLARE_R2_SECRET_ACCESS_KEY"),
        (cdn_domain,  "CLOUDFLARE_R2_CUSTOM_DOMAIN / IMAGE_CDN_URL"),
    ] if not v]
    if missing:
        sys.exit(f"Missing env vars: {missing}")

    if cdn_domain and not cdn_domain.startswith(("http://", "https://")):
        cdn_domain = "https://" + cdn_domain
    cdn_base = cdn_domain.rstrip("/")

    s3 = boto3.client(
        "s3",
        endpoint_url=f"https://{account_id}.r2.cloudflarestorage.com",
        aws_access_key_id=access_key,
        aws_secret_access_key=secret_key,
        config=Config(signature_version="s3v4"),
        region_name="auto",
    )

    results: dict[str, str] = {}
    print(f"Uploading {len(jpg_files)} files to R2 bucket '{bucket}' …")

    for jpg in jpg_files:
        r2_key = f"marseille/cards/{jpg.name}"
        cdn_url = f"{cdn_base}/{r2_key}"

        try:
            with jpg.open("rb") as fh:
                s3.upload_fileobj(
                    fh, bucket, r2_key,
                    ExtraArgs={
                        "ContentType": "image/jpeg",
                        "CacheControl": "public, max-age=31536000",
                    },
                )
            print(f"  [ok]  {jpg.name} → {cdn_url}")
            results[jpg.stem] = cdn_url
        except ClientError as exc:
            print(f"  [err] {jpg.name}: {exc}", file=sys.stderr)

    print(f"\nUploaded: {len(results)}/{len(jpg_files)} files.\n")
    return results


# ---------------------------------------------------------------------------
# Step 3: Emit result JSON  (card_name → {cdn_url, stem})
# ---------------------------------------------------------------------------

def build_result(stem_to_url: dict[str, str]) -> dict:
    """Merge CDN URLs with card names and write marseille_upload_results.json."""
    output: dict = {}
    missing_stems: list[str] = []

    for stem, url in stem_to_url.items():
        card_name = CARD_NAME_MAP.get(stem)
        if card_name is None:
            print(f"  [warn] No card name mapping for stem: {stem}", file=sys.stderr)
            missing_stems.append(stem)
            continue
        output[card_name] = {"cdn_url": url, "stem": stem}

    if missing_stems:
        print(f"\nWarning: {len(missing_stems)} stems had no card-name mapping.")

    RESULT_FILE.write_text(json.dumps(output, indent=2, ensure_ascii=False))
    print(f"Result written to: {RESULT_FILE}\n")

    expected = 78
    print(f"Total mapped: {len(output)} / {expected} expected")
    return output


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Convert Tarot de Marseille WEBP→JPG and upload to R2"
    )
    parser.add_argument(
        "--skip-upload", action="store_true",
        help="Convert only; do not upload to R2",
    )
    parser.add_argument(
        "--quality", type=int, default=90,
        help="JPEG quality 1-95 (default 90)",
    )
    args = parser.parse_args()

    # 1. Convert
    jpg_files = convert_webp_to_jpg(quality=args.quality)

    if args.skip_upload:
        print("--skip-upload: skipping R2 upload.")
        load_dotenv(SCRIPT_DIR.parent / ".env")
        cdn_domain = (
            os.getenv("CLOUDFLARE_R2_CUSTOM_DOMAIN")
            or os.getenv("IMAGE_CDN_URL", "https://cdn.example.com")
        )
        if not cdn_domain.startswith(("http://", "https://")):
            cdn_domain = "https://" + cdn_domain
        stem_to_url = {
            jpg.stem: f"{cdn_domain.rstrip('/')}/marseille/cards/{jpg.name}"
            for jpg in jpg_files
        }
    else:
        # 2. Upload
        stem_to_url = upload_to_r2(jpg_files)

    # 3. Emit result JSON
    build_result(stem_to_url)


if __name__ == "__main__":
    main()
