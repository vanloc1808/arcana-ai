import os
import traceback
from datetime import datetime
from pathlib import Path
from typing import Optional

from fastapi import HTTPException, UploadFile
from PIL import Image, ImageOps

from utils.error_handlers import logger


class AvatarManager:
    """Manages avatar file uploads, storage, and processing."""

    def __init__(self, upload_dir: Optional[str] = None):
        """Initialize the avatar manager.

        Args:
            upload_dir: Directory to store avatar files. If None, auto-detect based on FASTAPI_ENV
        """
        if upload_dir is None:
            # Auto-detect path based on environment
            fastapi_env = os.getenv("FASTAPI_ENV", "production").lower()
            upload_dir = "./user-avatars" if fastapi_env == "local" else "/avatar"

        self.upload_dir = Path(upload_dir)
        self.upload_dir.mkdir(parents=True, exist_ok=True)

        # Supported image formats
        self.allowed_extensions = {".jpg", ".jpeg", ".png", ".gif", ".webp"}

        # Max file size: 10MB (we'll resize down to 1MB equivalent)
        self.max_file_size = 10 * 1024 * 1024  # 10MB

        # Target file size for compression
        self.target_file_size = 1024 * 1024  # 1MB

        # Avatar dimensions
        self.avatar_size = (400, 400)  # 400x400 pixels

    def validate_file(self, file: UploadFile) -> None:
        """Validate uploaded file.

        Args:
            file: The uploaded file

        Raises:
            HTTPException: If file is invalid
        """
        if not file.filename:
            raise HTTPException(status_code=400, detail="No file selected")

        # Check file extension
        file_ext = Path(file.filename).suffix.lower()
        if file_ext not in self.allowed_extensions:
            raise HTTPException(
                status_code=400, detail=f"Invalid file type. Allowed types: {', '.join(self.allowed_extensions)}"
            )

    def generate_filename(self, username: str, original_filename: str) -> str:
        """Generate a filename using username and timestamp format.

        Args:
            username: User's username
            original_filename: Original filename from upload

        Returns:
            Filename in format: username_{timestamp}.jpg
        """
        # Always save as .jpg since we convert to JPEG for consistency
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        # Sanitize username to be filesystem safe
        safe_username = "".join(c for c in username if c.isalnum() or c in ("-", "_")).strip()
        return f"{safe_username}_{timestamp}.jpg"

    def resize_and_compress_image(self, image: Image.Image) -> Image.Image:
        """Resize and compress image to target specifications.

        Args:
            image: PIL Image object

        Returns:
            Processed PIL Image object
        """
        # Convert to RGB if necessary (for JPEG output)
        if image.mode in ("RGBA", "LA", "P"):
            # Create a white background for transparency
            background = Image.new("RGB", image.size, (255, 255, 255))
            if image.mode == "P":
                image = image.convert("RGBA")
            background.paste(image, mask=image.split()[-1] if len(image.split()) > 3 else None)
            image = background
        elif image.mode != "RGB":
            image = image.convert("RGB")

        # Auto-orient based on EXIF data
        image = ImageOps.exif_transpose(image)

        # Resize to target dimensions while maintaining aspect ratio
        image.thumbnail(self.avatar_size, Image.Resampling.LANCZOS)

        # Create a square image with white background if needed
        if image.size != self.avatar_size:
            background = Image.new("RGB", self.avatar_size, (255, 255, 255))
            # Center the image
            offset = ((self.avatar_size[0] - image.size[0]) // 2, (self.avatar_size[1] - image.size[1]) // 2)
            background.paste(image, offset)
            image = background

        return image

    def save_avatar(self, file: UploadFile, username: str) -> str:
        """Save and process uploaded avatar file.

        Args:
            file: Uploaded file
            username: User's username for filename generation

        Returns:
            Filename of the saved avatar

        Raises:
            HTTPException: If processing fails
        """
        self.validate_file(file)

        try:
            # Read file content
            file_content = file.file.read()

            # Check file size
            if len(file_content) > self.max_file_size:
                raise HTTPException(
                    status_code=400, detail=f"File too large. Maximum size: {self.max_file_size // (1024*1024)}MB"
                )

            # Reset file pointer for image processing
            file.file.seek(0)

            # Process image
            image = Image.open(file.file)
            processed_image = self.resize_and_compress_image(image)

            # Generate filename with username and timestamp
            filename = self.generate_filename(username, file.filename)
            file_path = self.upload_dir / filename

            # Save with compression to target file size (always as JPEG)
            quality = 95
            while quality > 10:
                # Save to the target path to check size
                processed_image.save(file_path, "JPEG", quality=quality, optimize=True)

                # Check if file size is acceptable
                if file_path.stat().st_size <= self.target_file_size:
                    break

                quality -= 5

            return filename

        except Exception as e:
            if isinstance(e, HTTPException):
                raise
            import traceback

            print(f"Avatar processing error: {str(e)}")
            print(f"Traceback: {traceback.format_exc()}")
            raise HTTPException(status_code=500, detail=f"Error processing image: {str(e)}")
        finally:
            # Reset file pointer
            file.file.seek(0)

    def delete_avatar(self, filename: str) -> bool:
        """Delete an avatar file.

        Args:
            filename: Name of the file to delete

        Returns:
            True if deleted successfully, False otherwise
        """
        if not filename:
            return True

        file_path = self.upload_dir / filename
        try:
            if file_path.exists():
                file_path.unlink()
            return True
        except Exception:
            return False

    def get_avatar_path(self, filename: str) -> Optional[Path]:
        """Get the full path to an avatar file.

        Args:
            filename: Name of the avatar file

        Returns:
            Path object if file exists, None otherwise
        """
        if not filename:
            return None

        file_path = self.upload_dir / filename
        return file_path if file_path.exists() else None

    def get_avatar_url(self, filename: str, base_url: str = "") -> Optional[str]:
        """Get the URL to access an avatar file.

        Args:
            filename: Name of the avatar file
            base_url: Base URL for the application

        Returns:
            URL string if file exists, None otherwise
        """
        if not filename:
            return None

        file_path = self.upload_dir / filename
        if file_path.exists():
            return f"{base_url}/auth/avatars/{filename}"
        return None

    def find_user_avatars(self, username: str) -> list[Path]:
        """Find all avatar files for a specific user.

        Args:
            username: Username to search for

        Returns:
            List of Path objects for avatar files belonging to the user
        """
        if not username:
            return []

        # Sanitize username to match filename format
        safe_username = "".join(c for c in username if c.isalnum() or c in ("-", "_")).strip()
        pattern = f"{safe_username}_*.jpg"

        try:
            return list(self.upload_dir.glob(pattern))
        except Exception:
            return []

    def cleanup_old_user_avatars(self, username: str, keep_latest: int = 1) -> int:
        """Clean up old avatars for a user, keeping only the most recent ones.

        Args:
            username: Username to clean up avatars for
            keep_latest: Number of most recent avatars to keep (default: 1)

        Returns:
            Number of files deleted
        """
        if keep_latest < 1:
            keep_latest = 1

        user_avatars = self.find_user_avatars(username)
        if len(user_avatars) <= keep_latest:
            return 0

        # Sort by modification time (newest first)
        user_avatars.sort(key=lambda p: p.stat().st_mtime, reverse=True)

        # Delete old files (keeping the newest ones)
        deleted_count = 0
        for old_avatar in user_avatars[keep_latest:]:
            try:
                old_avatar.unlink()
                deleted_count += 1
            except OSError:
                logger.logger.error(f"Error deleting avatar {old_avatar}: {traceback.format_exc()}")
                continue

        return deleted_count


class NoOpAvatarManager:
    """No-op avatar manager for local development.

    This class provides the same interface as AvatarManager but doesn't perform
    any actual file operations. Used when FASTAPI_ENV=local to avoid file system issues.
    """

    def __init__(self):
        """Initialize no-op avatar manager."""
        self.upload_dir = None
        self.allowed_extensions = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
        self.max_file_size = 10 * 1024 * 1024
        self.target_file_size = 1024 * 1024
        self.avatar_size = (400, 400)

    def validate_file(self, file: UploadFile) -> None:
        """Validate uploaded file (no-op)."""

    def generate_filename(self, username: str, original_filename: str) -> str:
        """Generate filename (returns placeholder)."""
        return f"local_avatar_{username}.jpg"

    def resize_and_compress_image(self, image) -> None:
        """Resize and compress image (no-op)."""

    def save_avatar(self, file: UploadFile, username: str) -> str:
        """Save avatar (no-op, returns placeholder filename)."""
        return f"local_avatar_{username}.jpg"

    def delete_avatar(self, filename: str) -> bool:
        """Delete avatar (no-op, always returns True)."""
        return True

    def get_avatar_path(self, filename: str) -> Optional[Path]:
        """Get avatar path (always returns None in local mode)."""
        return None

    def get_avatar_url(self, filename: str, base_url: str = "") -> Optional[str]:
        """Get avatar URL (returns placeholder URL)."""
        if not filename:
            return None
        return f"{base_url}/auth/avatars/placeholder.jpg"

    def find_user_avatars(self, username: str) -> list[Path]:
        """Find user avatars (returns empty list)."""
        return []

    def cleanup_old_avatars(self, username: str, keep_latest: int = 5) -> int:
        """Cleanup old avatars (no-op, returns 0)."""
        return 0


# Global instance - conditionally create based on environment
fastapi_env = os.getenv("FASTAPI_ENV", "production").lower()
avatar_manager = NoOpAvatarManager() if fastapi_env == "local" else AvatarManager()
