import argparse
import json
import os
import time

import requests
from tqdm import tqdm


class TarotImageDownloader:
    """Downloads tarot card images from a specified source and organizes them into directories.

    Attributes:
        output_dir (str): Directory to save downloaded images.
        card_data (dict): Tarot card metadata loaded from JSON.
        base_url (str): Base URL for image downloads.
        session (requests.Session): HTTP session for requests.
    """
    def __init__(self, output_dir: str = "./raw_images"):
        """Initializes the downloader and prepares the output directory.

        Args:
            output_dir (str): Directory to save downloaded images.
        """
        self.output_dir = output_dir
        self.card_data = self._load_card_data()
        # Using the Rider-Waite-Smith deck from Tarot.com
        self.base_url = "https://www.tarot.com/images/cards/rider-waite"
        self.session = requests.Session()
        self.session.headers.update(
            {
                "User-Agent": (
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                    "(KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
                )
            }
        )

        # Create output directory if it doesn't exist
        os.makedirs(output_dir, exist_ok=True)

    def _load_card_data(self) -> dict:
        """Load tarot card data from JSON file.

        Returns:
            dict: Tarot card metadata.
        """
        with open("tarot_cards.json") as f:
            return json.load(f)

    def _get_image_url(self, card: dict, arcana: str, suit: str = None) -> str:
        """Generate image URL for a card.

        Args:
            card (dict): Card metadata.
            arcana (str): 'major_arcana' or 'minor_arcana'.
            suit (str, optional): Suit for minor arcana cards.

        Returns:
            str: URL to the card image.
        """
        if arcana == "major_arcana":
            # Major arcana images
            name = card["name"].lower().replace(" ", "-")
            return f"{self.base_url}/major-{name}.jpg"
        else:
            # Minor arcana images
            name = card["name"].lower().replace(" ", "-")
            return f"{self.base_url}/minor-{suit}-{name}.jpg"

    def _download_image(self, url: str, output_path: str) -> bool:
        """Download a single image with retry logic.

        Args:
            url (str): URL of the image to download.
            output_path (str): Local path to save the image.

        Returns:
            bool: True if download succeeded, False otherwise.
        """
        max_retries = 3
        retry_delay = 2  # seconds

        for attempt in range(max_retries):
            try:
                response = self.session.get(url, stream=True, timeout=10)
                response.raise_for_status()

                # Save the image
                with open(output_path, "wb") as f:
                    for chunk in response.iter_content(chunk_size=8192):
                        f.write(chunk)
                return True
            except requests.exceptions.RequestException as e:
                if attempt < max_retries - 1:
                    time.sleep(retry_delay)
                    continue
                print(f"Failed to download {url}: {str(e)}")
                return False

    def _create_directory_structure(self):
        """Create the directory structure for organized images."""
        # Create major arcana directory
        os.makedirs(os.path.join(self.output_dir, "major"), exist_ok=True)

        # Create minor arcana directories
        for suit in ["wands", "cups", "swords", "pentacles"]:
            os.makedirs(os.path.join(self.output_dir, "minor", suit), exist_ok=True)

    def download_all_images(self):
        """Download all tarot card images and save them to the output directory."""
        print("Starting download process...")
        print(f"Images will be saved to: {self.output_dir}")

        # Create directory structure
        self._create_directory_structure()

        # Initialize progress bar
        total_cards = len(self.card_data["major_arcana"])
        for suit in self.card_data["minor_arcana"]:
            total_cards += len(self.card_data["minor_arcana"][suit])

        progress_bar = tqdm(total=total_cards, desc="Downloading images", unit="card")

        success_count = 0
        error_count = 0

        # Process major arcana
        for card in self.card_data["major_arcana"]:
            output_path = os.path.join(self.output_dir, "major", f"{card['number']}.jpg")

            # Skip if file already exists
            if os.path.exists(output_path):
                progress_bar.update(1)
                success_count += 1
                continue

            # Download image
            url = self._get_image_url(card, "major_arcana")
            if self._download_image(url, output_path):
                success_count += 1
            else:
                error_count += 1

            progress_bar.update(1)
            time.sleep(1.5)  # Be nice to the server

        # Process minor arcana
        for suit, cards in self.card_data["minor_arcana"].items():
            for card in cards:
                output_path = os.path.join(self.output_dir, "minor", suit, f"{card['number']}.jpg")

                # Skip if file already exists
                if os.path.exists(output_path):
                    progress_bar.update(1)
                    success_count += 1
                    continue

                # Download image
                url = self._get_image_url(card, "minor_arcana", suit)
                if self._download_image(url, output_path):
                    success_count += 1
                else:
                    error_count += 1

                progress_bar.update(1)
                time.sleep(1.5)  # Be nice to the server

        progress_bar.close()

        print("\nDownload Summary:")
        print(f"Total cards: {total_cards}")
        print(f"Successfully downloaded: {success_count}")
        print(f"Failed downloads: {error_count}")

        if error_count > 0:
            print("\nSome images failed to download. You may want to retry the download.")
            print("\nAlternative options:")
            print("1. Purchase a physical Rider-Waite-Smith deck and scan the cards")
            print("2. Use a different tarot deck with appropriate licensing")
            print("3. Commission an artist to create custom tarot card artwork")
            print("4. Use Creative Commons licensed tarot card images")
        else:
            print("\nAll images downloaded successfully!")
            print("\nNext steps:")
            print("1. Run the image organizer script:")
            print("   python organize_tarot_images.py ./raw_images ./organized_images")
            print("2. Upload the organized images to GitHub:")
            print("   python github_uploader.py --token YOUR_TOKEN --repo tarot-images --dir ./organized_images")


def main():
    """Entry point for the tarot image downloader CLI."""
    parser = argparse.ArgumentParser(description="Download tarot card images.")
    parser.add_argument(
        "--output-dir",
        default="./raw_images",
        help="Directory to save downloaded images",
    )
    args = parser.parse_args()

    downloader = TarotImageDownloader(args.output_dir)
    downloader.download_all_images()


if __name__ == "__main__":
    main()
