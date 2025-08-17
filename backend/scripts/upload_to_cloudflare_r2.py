#!/usr/bin/env python3
"""
Upload tarot card images to Cloudflare R2 storage.
This script uploads images from the local images directory to Cloudflare R2
and generates a mapping file for URL migration.
"""

import json
import mimetypes
import os
import sys
from pathlib import Path
from typing import Any

import boto3
from botocore.config import Config
from botocore.exceptions import ClientError, NoCredentialsError
from dotenv import load_dotenv

# Add the parent directory to the path to import from the backend
sys.path.append(str(Path(__file__).parent.parent))

load_dotenv()

# Cloudflare R2 configuration
R2_ACCOUNT_ID = os.getenv("CLOUDFLARE_R2_ACCOUNT_ID")
R2_ACCESS_KEY_ID = os.getenv("CLOUDFLARE_R2_ACCESS_KEY_ID")
R2_SECRET_ACCESS_KEY = os.getenv("CLOUDFLARE_R2_SECRET_ACCESS_KEY")
R2_BUCKET_NAME = os.getenv("CLOUDFLARE_R2_BUCKET_NAME", "tarot-images")
R2_CUSTOM_DOMAIN = os.getenv("CLOUDFLARE_R2_CUSTOM_DOMAIN")


def validate_configuration():
    """Validate that all required configuration is present."""
    missing_vars = []

    if not R2_ACCOUNT_ID:
        missing_vars.append("CLOUDFLARE_R2_ACCOUNT_ID")
    if not R2_ACCESS_KEY_ID:
        missing_vars.append("CLOUDFLARE_R2_ACCESS_KEY_ID")
    if not R2_SECRET_ACCESS_KEY:
        missing_vars.append("CLOUDFLARE_R2_SECRET_ACCESS_KEY")
    if not R2_CUSTOM_DOMAIN:
        missing_vars.append("CLOUDFLARE_R2_CUSTOM_DOMAIN")

    if missing_vars:
        print("❌ Missing required environment variables:")
        for var in missing_vars:
            print(f"   - {var}")
        print("\nPlease set these variables in your .env file.")
        return False

    return True


def create_r2_client():
    """Create and configure the S3 client for Cloudflare R2."""
    try:
        s3_client = boto3.client(
            "s3",
            endpoint_url=f"https://{R2_ACCOUNT_ID}.r2.cloudflarestorage.com",
            aws_access_key_id=R2_ACCESS_KEY_ID,
            aws_secret_access_key=R2_SECRET_ACCESS_KEY,
            config=Config(signature_version="s3v4"),
            region_name="auto",
        )

        # Test connection by listing buckets
        s3_client.list_buckets()
        return s3_client

    except NoCredentialsError:
        print("❌ Invalid R2 credentials. Please check your access keys.")
        return None
    except ClientError as e:
        print(f"❌ Failed to connect to R2: {e}")
        return None


def get_content_type(file_path: Path) -> str:
    """Get the appropriate content type for a file."""
    content_type, _ = mimetypes.guess_type(str(file_path))

    if content_type:
        return content_type

    # Default content types for common image formats
    extension = file_path.suffix.lower()
    if extension == ".jpg" or extension == ".jpeg":
        return "image/jpeg"
    elif extension == ".png":
        return "image/png"
    elif extension == ".webp":
        return "image/webp"
    elif extension == ".gif":
        return "image/gif"
    else:
        return "application/octet-stream"


def upload_file_to_r2(s3_client, file_path: Path, key: str) -> bool:
    """Upload a single file to R2."""
    try:
        content_type = get_content_type(file_path)

        with file_path.open("rb") as file_data:
            s3_client.upload_fileobj(
                file_data,
                R2_BUCKET_NAME,
                key,
                ExtraArgs={
                    "ContentType": content_type,
                    "CacheControl": "public, max-age=31536000",  # 1 year
                    "Metadata": {"original-filename": file_path.name, "upload-source": "tarot-agent-migration"},
                },
            )
        return True

    except ClientError as e:
        print(f"❌ Failed to upload {file_path.name}: {e}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error uploading {file_path.name}: {e}")
        return False


def upload_images_to_r2() -> dict[str, Any]:
    """Upload all tarot card images to Cloudflare R2."""
    print("🚀 Starting Cloudflare R2 upload process...")

    # Validate configuration
    if not validate_configuration():
        return {}

    # Create R2 client
    s3_client = create_r2_client()
    if not s3_client:
        return {}

    # Find image directories
    base_dir = Path(__file__).parent.parent.parent  # Go up to project root
    image_dirs = [
        base_dir / "images/kaggle_tarot_images/cards",
        base_dir / "images/placeholder_images",
        base_dir / "images/raw_images",
    ]

    upload_results = {}
    total_uploaded = 0
    total_failed = 0

    for image_dir in image_dirs:
        if not image_dir.exists():
            print(f"⚠️  Directory not found: {image_dir}")
            continue

        print(f"\n📁 Processing directory: {image_dir.name}")

        # Process all image files recursively
        for image_file in image_dir.rglob("*"):
            if not image_file.is_file():
                continue

            # Check if it's an image file
            if image_file.suffix.lower() not in [".jpg", ".jpeg", ".png", ".webp", ".gif"]:
                continue

            # Create the R2 key (path in bucket)
            relative_path = image_file.relative_to(base_dir / "images")
            key = str(relative_path).replace("\\", "/")  # Ensure forward slashes

            print(f"  📤 Uploading: {image_file.name} -> {key}")

            if upload_file_to_r2(s3_client, image_file, key):
                # Create public URL
                public_url = f"https://{R2_CUSTOM_DOMAIN}/{key}"
                upload_results[image_file.name] = {
                    "image_url": public_url,
                    "key": key,
                    "status": "success",
                    "original_path": str(image_file.relative_to(base_dir)),
                    "content_type": get_content_type(image_file),
                }
                total_uploaded += 1
                print(f"  ✅ Success: {public_url}")
            else:
                upload_results[image_file.name] = {
                    "status": "error",
                    "error": "Upload failed",
                    "original_path": str(image_file.relative_to(base_dir)),
                }
                total_failed += 1

    # Save results
    results_file = base_dir / "cloudflare_upload_results.json"
    with results_file.open("w") as f:
        json.dump(upload_results, f, indent=2)

    # Print summary
    print("\n📊 Upload Summary:")
    print(f"   ✅ Successfully uploaded: {total_uploaded} files")
    print(f"   ❌ Failed uploads: {total_failed} files")
    print(f"   📄 Results saved to: {results_file}")

    if total_uploaded > 0:
        print("\n🎉 Images are now available via CDN:")
        print(f"   🌐 Base URL: https://{R2_CUSTOM_DOMAIN}/")
        print("   📝 Next steps:")
        print("      1. Update your application configuration")
        print("      2. Run the migration script to update URLs in database")
        print("      3. Test image loading in your application")

    return upload_results


def main():
    """Main function."""
    try:
        results = upload_images_to_r2()

        if results:
            print("\n✨ Upload completed successfully!")
            return 0
        else:
            print("\n💥 Upload failed or no files processed.")
            return 1

    except KeyboardInterrupt:
        print("\n⚠️  Upload interrupted by user.")
        return 1
    except Exception as e:
        print(f"\n💥 Unexpected error: {e}")
        return 1


if __name__ == "__main__":
    exit(main())
