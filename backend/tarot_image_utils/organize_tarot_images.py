import argparse
import json
import shutil
from pathlib import Path

from PIL import Image


class TarotImageOrganizer:
    """Organizes and validates tarot card images into a structured directory.

    Attributes:
        source_dir (Path): Directory containing unorganized images.
        target_dir (Path): Directory to save organized images.
        card_data (dict): Tarot card metadata loaded from JSON.
        required_sizes (tuple): Required image dimensions (width, height).
        max_file_size (int): Maximum allowed file size in bytes.
    """
    def __init__(self, source_dir: str, target_dir: str):
        """Initializes the organizer with source and target directories.

        Args:
            source_dir (str): Directory containing unorganized images.
            target_dir (str): Directory to save organized images.
        """
        self.source_dir = Path(source_dir)
        self.target_dir = Path(target_dir)
        self.card_data = self._load_card_data()
        self.required_sizes = (500, 900)  # width, height
        self.max_file_size = 200 * 1024  # 200KB in bytes

    def _load_card_data(self) -> dict:
        """Load tarot card data from JSON file.

        Returns:
            dict: Tarot card metadata.
        """
        with open("tarot_cards.json") as f:
            return json.load(f)

    def _create_directory_structure(self):
        """Create the required directory structure for organized images."""
        directories = [
            "major",
            "minor/wands",
            "minor/cups",
            "minor/swords",
            "minor/pentacles",
        ]

        for directory in directories:
            (self.target_dir / directory).mkdir(parents=True, exist_ok=True)

    def _get_card_number(self, filename: str, suit: str = None) -> tuple[int, str]:
        """Extract card number from filename and validate against card data.

        Args:
            filename (str): Name of the image file.
            suit (str, optional): Suit for minor arcana cards.

        Returns:
            tuple[int, str]: (Card number, card name) if found, else (None, None).
        """
        # Remove file extension and convert to lowercase
        name = Path(filename).stem.lower()

        if suit:
            # Minor Arcana
            for card in self.card_data["minor_arcana"][suit]:
                if name in card["name"].lower():
                    return card["number"], card["name"]
        else:
            # Major Arcana
            for card in self.card_data["major_arcana"]:
                if name in card["name"].lower():
                    return card["number"], card["name"]

        return None, None

    def _validate_image(self, image_path: Path) -> tuple[bool, str]:
        """Validate image dimensions and file size.

        Args:
            image_path (Path): Path to the image file.

        Returns:
            tuple[bool, str]: (True, 'Valid') if valid, else (False, error message).
        """
        try:
            with Image.open(image_path) as img:
                width, height = img.size
                file_size = image_path.stat().st_size

                if (width, height) != self.required_sizes:
                    return (
                        False,
                        (
                            f"Invalid dimensions: {width}x{height} "
                            f"(should be {self.required_sizes[0]}x{self.required_sizes[1]})"
                        ),
                    )

                if file_size > self.max_file_size:
                    return (
                        False,
                        f"File too large: {file_size/1024:.1f}KB (max {self.max_file_size/1024}KB)",
                    )

                return True, "Valid"
        except Exception as e:
            return False, f"Error processing image: {str(e)}"

    def organize_images(self):
        """Organize and validate all images in the source directory.

        Returns:
            dict: Report containing counts and lists of errors/warnings.
        """
        self._create_directory_structure()
        report = {"processed": 0, "valid": 0, "errors": [], "warnings": []}

        # Process Major Arcana
        major_dir = self.source_dir / "major"
        if major_dir.exists():
            for file_path in major_dir.glob("*"):
                if file_path.suffix.lower() in (".jpg", ".jpeg", ".png"):
                    report["processed"] += 1
                    number, card_name = self._get_card_number(file_path.name)

                    if number is None:
                        report["errors"].append(f"Could not identify Major Arcana card: {file_path.name}")
                        continue

                    target_path = self.target_dir / "major" / f"{number}.jpg"

                    is_valid, message = self._validate_image(file_path)
                    if is_valid:
                        shutil.copy2(file_path, target_path)
                        report["valid"] += 1
                    else:
                        report["errors"].append(f"{card_name}: {message}")

        # Process Minor Arcana
        for suit in ["wands", "cups", "swords", "pentacles"]:
            suit_dir = self.source_dir / "minor" / suit
            if suit_dir.exists():
                for file_path in suit_dir.glob("*"):
                    if file_path.suffix.lower() in (".jpg", ".jpeg", ".png"):
                        report["processed"] += 1
                        number, card_name = self._get_card_number(file_path.name, suit)

                        if number is None:
                            report["errors"].append(f"Could not identify {suit} card: {file_path.name}")
                            continue

                        target_path = self.target_dir / "minor" / suit / f"{number}.jpg"

                        is_valid, message = self._validate_image(file_path)
                        if is_valid:
                            shutil.copy2(file_path, target_path)
                            report["valid"] += 1
                        else:
                            report["errors"].append(f"{card_name}: {message}")

        return report


def main():
    """Entry point for the tarot image organizer CLI."""
    parser = argparse.ArgumentParser(description="Organize and validate tarot card images.")
    parser.add_argument("source_dir", help="Directory containing unorganized tarot card images")
    parser.add_argument("target_dir", help="Directory where organized images will be saved")
    args = parser.parse_args()

    organizer = TarotImageOrganizer(args.source_dir, args.target_dir)
    report = organizer.organize_images()

    print("\nOrganization Report:")
    print(f"Total images processed: {report['processed']}")
    print(f"Valid images: {report['valid']}")

    if report["errors"]:
        print("\nErrors:")
        for error in report["errors"]:
            print(f"- {error}")

    if report["warnings"]:
        print("\nWarnings:")
        for warning in report["warnings"]:
            print(f"- {warning}")


if __name__ == "__main__":
    main()
