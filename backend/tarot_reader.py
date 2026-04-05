import asyncio
import json
import logging
import random
from collections.abc import AsyncGenerator
from pathlib import Path

from dotenv import load_dotenv
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from sqlalchemy.orm import Session

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler()],
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()


class TarotReader:
    def __init__(self, db: Session = None, deck_id: int = 1):
        logger.info("Initializing TarotReader...")
        self.llm = ChatOpenAI(
            temperature=0.7,
            model="gpt-4.1-mini",
            streaming=True,
            max_tokens=800,  # This will ensure responses are under 1000 words
        )
        self.image_urls = self._load_image_urls()
        self.cards = self._load_cards(db, deck_id) if db else self._load_cards_from_json()
        self.output_parser = StrOutputParser()
        logger.info("TarotReader initialized successfully")

    def _load_image_urls(self) -> dict[str, str]:
        """Load image URLs from upload_results.json."""
        try:
            logger.info("Loading image URLs from upload_results.json...")
            with Path("upload_results.json").open() as f:
                results = json.load(f)
            urls = {filename: data["image_url"] for filename, data in results.items() if data["status"] == "success"}
            logger.info(f"Loaded {len(urls)} image URLs successfully")
            return urls
        except FileNotFoundError:
            logger.warning("upload_results.json not found. Image URLs will not be available.")
            return {}

    def _load_cards_from_json(self) -> list[dict]:
        """Load all tarot cards from the JSON file."""
        logger.info("Loading tarot cards from tarot_cards.json...")
        with Path("tarot_cards.json").open() as f:
            data = json.load(f)

        all_cards = []
        # Add Major Arcana cards
        logger.info("Processing Major Arcana cards...")
        for card in data["major_arcana"]:
            filename = f"m{card['number']:02d}.jpg"
            cdn_url = self.image_urls.get(filename, None)
            if cdn_url:
                card["image_url"] = cdn_url
            # else keep the original image_url from the card data
            all_cards.append(card)

        # Add Minor Arcana cards
        logger.info("Processing Minor Arcana cards...")
        suit_prefixes = {"wands": "w", "cups": "c", "swords": "s", "pentacles": "p"}
        for suit, cards in data["minor_arcana"].items():
            prefix = suit_prefixes[suit]
            for card in cards:
                filename = f"{prefix}{card['number']:02d}.jpg"
                cdn_url = self.image_urls.get(filename, None)
                if cdn_url:
                    card["image_url"] = cdn_url
                # else keep the original image_url from the card data
                all_cards.append(card)

        logger.info(f"Loaded {len(all_cards)} tarot cards successfully")
        return all_cards

    def _load_cards(self, db: Session, deck_id: int) -> list[dict]:
        """Load cards from the database for a specific deck."""
        logger.info(f"Loading cards from database for deck {deck_id}...")
        from models import Card, Deck

        deck = db.query(Deck).filter(Deck.id == deck_id).first()
        if not deck:
            logger.warning(f"Deck {deck_id} not found, falling back to default deck")
            return self._load_cards_from_json()

        cards = db.query(Card).filter(Card.deck_id == deck_id).all()
        all_cards = []
        for card in cards:
            card_dict = {
                "name": card.name,
                "suit": card.suit,
                "rank": card.rank,
                "image_url": card.image_url,
                "description_short": card.description_short,
                "description_upright": card.description_upright,
                "description_reversed": card.description_reversed,
                "element": card.element,
                "astrology": card.astrology,
                "numerology": card.numerology,
            }
            all_cards.append(card_dict)

        logger.info(f"Loaded {len(all_cards)} cards from database for deck {deck_id}")
        return all_cards

    def shuffle_and_draw(self, num_cards: int = 3, spread=None) -> list[dict]:
        """Shuffle the deck and draw a specified number of cards."""
        logger.info(f"Shuffling deck and drawing {num_cards} cards...")

        # If a spread is provided, use its card count and positions
        positions = []
        if spread:
            positions = spread.get_positions()
            num_cards = spread.num_cards
            logger.info(f"Using spread: {spread.name} with {num_cards} cards")

        # Create a copy of the cards list to avoid modifying the original
        deck = self.cards.copy()

        # Implement Monte Carlo Probability-based shuffling
        num_shuffles = random.randint(7, 9)  # Traditional number of shuffles
        logger.info(f"Performing {num_shuffles} shuffles...")
        for i in range(num_shuffles):
            # Split the deck at a random point with normal distribution
            split_point = int(random.gauss(len(deck) / 2, len(deck) / 6))
            split_point = max(1, min(split_point, len(deck) - 1))

            # Perfect riffle shuffle with some imperfection
            left = deck[:split_point]
            right = deck[split_point:]
            shuffled = []

            while left and right:
                # Add some randomness to which pile we draw from
                if random.random() < 0.5:
                    if left:
                        shuffled.append(left.pop(0))
                else:
                    if right:
                        shuffled.append(right.pop(0))

            # Add remaining cards
            shuffled.extend(left)
            shuffled.extend(right)
            deck = shuffled
            logger.info(f"Completed shuffle {i+1}/{num_shuffles}")

        # Draw cards
        logger.info("Drawing cards...")
        drawn = []
        for i in range(min(num_cards, len(deck))):
            card = deck.pop(random.randint(0, len(deck) - 1))
            # Randomly decide if card is reversed
            is_reversed = random.random() < 0.5
            card_copy = card.copy()  # Create a copy to avoid modifying the original
            card_copy["orientation"] = "Reversed" if is_reversed else "Upright"
            if "reversed" in card and "upright" in card:
                card_copy["meaning"] = card["reversed"] if is_reversed else card["upright"]
            elif "description_reversed" in card and "description_upright" in card:
                card_copy["meaning"] = card["description_reversed"] if is_reversed else card["description_upright"]
            else:
                # Fallback if neither format is available
                card_copy["meaning"] = "Card meaning not available"

            # Add position information if spread is provided
            if spread and i < len(positions):
                position = positions[i]
                card_copy["position"] = position["name"]
                card_copy["position_description"] = position["description"]
                card_copy["position_index"] = position["index"]
                card_copy["position_x"] = position["x"]
                card_copy["position_y"] = position["y"]
            else:
                card_copy["position"] = f"Card {i + 1}"
                card_copy["position_description"] = f"Card {i + 1} in the reading"
                card_copy["position_index"] = i

            drawn.append(card_copy)
            logger.info(
                (
                    f"Drew card {i+1}: {card_copy['name']} ({card_copy['orientation']}) in position "
                    f"'{card_copy.get('position', f'Card {i+1}')}'"
                ),
            )

        logger.info(f"Successfully drew {len(drawn)} cards")
        return drawn

    async def create_reading(self, concern: str, cards: list[dict]) -> AsyncGenerator[str, None]:
        """Create a tarot reading based on the drawn cards and the user's concern."""
        logger.info("Creating tarot reading...")
        # Create the prompt template
        template = (
            "You are an experienced and empathetic tarot reader. "
            "Create a CONCISE reading (maximum 1000 words) based on the following:\n\n"
            "User's concern: {concern}\n\n"
            "Cards drawn (in order):\n{cards}\n\n"
            "Please provide a focused and insightful reading that:\n"
            "1. Addresses the user's concern directly and concisely\n"
            "2. Briefly interprets each card in the context of their concern\n"
            "3. Considers card reversals in the interpretation\n"
            "4. Creates a coherent but succinct narrative\n"
            "5. Offers 1-2 practical action items\n"
            "6. Maintains a compassionate tone while being brief\n\n"
            "Keep the total response under 1000 words.\n\n"
            "Tarot Reading:"
        )

        # Format the cards information
        logger.info("Formatting cards information...")
        cards_text = ""
        for i, card in enumerate(cards, 1):
            orientation = card["orientation"]
            meaning = card["meaning"]
            cards_text += f"{i}. {card['name']} ({orientation})\n"
            cards_text += f"   Meaning: {meaning}\n"
            logger.debug(f"Formatted card {i}: {card['name']}")

        # Create and run the chain
        logger.info("Generating reading with language model...")
        prompt = ChatPromptTemplate.from_template(template)
        chain = prompt | self.llm | self.output_parser

        # Generate the reading in streaming mode
        async for chunk in chain.astream({"concern": concern, "cards": cards_text}):
            yield chunk
            await asyncio.sleep(0)  # Allow other tasks to run

        logger.info("Reading generation completed")


def main():
    reader = TarotReader()

    print("Welcome to the ArcanaAI!")
    print("Please share your concern or question:")
    concern = input("> ")

    print("\nShuffling the deck...")
    drawn_cards = reader.shuffle_and_draw()

    print("\nYour cards are:")
    for card in drawn_cards:
        orientation = "Reversed" if card["orientation"] == "Reversed" else "Upright"
        print(f"- {card['name']} ({orientation})")
        if card["image_url"]:
            print(f"  Image: {card['image_url']}")

    print("\nGenerating your reading...")

    async def print_reading():
        async for chunk in reader.create_reading(concern, drawn_cards):
            print(chunk, end="", flush=True)

    asyncio.run(print_reading())


if __name__ == "__main__":
    main()
