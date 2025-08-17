#!/usr/bin/env python3
"""
Test Cloudflare R2 setup and configuration.
This script verifies that your Cloudflare R2 credentials are working
before running the full image migration.
"""

import os
import sys
from pathlib import Path

import boto3
from botocore.config import Config
from botocore.exceptions import ClientError, NoCredentialsError
from dotenv import load_dotenv

# Add the parent directory to the path to import from the backend
sys.path.append(str(Path(__file__).parent.parent))

load_dotenv()


def test_cloudflare_r2_connection():
    """Test connection to Cloudflare R2."""
    print("🧪 Testing Cloudflare R2 Configuration...")

    # Get configuration
    account_id = os.getenv("CLOUDFLARE_R2_ACCOUNT_ID")
    access_key = os.getenv("CLOUDFLARE_R2_ACCESS_KEY_ID")
    secret_key = os.getenv("CLOUDFLARE_R2_SECRET_ACCESS_KEY")
    bucket_name = os.getenv("CLOUDFLARE_R2_BUCKET_NAME", "tarot-images")
    custom_domain = os.getenv("CLOUDFLARE_R2_CUSTOM_DOMAIN")

    # Check if all required variables are set
    missing_vars = []
    if not account_id:
        missing_vars.append("CLOUDFLARE_R2_ACCOUNT_ID")
    if not access_key:
        missing_vars.append("CLOUDFLARE_R2_ACCESS_KEY_ID")
    if not secret_key:
        missing_vars.append("CLOUDFLARE_R2_SECRET_ACCESS_KEY")
    if not custom_domain:
        missing_vars.append("CLOUDFLARE_R2_CUSTOM_DOMAIN")

    if missing_vars:
        print("❌ Missing required environment variables:")
        for var in missing_vars:
            print(f"   - {var}")
        print("\n📝 Please add these to your .env file:")
        print("   CLOUDFLARE_R2_ACCOUNT_ID=your_account_id")
        print("   CLOUDFLARE_R2_ACCESS_KEY_ID=your_access_key")
        print("   CLOUDFLARE_R2_SECRET_ACCESS_KEY=your_secret_key")
        print("   CLOUDFLARE_R2_BUCKET_NAME=tarot-images")
        print("   CLOUDFLARE_R2_CUSTOM_DOMAIN=images.yourdomain.com")
        return False

    print("✅ Environment variables configured")
    print(f"   Account ID: {account_id[:8]}...")
    print(f"   Bucket: {bucket_name}")
    print(f"   Custom Domain: {custom_domain}")

    try:
        # Create S3 client for R2
        s3_client = boto3.client(
            "s3",
            endpoint_url=f"https://{account_id}.r2.cloudflarestorage.com",
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key,
            config=Config(signature_version="s3v4"),
            region_name="auto",
        )

        print("✅ R2 client created successfully")

        # Test connection by listing buckets
        response = s3_client.list_buckets()
        buckets = [bucket["Name"] for bucket in response["Buckets"]]
        print(f"✅ Connection successful. Found {len(buckets)} bucket(s)")

        # Check if our bucket exists
        if bucket_name in buckets:
            print(f"✅ Target bucket '{bucket_name}' exists")

            # Test bucket access by listing objects
            try:
                response = s3_client.list_objects_v2(Bucket=bucket_name, MaxKeys=5)
                object_count = response.get("KeyCount", 0)
                print(f"✅ Bucket access successful. Contains {object_count} objects (showing max 5)")

                if "Contents" in response:
                    print("   📄 Sample objects:")
                    for obj in response["Contents"][:3]:
                        print(f"      - {obj['Key']} ({obj['Size']} bytes)")

            except ClientError as e:
                print(f"⚠️  Bucket exists but access test failed: {e}")

        else:
            print(f"⚠️  Target bucket '{bucket_name}' not found")
            print(f"   Available buckets: {', '.join(buckets)}")
            print("   You may need to create the bucket or update the CLOUDFLARE_R2_BUCKET_NAME")

        return True

    except NoCredentialsError:
        print("❌ Invalid R2 credentials")
        print("   Please check your CLOUDFLARE_R2_ACCESS_KEY_ID and CLOUDFLARE_R2_SECRET_ACCESS_KEY")
        return False

    except ClientError as e:
        error_code = e.response.get("Error", {}).get("Code", "Unknown")
        error_message = e.response.get("Error", {}).get("Message", str(e))
        print(f"❌ Cloudflare R2 API error ({error_code}): {error_message}")

        if error_code == "SignatureDoesNotMatch":
            print("   This usually means your secret key is incorrect")
        elif error_code == "InvalidAccessKeyId":
            print("   This usually means your access key is incorrect")
        elif error_code == "AccessDenied":
            print("   This usually means your keys don't have the required permissions")

        return False

    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False


def test_image_files():
    """Check for available image files to upload."""
    print("\n📁 Checking for image files...")

    base_dir = Path(__file__).parent.parent.parent  # Go up to project root
    image_dirs = [
        base_dir / "images/kaggle_tarot_images/cards",
        base_dir / "images/placeholder_images",
        base_dir / "images/raw_images",
    ]

    total_images = 0
    found_dirs = []

    for image_dir in image_dirs:
        if image_dir.exists():
            image_files = (
                list(image_dir.rglob("*.jpg")) + list(image_dir.rglob("*.png")) + list(image_dir.rglob("*.webp"))
            )
            if image_files:
                found_dirs.append((image_dir, len(image_files)))
                total_images += len(image_files)

    if found_dirs:
        print(f"✅ Found {total_images} image files to upload:")
        for dir_path, count in found_dirs:
            print(f"   📂 {dir_path.name}: {count} files")
    else:
        print("⚠️  No image files found in expected directories:")
        for image_dir in image_dirs:
            print(f"   📂 {image_dir} - {'exists' if image_dir.exists() else 'missing'}")

    return total_images > 0


def main():
    """Main test function."""
    print("🚀 Cloudflare R2 Setup Test")
    print("=" * 50)

    # Test R2 connection
    r2_ok = test_cloudflare_r2_connection()

    # Test image files
    images_ok = test_image_files()

    print("\n" + "=" * 50)
    print("📊 Test Summary:")
    print(f"   🌐 Cloudflare R2: {'✅ Ready' if r2_ok else '❌ Needs setup'}")
    print(f"   📷 Image files: {'✅ Found' if images_ok else '⚠️  None found'}")

    if r2_ok and images_ok:
        print("\n🎉 All checks passed! You're ready to run the migration:")
        print("   python scripts/upload_to_cloudflare_r2.py")
        print("   python scripts/migrate_to_cloudflare.py")
        return 0
    else:
        print("\n⚠️  Please fix the issues above before proceeding")
        if not r2_ok:
            print("   1. Set up your Cloudflare R2 credentials in .env")
        if not images_ok:
            print("   2. Ensure image files are available for upload")
        return 1


if __name__ == "__main__":
    exit(main())
