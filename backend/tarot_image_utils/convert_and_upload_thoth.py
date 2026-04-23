#!/usr/bin/env python3
"""
Convert Thoth Tarot WEBP images to JPG, upload to Cloudflare R2,
and emit a JSON mapping of card name → CDN URL.

Usage:
    # Convert + upload (needs R2 credentials in .env or environment)
    python convert_and_upload_thoth.py

    # Convert only, skip upload (for testing)
    python convert_and_upload_thoth.py --skip-upload

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
# Card name mapping: filename stem → canonical card name used in the DB
# ---------------------------------------------------------------------------

# Thoth Trumps (major arcana) — T-00 through T-21
TRUMP_MAP = {
    "sm_Thot-T-00": "The Fool",
    "sm_Thot-T-01": "The Magus",
    "sm_Thot-T-02": "The Priestess",
    "sm_Thot-T-03": "The Empress",
    "sm_Thot-T-04": "The Emperor",
    "sm_Thot-T-05": "The Hierophant",
    "sm_Thot-T-06": "The Lovers",
    "sm_Thot-T-07": "The Chariot",
    "sm_Thot-T-08": "Adjustment",        # Justice in Rider-Waite
    "sm_Thot-T-09": "The Hermit",
    "sm_Thot-T-10": "Fortune",            # Wheel of Fortune in Rider-Waite
    "sm_Thot-T-11": "Lust",              # Strength in Rider-Waite
    "sm_Thot-T-12": "The Hanged Man",
    "sm_Thot-T-13": "Death",
    "sm_Thot-T-14": "Art",               # Temperance in Rider-Waite
    "sm_Thot-T-15": "The Devil",
    "sm_Thot-T-16": "The Tower",
    "sm_Thot-T-17": "The Star",
    "sm_Thot-T-18": "The Moon",
    "sm_Thot-T-19": "The Sun",
    "sm_Thot-T-20": "The Aeon",          # Judgement in Rider-Waite
    "sm_Thot-T-21": "The Universe",      # The World in Rider-Waite
}

# Minor arcana: rank code → rank label per suit
# 0A = Ace, 02-09 = Two-Nine, 10 = Ten
# PS = Princess, PN = Prince, QU = Queen, KN = Knight
_RANK = {
    "0A": "Ace",
    "02": "Two",
    "03": "Three",
    "04": "Four",
    "05": "Five",
    "06": "Six",
    "07": "Seven",
    "08": "Eight",
    "09": "Nine",
    "10": "Ten",
    "PS": "Princess",
    "PN": "Prince",
    "QU": "Queen",
    "KN": "Knight",
}

_SUIT = {
    "C": "Cups",
    "D": "Disks",   # Pentacles in Rider-Waite
    "W": "Wands",
    "S": "Swords",
}


def _build_minor_map() -> dict[str, str]:
    mapping = {}
    for suit_code, suit_name in _SUIT.items():
        for rank_code, rank_label in _RANK.items():
            stem = f"sm_Thot-{suit_code}-{rank_code}"
            if rank_label in ("Princess", "Prince", "Queen", "Knight"):
                card_name = f"{rank_label} of {suit_name}"
            else:
                card_name = f"{rank_label} of {suit_name}"
            mapping[stem] = card_name
    return mapping


CARD_NAME_MAP: dict[str, str] = {**TRUMP_MAP, **_build_minor_map()}

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------

SCRIPT_DIR = Path(__file__).parent
THOTH_DIR = SCRIPT_DIR / "decks" / "thoth"
JPG_DIR = THOTH_DIR / "jpg"          # converted JPGs land here
RESULT_FILE = SCRIPT_DIR / "thoth_upload_results.json"


# ---------------------------------------------------------------------------
# Step 1: Convert WEBP → JPG
# ---------------------------------------------------------------------------

def convert_webp_to_jpg(quality: int = 90) -> list[Path]:
    """Convert every *.webp in THOTH_DIR to JPG in JPG_DIR."""
    try:
        from PIL import Image
    except ImportError:
        sys.exit("Pillow is required: pip install Pillow")

    JPG_DIR.mkdir(parents=True, exist_ok=True)

    webp_files = sorted(THOTH_DIR.glob("*.webp"))
    if not webp_files:
        sys.exit(f"No .webp files found in {THOTH_DIR}")

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

    account_id  = os.getenv("CLOUDFLARE_R2_ACCOUNT_ID")
    access_key  = os.getenv("CLOUDFLARE_R2_ACCESS_KEY_ID")
    secret_key  = os.getenv("CLOUDFLARE_R2_SECRET_ACCESS_KEY")
    bucket      = os.getenv("CLOUDFLARE_R2_BUCKET_NAME", "tarot-images")
    cdn_domain  = os.getenv("CLOUDFLARE_R2_CUSTOM_DOMAIN") or os.getenv("IMAGE_CDN_URL", "")

    missing = [v for v, k in [
        (account_id, "CLOUDFLARE_R2_ACCOUNT_ID"),
        (access_key,  "CLOUDFLARE_R2_ACCESS_KEY_ID"),
        (secret_key,  "CLOUDFLARE_R2_SECRET_ACCESS_KEY"),
        (cdn_domain,  "CLOUDFLARE_R2_CUSTOM_DOMAIN / IMAGE_CDN_URL"),
    ] if not v]
    if missing:
        sys.exit(f"Missing env vars: {missing}")

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
        r2_key = f"thoth/cards/{jpg.name}"
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
# Step 3: Emit result JSON  (stem → {cdn_url, card_name})
# ---------------------------------------------------------------------------

def build_result(stem_to_url: dict[str, str]) -> dict:
    """Merge CDN URLs with card names and write thoth_upload_results.json."""
    output = {}
    missing_stems = []

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
    print(f"Total mapped: {len(output)} / 78 expected")
    return output


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Convert Thoth WEBP→JPG and upload to R2")
    parser.add_argument("--skip-upload", action="store_true",
                        help="Convert only; do not upload to R2")
    parser.add_argument("--quality", type=int, default=90,
                        help="JPEG quality 1-95 (default 90)")
    args = parser.parse_args()

    # 1. Convert
    jpg_files = convert_webp_to_jpg(quality=args.quality)

    if args.skip_upload:
        print("--skip-upload: skipping R2 upload.")
        # Build a dry-run URL map using the expected CDN pattern
        load_dotenv(SCRIPT_DIR.parent / ".env")
        cdn_domain = (os.getenv("CLOUDFLARE_R2_CUSTOM_DOMAIN")
                      or os.getenv("IMAGE_CDN_URL", "https://cdn.example.com"))
        stem_to_url = {
            jpg.stem: f"{cdn_domain.rstrip('/')}/thoth/cards/{jpg.name}"
            for jpg in jpg_files
        }
    else:
        # 2. Upload
        stem_to_url = upload_to_r2(jpg_files)

    # 3. Emit result JSON
    build_result(stem_to_url)


if __name__ == "__main__":
    main()
