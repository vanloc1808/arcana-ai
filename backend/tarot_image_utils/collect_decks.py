import os
import json
import requests
from pathlib import Path
from typing import Dict, List, Optional
from dotenv import load_dotenv
import time
import logging
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

IMGBB_API_KEY = os.getenv('IMGBB_API_KEY')
IMGBB_UPLOAD_URL = 'https://api.imgbb.com/1/upload'

# Configure requests session with retry strategy
session = requests.Session()
retry_strategy = Retry(
    total=3,  # number of retries
    backoff_factor=1,  # wait 1, 2, 4 seconds between retries
    status_forcelist=[500, 502, 503, 504]  # HTTP status codes to retry on
)
adapter = HTTPAdapter(max_retries=retry_strategy)
session.mount("https://", adapter)
session.mount("http://", adapter)

# Load card data from tarot-images.json
with open(Path(__file__).parent.parent.parent / "images/kaggle_tarot_images/tarot-images.json") as f:
    CARD_DATA = json.load(f)["cards"]

# Local image directory
IMAGE_DIR = Path(__file__).parent.parent.parent / "images/kaggle_tarot_images/cards"

def get_local_image_path(card: dict) -> Path:
    img_file = card.get("img")
    if img_file:
        return IMAGE_DIR / img_file
    else:
        logger.error(f"No img field for card: {card.get('name')}")
        return None

def upload_to_imgbb(image_path: Path, max_retries: int = 3) -> Optional[str]:
    for attempt in range(max_retries):
        try:
            with open(image_path, 'rb') as image_file:
                response = session.post(
                    IMGBB_UPLOAD_URL,
                    data={'key': IMGBB_API_KEY},
                    files={'image': image_file},
                    timeout=30  # 30 seconds timeout
                )
                response.raise_for_status()
                return response.json()['data']['url']
        except requests.exceptions.RequestException as e:
            if attempt < max_retries - 1:
                wait_time = (attempt + 1) * 2  # exponential backoff
                logger.warning(f"Attempt {attempt + 1} failed for {image_path.name}. Retrying in {wait_time} seconds... Error: {str(e)}")
                time.sleep(wait_time)
            else:
                logger.error(f"All {max_retries} attempts failed for {image_path.name}. Error: {str(e)}")
                return None
    return None

def collect_deck_images(deck_id: str, output_dir: Path) -> List[Dict]:
    deck_dir = output_dir / deck_id
    deck_dir.mkdir(parents=True, exist_ok=True)
    cards = []
    failed_cards = []

    for card in CARD_DATA:
        local_img = get_local_image_path(card)
        if not local_img or not local_img.exists():
            logger.error(f"Local image not found: {local_img}")
            failed_cards.append(card['name'])
            continue

        # Use img filename for output
        image_path = deck_dir / local_img.name
        if not image_path.exists():
            try:
                with open(local_img, "rb") as src, open(image_path, "wb") as dst:
                    dst.write(src.read())
            except Exception as e:
                logger.error(f"Error copying image {local_img} to {image_path}: {e}")
                failed_cards.append(card['name'])
                continue

        imgbb_url = upload_to_imgbb(image_path)
        if imgbb_url:
            cards.append({
                'name': card['name'],
                'image_url': imgbb_url,
                'deck': deck_id
            })
            logger.info(f"Processed {card['name']} for {deck_id}")
        else:
            logger.error(f"Failed to upload {card['name']} for {deck_id}")
            failed_cards.append(card['name'])

        time.sleep(1)  # Rate limiting

    if failed_cards:
        logger.warning(f"Failed to process {len(failed_cards)} cards for {deck_id}: {', '.join(failed_cards)}")

    return cards

def main():
    if not IMGBB_API_KEY:
        logger.error("IMGBB_API_KEY not found in environment variables")
        return

    decks = {
        'rider_waite': {
            'name': 'Rider-Waite-Smith',
            'description': 'The classic and most widely used Tarot deck, created in 1909 by A.E. Waite and Pamela Colman Smith.'
        },
        'thoth': {
            'name': 'Thoth',
            'description': 'Created by Aleister Crowley and Lady Frieda Harris, this deck incorporates deep esoteric symbolism and Egyptian mythology.'
        },
        'marseille': {
            'name': 'Marseille',
            'description': 'One of the oldest Tarot decks, originating in France, known for its simple yet powerful imagery.'
        },
        'golden_dawn': {
            'name': 'Golden Dawn',
            'description': 'Based on the teachings of the Hermetic Order of the Golden Dawn, featuring rich esoteric symbolism.'
        },
        'visconti_sforza': {
            'name': 'Visconti-Sforza',
            'description': 'One of the oldest surviving Tarot decks, created in 15th century Italy for the Visconti and Sforza families.'
        },
        'morgan_greer': {
            'name': 'Morgan-Greer',
            'description': 'A modern deck created in 1979, known for its vibrant colors and close-up imagery.'
        }
    }

    results = {}
    output_dir = Path(__file__).parent / 'decks'

    for deck_id, deck_info in decks.items():
        logger.info(f"Processing {deck_info['name']} deck...")
        cards = collect_deck_images(deck_id, output_dir)
        results[deck_id] = {
            'name': deck_info['name'],
            'description': deck_info['description'],
            'cards': cards
        }
        logger.info(f"Completed processing {deck_info['name']} deck")

    output_path = Path(__file__).parent / 'deck_collection_results.json'
    with open(output_path, 'w') as f:
        json.dump(results, f, indent=2)
    logger.info(f"All decks processed. Results saved to {output_path}")

if __name__ == '__main__':
    main()
