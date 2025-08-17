import argparse
import json
import os
import textwrap

from PIL import Image, ImageDraw, ImageFont
from tqdm import tqdm


class PlaceholderGenerator:
    """Generates placeholder tarot card images for development and testing.

    Attributes:
        output_dir (str): Directory to save generated images.
        card_data (dict): Tarot card metadata loaded from JSON.
        card_size (tuple): Image size (width, height).
        background_colors (dict): Background color mapping for arcana/suits.
    """
    def __init__(self, output_dir: str = "./placeholder_images"):
        """Initializes the placeholder generator and prepares the output directory.

        Args:
            output_dir (str): Directory to save generated images.
        """
        self.output_dir = output_dir
        self.card_data = self._load_card_data()
        self.card_size = (500, 800)  # Standard tarot card size ratio
        self.background_colors = {
            "major": (50, 50, 150),  # Blue for major arcana
            "wands": (200, 100, 50),  # Orange-red for wands
            "cups": (50, 150, 200),  # Blue for cups
            "swords": (200, 200, 200),  # Silver for swords
            "pentacles": (150, 200, 50),  # Green for pentacles
        }

        # Create output directory if it doesn't exist
        os.makedirs(output_dir, exist_ok=True)

    def _load_card_data(self) -> dict:
        """Load tarot card data from JSON file.

        Returns:
            dict: Tarot card metadata.
        """
        with open("tarot_cards.json") as f:
            return json.load(f)

    def _create_directory_structure(self):
        """Create the directory structure for organized images."""
        # Create major arcana directory
        os.makedirs(os.path.join(self.output_dir, "major"), exist_ok=True)

        # Create minor arcana directories
        for suit in ["wands", "cups", "swords", "pentacles"]:
            os.makedirs(os.path.join(self.output_dir, "minor", suit), exist_ok=True)

    def _create_card_image(self, card: dict, arcana_type: str, suit: str = None) -> Image:
        """Create a placeholder image for a card.

        Args:
            card (dict): Card metadata.
            arcana_type (str): 'major_arcana' or 'minor_arcana'.
            suit (str, optional): Suit for minor arcana cards.

        Returns:
            Image: PIL Image object representing the card.
        """
        # Create new image with white background
        img = Image.new("RGB", self.card_size, "white")
        draw = ImageDraw.Draw(img)

        # Get background color
        bg_color = self.background_colors["major"] if arcana_type == "major_arcana" else self.background_colors[suit]

        # Draw card border (20px width)
        border = 20
        draw.rectangle(
            [0, 0, self.card_size[0] - 1, self.card_size[1] - 1],
            outline=bg_color,
            width=border,
        )

        try:
            # Try to load a font, fall back to default if not available
            font_large = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 48)
            font_small = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 32)
        except Exception:
            font_large = ImageFont.load_default()
            font_small = ImageFont.load_default()

        # Draw card name
        name = card["name"]
        wrapped_text = textwrap.fill(name, width=15)
        text_bbox = draw.textbbox((0, 0), wrapped_text, font=font_large)
        text_width = text_bbox[2] - text_bbox[0]
        text_x = (self.card_size[0] - text_width) // 2
        text_y = 50
        draw.text(
            (text_x, text_y),
            wrapped_text,
            fill=bg_color,
            font=font_large,
            align="center",
        )

        # Draw card number
        number_text = f"Card {card['number']}"
        text_bbox = draw.textbbox((0, 0), number_text, font=font_small)
        text_width = text_bbox[2] - text_bbox[0]
        text_x = (self.card_size[0] - text_width) // 2
        draw.text(
            (text_x, self.card_size[1] - 100),
            number_text,
            fill=bg_color,
            font=font_small,
        )

        # Draw arcana type and suit
        type_text = "Major Arcana" if arcana_type == "major_arcana" else f"Minor Arcana - {suit.capitalize()}"
        text_bbox = draw.textbbox((0, 0), type_text, font=font_small)
        text_width = text_bbox[2] - text_bbox[0]
        text_x = (self.card_size[0] - text_width) // 2
        draw.text((text_x, self.card_size[1] - 150), type_text, fill=bg_color, font=font_small)

        return img

    def generate_all_cards(self):
        """Generate placeholder images for all cards and save them to the output directory."""
        print("Starting placeholder generation...")
        print(f"Images will be saved to: {self.output_dir}")

        # Create directory structure
        self._create_directory_structure()

        # Initialize progress bar
        total_cards = len(self.card_data["major_arcana"])
        for suit in self.card_data["minor_arcana"]:
            total_cards += len(self.card_data["minor_arcana"][suit])

        progress_bar = tqdm(total=total_cards, desc="Generating images", unit="card")

        # Process major arcana
        for card in self.card_data["major_arcana"]:
            output_path = os.path.join(self.output_dir, "major", f"{card['number']}.jpg")

            # Generate and save image
            img = self._create_card_image(card, "major_arcana")
            img.save(output_path, "JPEG", quality=90)

            progress_bar.update(1)

        # Process minor arcana
        for suit, cards in self.card_data["minor_arcana"].items():
            for card in cards:
                output_path = os.path.join(self.output_dir, "minor", suit, f"{card['number']}.jpg")

                # Generate and save image
                img = self._create_card_image(card, "minor_arcana", suit)
                img.save(output_path, "JPEG", quality=90)

                progress_bar.update(1)

        progress_bar.close()

        print("\nGeneration Summary:")
        print(f"Total cards: {total_cards}")
        print("\nAll placeholder images generated successfully!")
        print("\nNext steps:")
        print("1. Use these images for development and testing")
        print("2. Replace with actual card images before production")
        print("\nNote: These are placeholder images for development only.")
        print("For production use, please:")
        print("1. Purchase a license for a digital tarot deck")
        print("2. Commission an artist to create custom artwork")
        print("3. Use a public domain or Creative Commons licensed deck")
        print("4. Partner with an existing tarot deck creator")


def main():
    """Entry point for the placeholder image generator CLI."""
    parser = argparse.ArgumentParser(description="Generate placeholder tarot card images.")
    parser.add_argument(
        "--output-dir",
        default="./placeholder_images",
        help="Directory to save generated images",
    )
    args = parser.parse_args()

    generator = PlaceholderGenerator(args.output_dir)
    generator.generate_all_cards()


if __name__ == "__main__":
    main()
