#!/usr/bin/env python
import argparse
import asyncio
import json
import sys
from pathlib import Path

from sqlalchemy import create_engine, delete, select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

# Add the project root to the Python path
sys.path.append(str(Path(__file__).resolve().parent.parent))

from backend.config import settings  # noqa: E402
from backend.models import Base, Card  # noqa: E402

DATABASE_URL = settings.SQLALCHEMY_DATABASE_URL

# Load image URLs from JSON file
UPLOAD_RESULTS_PATH = Path(__file__).parent / "upload_results.json"
try:
    with UPLOAD_RESULTS_PATH.open() as f:
        uploaded_images_data = json.load(f)
except FileNotFoundError:
    print(f"Error: {UPLOAD_RESULTS_PATH} not found. Please ensure the file exists.")
    uploaded_images_data = {}
except json.JSONDecodeError:
    print(f"Error: Could not decode JSON from {UPLOAD_RESULTS_PATH}.")
    uploaded_images_data = {}


def get_image_url(original_url: str) -> str:
    """Gets the new image URL from the uploaded_images_data, falling back to original if not found."""
    filename = Path(original_url).name
    # The JSON keys might have slightly different naming (e.g. m00.jpg vs 00_fool.jpg)
    # We need a robust way to map them. Let's try to match based on the numeric part if possible
    # or a direct match if the naming scheme in upload_results.json is consistent.

    # Attempt direct filename match first (e.g., "00_fool.jpg" in JSON)
    if filename in uploaded_images_data and uploaded_images_data[filename].get("status") == "success":
        return uploaded_images_data[filename]["image_url"]

    # Attempt to match based on simplified names (e.g. m00.jpg)
    # This requires knowing the naming convention in upload_results.json
    # Example: if original is "/cards/major_arcana/00_fool.jpg" -> "m00.jpg"
    #          if original is "/cards/wands/wands01.jpg" -> "w01.jpg"
    simplified_filename = None
    parts = original_url.split("/")
    if len(parts) > 2:
        suit_dir = parts[-2]
        original_file_part = parts[-1]

        if suit_dir == "major_arcana":
            num = original_file_part.split("_")[0]
            simplified_filename = f"m{num}.jpg"
        elif suit_dir == "wands":
            simplified_filename = f"w{original_file_part.replace('wands', '')}"
        elif suit_dir == "cups":
            simplified_filename = f"c{original_file_part.replace('cups', '')}"
        elif suit_dir == "swords":
            simplified_filename = f"s{original_file_part.replace('swords', '')}"
        elif suit_dir == "pentacles":
            simplified_filename = f"p{original_file_part.replace('pentacles', '')}"

    if (
        simplified_filename
        and simplified_filename in uploaded_images_data
        and uploaded_images_data[simplified_filename].get("status") == "success"
    ):
        return uploaded_images_data[simplified_filename]["image_url"]

    print(
        f"Warning: Could not find uploaded image for {original_url} "
        f"(tried {filename} and {simplified_filename}). Using original URL."
    )
    return original_url


# Card data (78 cards)
tarot_cards_data = [
    # Major Arcana
    {
        "name": "The Fool",
        "suit": "Major Arcana",
        "rank": "0",
        "description_short": "Beginnings, innocence, spontaneity, a free spirit",
        "description_upright": "New beginnings, faith in the future, being spontaneous, पोटेंशियालिटी.",
        "description_reversed": "Holding back, recklessness, risk-taking, naivety.",
        "image_url": get_image_url("/cards/major_arcana/00_fool.jpg"),
    },
    {
        "name": "The Magician",
        "suit": "Major Arcana",
        "rank": "I",
        "description_short": "Manifestation, resourcefulness, power, inspired action",
        "description_upright": "Manifestation, willpower, skill, resourcefulness, action.",
        "description_reversed": "Manipulation, poor planning, latent talents, deception.",
        "image_url": get_image_url("/cards/major_arcana/01_magician.jpg"),
    },
    {
        "name": "The High Priestess",
        "suit": "Major Arcana",
        "rank": "II",
        "description_short": "Intuition, sacred knowledge, divine feminine, the subconscious mind",
        "description_upright": "Intuition, subconscious, mystery, spirituality, higher knowledge.",
        "description_reversed": "Secrets, disconnected from intuition, hidden agendas, repressed feelings.",
        "image_url": get_image_url("/cards/major_arcana/02_high_priestess.jpg"),
    },
    {
        "name": "The Empress",
        "suit": "Major Arcana",
        "rank": "III",
        "description_short": "Femininity, beauty, nature, nurturing, abundance",
        "description_upright": "Nurturing, fertility, abundance, beauty, nature, motherhood.",
        "description_reversed": "Creative block, dependence on others, smothering, emptiness.",
        "image_url": get_image_url("/cards/major_arcana/03_empress.jpg"),
    },
    {
        "name": "The Emperor",
        "suit": "Major Arcana",
        "rank": "IV",
        "description_short": "Authority, establishment, structure, a father figure",
        "description_upright": "Authority, structure, control, father figure, stability.",
        "description_reversed": "Domination, excessive control, rigidity, inflexibility, misuse of power.",
        "image_url": get_image_url("/cards/major_arcana/04_emperor.jpg"),
    },
    {
        "name": "The Hierophant",
        "suit": "Major Arcana",
        "rank": "V",
        "description_short": "Spiritual wisdom, religious beliefs, conformity, tradition, institutions",
        "description_upright": "Tradition, convention, morality, ethics, spiritual guidance.",
        "description_reversed": "Rebellion, unconventionality, new approaches, personal beliefs.",
        "image_url": get_image_url("/cards/major_arcana/05_hierophant.jpg"),
    },
    {
        "name": "The Lovers",
        "suit": "Major Arcana",
        "rank": "VI",
        "description_short": "Love, harmony, relationships, values alignment, choices",
        "description_upright": "Relationships, love, harmony, alignment, choices.",
        "description_reversed": "Disharmony, imbalance, misalignment of values, conflict.",
        "image_url": get_image_url("/cards/major_arcana/06_lovers.jpg"),
    },
    {
        "name": "The Chariot",
        "suit": "Major Arcana",
        "rank": "VII",
        "description_short": "Control, willpower, victory, assertion, determination",
        "description_upright": "Willpower, determination, victory, control, self-assertion.",
        "description_reversed": "Lack of control, lack of direction, aggression, opposition.",
        "image_url": get_image_url("/cards/major_arcana/07_chariot.jpg"),
    },
    {
        "name": "Strength",
        "suit": "Major Arcana",
        "rank": "VIII",
        "description_short": "Strength, courage, persuasion, influence, compassion",
        "description_upright": "Inner strength, courage, patience, compassion, control.",
        "description_reversed": "Weakness, self-doubt, lack of self-discipline, raw emotion.",
        "image_url": get_image_url("/cards/major_arcana/08_strength.jpg"),
    },
    {
        "name": "The Hermit",
        "suit": "Major Arcana",
        "rank": "IX",
        "description_short": "Soul-searching, introspection, inner guidance, solitude",
        "description_upright": "Introspection, soul-searching, inner guidance, solitude, wisdom.",
        "description_reversed": "Isolation, loneliness, withdrawal, paranoia.",
        "image_url": get_image_url("/cards/major_arcana/09_hermit.jpg"),
    },
    {
        "name": "Wheel of Fortune",
        "suit": "Major Arcana",
        "rank": "X",
        "description_short": "Good luck, karma, life cycles, destiny, a turning point",
        "description_upright": "Cycles, fate, destiny, turning points, luck.",
        "description_reversed": "Bad luck, resisting change, breaking cycles, negative forces.",
        "image_url": get_image_url("/cards/major_arcana/10_wheel_of_fortune.jpg"),
    },
    {
        "name": "Justice",
        "suit": "Major Arcana",
        "rank": "XI",
        "description_short": "Justice, fairness, truth, cause and effect, law",
        "description_upright": "Fairness, truth, law, cause and effect, clarity.",
        "description_reversed": "Unfairness, lack of accountability, dishonesty, injustice.",
        "image_url": get_image_url("/cards/major_arcana/11_justice.jpg"),
    },
    {
        "name": "The Hanged Man",
        "suit": "Major Arcana",
        "rank": "XII",
        "description_short": "Pause, surrender, letting go, new perspectives",
        "description_upright": "Suspension, new perspective, sacrifice, letting go.",
        "description_reversed": "Stalling, indecision, resistance, unnecessary sacrifice.",
        "image_url": get_image_url("/cards/major_arcana/12_hanged_man.jpg"),
    },
    {
        "name": "Death",
        "suit": "Major Arcana",
        "rank": "XIII",
        "description_short": "Endings, change, transformation, transition",
        "description_upright": "Transformation, endings, change, new beginnings.",
        "description_reversed": "Resistance to change, fear of endings, stagnation.",
        "image_url": get_image_url("/cards/major_arcana/13_death.jpg"),
    },
    {
        "name": "Temperance",
        "suit": "Major Arcana",
        "rank": "XIV",
        "description_short": "Balance, moderation, patience, purpose",
        "description_upright": "Balance, moderation, patience, purpose, harmony.",
        "description_reversed": "Imbalance, excess, extremes, lack of patience.",
        "image_url": get_image_url("/cards/major_arcana/14_temperance.jpg"),
    },
    {
        "name": "The Devil",
        "suit": "Major Arcana",
        "rank": "XV",
        "description_short": "Shadow self, attachment, addiction, restriction, sexuality",
        "description_upright": "Bondage, addiction, materialism, temptation, shadow self.",
        "description_reversed": "Breaking free, detachment, releasing limiting beliefs, awareness.",
        "image_url": get_image_url("/cards/major_arcana/15_devil.jpg"),
    },
    {
        "name": "The Tower",
        "suit": "Major Arcana",
        "rank": "XVI",
        "description_short": "Sudden upheaval, broken pride, disaster, revelation",
        "description_upright": "Sudden change, upheaval, chaos, revelation, awakening.",
        "description_reversed": "Fear of change, avoiding disaster, delaying the inevitable.",
        "image_url": get_image_url("/cards/major_arcana/16_tower.jpg"),
    },
    {
        "name": "The Star",
        "suit": "Major Arcana",
        "rank": "XVII",
        "description_short": "Hope, faith, purpose, renewal, spirituality",
        "description_upright": "Hope, inspiration, serenity, spirituality, renewal.",
        "description_reversed": "Lack of faith, despair, discouragement, disconnection.",
        "image_url": get_image_url("/cards/major_arcana/17_star.jpg"),
    },
    {
        "name": "The Moon",
        "suit": "Major Arcana",
        "rank": "XVIII",
        "description_short": "Illusion, fear, anxiety, subconscious, intuition",
        "description_upright": "Illusion, fear, anxiety, intuition, subconscious.",
        "description_reversed": "Release of fear, repressed emotion, inner confusion, clarity.",
        "image_url": get_image_url("/cards/major_arcana/18_moon.jpg"),
    },
    {
        "name": "The Sun",
        "suit": "Major Arcana",
        "rank": "XIX",
        "description_short": "Positivity, fun, warmth, success, vitality",
        "description_upright": "Joy, success, vitality, positivity, enlightenment.",
        "description_reversed": "Inner child issues, sadness, lack of success, pessimism.",
        "image_url": get_image_url("/cards/major_arcana/19_sun.jpg"),
    },
    {
        "name": "Judgement",
        "suit": "Major Arcana",
        "rank": "XX",
        "description_short": "Judgement, rebirth, inner calling, absolution",
        "description_upright": "Rebirth, awakening, inner calling, absolution, reckoning.",
        "description_reversed": "Self-doubt, ignoring the call, fear of judgment, lack of self-awareness.",
        "image_url": get_image_url("/cards/major_arcana/20_judgement.jpg"),
    },
    {
        "name": "The World",
        "suit": "Major Arcana",
        "rank": "XXI",
        "description_short": "Completion, integration, accomplishment, travel",
        "description_upright": "Completion, integration, fulfillment, travel, wholeness.",
        "description_reversed": "Lack of completion, lack of closure, incompletion, short-cuts.",
        "image_url": get_image_url("/cards/major_arcana/21_world.jpg"),
    },
    # Suit of Wands
    {
        "name": "Ace of Wands",
        "suit": "Wands",
        "rank": "Ace",
        "description_short": "Inspiration, new opportunities, growth, potential",
        "description_upright": "New beginnings, inspiration, potential, creative spark.",
        "description_reversed": "Lack of motivation, delays, creative blocks, missed opportunity.",
        "image_url": get_image_url("/cards/wands/wands01.jpg"),
    },
    {
        "name": "Two of Wands",
        "suit": "Wands",
        "rank": "Two",
        "description_short": "Future planning, progress, decisions, discovery",
        "description_upright": "Planning, future, progress, decisions, discovery.",
        "description_reversed": "Fear of unknown, lack of planning, indecision, delays.",
        "image_url": get_image_url("/cards/wands/wands02.jpg"),
    },
    {
        "name": "Three of Wands",
        "suit": "Wands",
        "rank": "Three",
        "description_short": "Preparation, foresight, enterprise, expansion",
        "description_upright": "Expansion, foresight, progress, looking ahead.",
        "description_reversed": "Delays, frustration, obstacles to long-term goals.",
        "image_url": get_image_url("/cards/wands/wands03.jpg"),
    },
    {
        "name": "Four of Wands",
        "suit": "Wands",
        "rank": "Four",
        "description_short": "Celebration, joy, harmony, relaxation, homecoming",
        "description_upright": "Celebration, harmony, homecoming, community, joy.",
        "description_reversed": "Lack of support, instability, transience, conflict in home.",
        "image_url": get_image_url("/cards/wands/wands04.jpg"),
    },
    {
        "name": "Five of Wands",
        "suit": "Wands",
        "rank": "Five",
        "description_short": "Conflict, disagreements, competition, tension, diversity",
        "description_upright": "Competition, conflict, disagreements, tension, struggle.",
        "description_reversed": "Avoiding conflict, respect for differences, finding common ground.",
        "image_url": get_image_url("/cards/wands/wands05.jpg"),
    },
    {
        "name": "Six of Wands",
        "suit": "Wands",
        "rank": "Six",
        "description_short": "Public recognition, victory, progress, self-confidence",
        "description_upright": "Victory, success, public recognition, self-confidence.",
        "description_reversed": "Egotism, lack of recognition, fall from grace, punishment.",
        "image_url": get_image_url("/cards/wands/wands06.jpg"),
    },
    {
        "name": "Seven of Wands",
        "suit": "Wands",
        "rank": "Seven",
        "description_short": "Challenge, competition, perseverance, protective",
        "description_upright": "Challenge, perseverance, defense, maintaining control.",
        "description_reversed": "Giving up, overwhelmed, exhaustion, compromise.",
        "image_url": get_image_url("/cards/wands/wands07.jpg"),
    },
    {
        "name": "Eight of Wands",
        "suit": "Wands",
        "rank": "Eight",
        "description_short": "Speed, action, air travel, movement, quick decisions",
        "description_upright": "Movement, speed, action, progress, quick decisions.",
        "description_reversed": "Delays, frustration, resisting change, slowness.",
        "image_url": get_image_url("/cards/wands/wands08.jpg"),
    },
    {
        "name": "Nine of Wands",
        "suit": "Wands",
        "rank": "Nine",
        "description_short": "Resilience, courage, persistence, test of faith, boundaries",
        "description_upright": "Resilience, courage, persistence, last stand, boundaries.",
        "description_reversed": "Exhaustion, fatigue, giving up, paranoia, defensive.",
        "image_url": get_image_url("/cards/wands/wands09.jpg"),
    },
    {
        "name": "Ten of Wands",
        "suit": "Wands",
        "rank": "Ten",
        "description_short": "Burden, extra responsibility, hard work, stress, achievement",
        "description_upright": "Burden, responsibility, hard work, stress, completion.",
        "description_reversed": "Delegating, letting go of burdens, release, collapse.",
        "image_url": get_image_url("/cards/wands/wands10.jpg"),
    },
    {
        "name": "Page of Wands",
        "suit": "Wands",
        "rank": "Page",
        "description_short": "Inspiration, ideas, discovery, free spirit, enthusiasm",
        "description_upright": "Enthusiasm, exploration, discovery, free spirit, new ideas.",
        "description_reversed": "Lack of direction, procrastination, creating conflict, undeveloped ideas.",
        "image_url": get_image_url("/cards/wands/wands11.jpg"),
    },
    {
        "name": "Knight of Wands",
        "suit": "Wands",
        "rank": "Knight",
        "description_short": "Energy, passion, inspired action, adventure, impulsiveness",
        "description_upright": "Energy, passion, adventure, impulsiveness, action.",
        "description_reversed": "Haste, scattered energy, frustration, recklessness.",
        "image_url": get_image_url("/cards/wands/wands12.jpg"),
    },
    {
        "name": "Queen of Wands",
        "suit": "Wands",
        "rank": "Queen",
        "description_short": "Courage, confidence, independence, social butterfly, determination",
        "description_upright": "Courage, confidence, independence, warmth, determination.",
        "description_reversed": "Selfishness, jealousy, demanding, insecurity.",
        "image_url": get_image_url("/cards/wands/wands13.jpg"),
    },
    {
        "name": "King of Wands",
        "suit": "Wands",
        "rank": "King",
        "description_short": "Natural-born leader, vision, entrepreneur, honour",
        "description_upright": "Leadership, vision, charisma, inspiration, bold action.",
        "description_reversed": "Impulsiveness, haste, ruthless, high expectations.",
        "image_url": get_image_url("/cards/wands/wands14.jpg"),
    },
    # Suit of Cups
    {
        "name": "Ace of Cups",
        "suit": "Cups",
        "rank": "Ace",
        "description_short": "Love, new relationships, compassion, creativity",
        "description_upright": "New love, emotional beginnings, creativity, compassion.",
        "description_reversed": "Blocked emotions, repressed feelings, emptiness, creative block.",
        "image_url": get_image_url("/cards/cups/cups01.jpg"),
    },
    {
        "name": "Two of Cups",
        "suit": "Cups",
        "rank": "Two",
        "description_short": "Unified love, partnership, mutual attraction",
        "description_upright": "Partnership, mutual attraction, union, shared values.",
        "description_reversed": "Break-up, imbalance in relationship, disharmony, distrust.",
        "image_url": get_image_url("/cards/cups/cups02.jpg"),
    },
    {
        "name": "Three of Cups",
        "suit": "Cups",
        "rank": "Three",
        "description_short": "Celebration, friendship, creativity, collaborations",
        "description_upright": "Celebration, friendship, community, creative collaboration.",
        "description_reversed": "Gossip, scandal, isolation, over-indulgence.",
        "image_url": get_image_url("/cards/cups/cups03.jpg"),
    },
    {
        "name": "Four of Cups",
        "suit": "Cups",
        "rank": "Four",
        "description_short": "Meditation, contemplation, apathy, re-evaluation",
        "description_upright": "Contemplation, apathy, missed opportunities, re-evaluation.",
        "description_reversed": "Sudden awareness, choosing happiness, motivation, seizing opportunities.",
        "image_url": get_image_url("/cards/cups/cups04.jpg"),
    },
    {
        "name": "Five of Cups",
        "suit": "Cups",
        "rank": "Five",
        "description_short": "Regret, failure, disappointment, pessimism",
        "description_upright": "Loss, grief, regret, disappointment, sadness.",
        "description_reversed": "Moving on, acceptance, forgiveness, finding peace.",
        "image_url": get_image_url("/cards/cups/cups05.jpg"),
    },
    {
        "name": "Six of Cups",
        "suit": "Cups",
        "rank": "Six",
        "description_short": "Revisiting the past, childhood memories, innocence, joy",
        "description_upright": "Nostalgia, childhood memories, innocence, joy, reunion.",
        "description_reversed": "Stuck in the past, naivety, unrealistic expectations.",
        "image_url": get_image_url("/cards/cups/cups06.jpg"),
    },
    {
        "name": "Seven of Cups",
        "suit": "Cups",
        "rank": "Seven",
        "description_short": "Opportunities, choices, wishful thinking, illusion",
        "description_upright": "Choices, illusions, wishful thinking, opportunities.",
        "description_reversed": "Alignment, personal values, overwhelmed by choices, clarity.",
        "image_url": get_image_url("/cards/cups/cups07.jpg"),
    },
    {
        "name": "Eight of Cups",
        "suit": "Cups",
        "rank": "Eight",
        "description_short": "Disappointment, abandonment, withdrawal, escapism",
        "description_upright": "Walking away, disappointment, abandonment, seeking more.",
        "description_reversed": "Fear of moving on, stagnation, hopelessness, escapism.",
        "image_url": get_image_url("/cards/cups/cups08.jpg"),
    },
    {
        "name": "Nine of Cups",
        "suit": "Cups",
        "rank": "Nine",
        "description_short": "Contentment, satisfaction, gratitude, wish come true",
        "description_upright": "Wishes fulfilled, contentment, satisfaction, gratitude.",
        "description_reversed": "Dissatisfaction, materialism, greed, unrealistic expectations.",
        "image_url": get_image_url("/cards/cups/cups09.jpg"),
    },
    {
        "name": "Ten of Cups",
        "suit": "Cups",
        "rank": "Ten",
        "description_short": "Divine love, blissful relationships, harmony, alignment",
        "description_upright": "Harmony, marriage, happiness, family, alignment.",
        "description_reversed": "Broken family, disharmony, unfulfilled relationships, neglect.",
        "image_url": get_image_url("/cards/cups/cups10.jpg"),
    },
    {
        "name": "Page of Cups",
        "suit": "Cups",
        "rank": "Page",
        "description_short": "Creative opportunities, intuitive messages, curiosity, possibility",
        "description_upright": "Creative opportunities, intuition, messages, curiosity.",
        "description_reversed": "Emotional immaturity, creative blocks, insecurity, doubt.",
        "image_url": get_image_url("/cards/cups/cups11.jpg"),
    },
    {
        "name": "Knight of Cups",
        "suit": "Cups",
        "rank": "Knight",
        "description_short": "Creativity, romance, charm, imagination, beauty",
        "description_upright": "Romance, charm, imagination, following the heart.",
        "description_reversed": "Unrealistic, moody, jealousy, disappointment.",
        "image_url": get_image_url("/cards/cups/cups12.jpg"),
    },
    {
        "name": "Queen of Cups",
        "suit": "Cups",
        "rank": "Queen",
        "description_short": "Compassionate, caring, emotionally stable, intuitive, in flow",
        "description_upright": "Compassion, intuition, emotional security, calm, caring.",
        "description_reversed": "Emotional insecurity, co-dependency, martyrdom, moodiness.",
        "image_url": get_image_url("/cards/cups/cups13.jpg"),
    },
    {
        "name": "King of Cups",
        "suit": "Cups",
        "rank": "King",
        "description_short": "Emotionally balanced, compassionate, diplomatic",
        "description_upright": "Emotional balance, compassion, diplomacy, control over emotions.",
        "description_reversed": "Emotional manipulation, moodiness, volatility, selfishness.",
        "image_url": get_image_url("/cards/cups/cups14.jpg"),
    },
    # Suit of Swords
    {
        "name": "Ace of Swords",
        "suit": "Swords",
        "rank": "Ace",
        "description_short": "Breakthroughs, new ideas, mental clarity, success",
        "description_upright": "Breakthroughs, mental clarity, new ideas, truth, success.",
        "description_reversed": "Confusion, clouded judgment, lack of clarity, intellectual blocks.",
        "image_url": get_image_url("/cards/swords/swords01.jpg"),
    },
    {
        "name": "Two of Swords",
        "suit": "Swords",
        "rank": "Two",
        "description_short": "Difficult decisions, weighing up options, an impasse, avoidance",
        "description_upright": "Indecision, choices, stalemate, blocked emotions.",
        "description_reversed": "Indecision, confusion, information overload, making a choice.",
        "image_url": get_image_url("/cards/swords/swords02.jpg"),
    },
    {
        "name": "Three of Swords",
        "suit": "Swords",
        "rank": "Three",
        "description_short": "Heartbreak, emotional pain, sorrow, grief, hurt",
        "description_upright": "Heartbreak, sorrow, grief, emotional pain, separation.",
        "description_reversed": "Releasing pain, optimism, forgiveness, recovery.",
        "image_url": get_image_url("/cards/swords/swords03.jpg"),
    },
    {
        "name": "Four of Swords",
        "suit": "Swords",
        "rank": "Four",
        "description_short": "Rest, relaxation, meditation, contemplation, recuperation",
        "description_upright": "Rest, recuperation, contemplation, meditation, peace.",
        "description_reversed": "Exhaustion, burnout, stagnation, restlessness.",
        "image_url": get_image_url("/cards/swords/swords04.jpg"),
    },
    {
        "name": "Five of Swords",
        "suit": "Swords",
        "rank": "Five",
        "description_short": "Conflict, disagreements, competition, defeat, winning at all costs",
        "description_upright": "Conflict, defeat, winning at all costs, humiliation.",
        "description_reversed": "Reconciliation, making amends, past resentment, forgiveness.",
        "image_url": get_image_url("/cards/swords/swords05.jpg"),
    },
    {
        "name": "Six of Swords",
        "suit": "Swords",
        "rank": "Six",
        "description_short": "Transition, change, rite of passage, releasing baggage",
        "description_upright": "Transition, moving on, rite of passage, releasing baggage.",
        "description_reversed": "Resistance to change, unfinished business, emotional baggage.",
        "image_url": get_image_url("/cards/swords/swords06.jpg"),
    },
    {
        "name": "Seven of Swords",
        "suit": "Swords",
        "rank": "Seven",
        "description_short": "Betrayal, deception, getting away with something, acting strategically",
        "description_upright": "Deception, betrayal, stealth, strategy, cunning.",
        "description_reversed": "Confession, conscience, regret, turning a new leaf.",
        "image_url": get_image_url("/cards/swords/swords07.jpg"),
    },
    {
        "name": "Eight of Swords",
        "suit": "Swords",
        "rank": "Eight",
        "description_short": "Negative thoughts, self-imposed restriction, imprisonment, victim mentality",
        "description_upright": "Restriction, self-imposed limitation, victim mentality, imprisonment.",
        "description_reversed": "Self-acceptance, new perspective, freedom, releasing limiting beliefs.",
        "image_url": get_image_url("/cards/swords/swords08.jpg"),
    },
    {
        "name": "Nine of Swords",
        "suit": "Swords",
        "rank": "Nine",
        "description_short": "Anxiety, worry, fear, depression, nightmares",
        "description_upright": "Anxiety, fear, worry, nightmares, despair.",
        "description_reversed": "Hope, reaching out for help, recovery, finding solutions.",
        "image_url": get_image_url("/cards/swords/swords09.jpg"),
    },
    {
        "name": "Ten of Swords",
        "suit": "Swords",
        "rank": "Ten",
        "description_short": "Painful endings, deep wounds, betrayal, loss, crisis",
        "description_upright": "Painful endings, betrayal, loss, crisis, rock bottom.",
        "description_reversed": "Recovery, regeneration, resisting an inevitable end, lessons learned.",
        "image_url": get_image_url("/cards/swords/swords10.jpg"),
    },
    {
        "name": "Page of Swords",
        "suit": "Swords",
        "rank": "Page",
        "description_short": "New ideas, curiosity, thirst for knowledge, new ways of communicating",
        "description_upright": "Curiosity, new ideas, truth, mental agility, communication.",
        "description_reversed": "Deception, manipulation, gossip, scattered thoughts.",
        "image_url": get_image_url("/cards/swords/swords11.jpg"),
    },
    {
        "name": "Knight of Swords",
        "suit": "Swords",
        "rank": "Knight",
        "description_short": "Ambitious, action-oriented, driven to succeed, fast-thinking",
        "description_upright": "Ambition, action, drive, directness, intellectual pursuit.",
        "description_reversed": "Restlessness, impulsiveness, aggression, unfocused energy.",
        "image_url": get_image_url("/cards/swords/swords12.jpg"),
    },
    {
        "name": "Queen of Swords",
        "suit": "Swords",
        "rank": "Queen",
        "description_short": "Independent, unbiased judgement, clear boundaries, direct communication",
        "description_upright": "Clarity, independence, direct communication, unbiased judgment.",
        "description_reversed": "Coldness, bitterness, overly critical, isolation.",
        "image_url": get_image_url("/cards/swords/swords13.jpg"),
    },
    {
        "name": "King of Swords",
        "suit": "Swords",
        "rank": "King",
        "description_short": "Mental clarity, intellectual power, authority, truth",
        "description_upright": "Intellectual power, authority, truth, clarity, logic.",
        "description_reversed": "Manipulative, tyrannical, irrational, abuse of power.",
        "image_url": get_image_url("/cards/swords/swords14.jpg"),
    },
    # Suit of Pentacles
    {
        "name": "Ace of Pentacles",
        "suit": "Pentacles",
        "rank": "Ace",
        "description_short": "New financial or career opportunity, manifestation, abundance",
        "description_upright": "New opportunities, manifestation, prosperity, abundance.",
        "description_reversed": "Lost opportunity, lack of planning, financial insecurity.",
        "image_url": get_image_url("/cards/pentacles/pentacles01.jpg"),
    },
    {
        "name": "Two of Pentacles",
        "suit": "Pentacles",
        "rank": "Two",
        "description_short": "Multiple priorities, time management, prioritisation, adaptability",
        "description_upright": "Balancing priorities, adaptability, time management, flexibility.",
        "description_reversed": "Overwhelmed, disorganization, financial instability, poor choices.",
        "image_url": get_image_url("/cards/pentacles/pentacles02.jpg"),
    },
    {
        "name": "Three of Pentacles",
        "suit": "Pentacles",
        "rank": "Three",
        "description_short": "Teamwork, collaboration, learning, implementation",
        "description_upright": "Teamwork, collaboration, skill, craftsmanship, learning.",
        "description_reversed": "Lack of teamwork, poor quality work, disorganization, conflict.",
        "image_url": get_image_url("/cards/pentacles/pentacles03.jpg"),
    },
    {
        "name": "Four of Pentacles",
        "suit": "Pentacles",
        "rank": "Four",
        "description_short": "Saving money, security, conservatism, scarcity, control",
        "description_upright": "Control, stability, security, possession, conservatism.",
        "description_reversed": "Greed, materialism, possessiveness, self-protection, letting go.",
        "image_url": get_image_url("/cards/pentacles/pentacles04.jpg"),
    },
    {
        "name": "Five of Pentacles",
        "suit": "Pentacles",
        "rank": "Five",
        "description_short": "Financial loss, poverty, lack mindset, isolation, worry",
        "description_upright": "Poverty, financial loss, worry, isolation, insecurity.",
        "description_reversed": "Recovery from loss, spiritual poverty, positive change, help.",
        "image_url": get_image_url("/cards/pentacles/pentacles05.jpg"),
    },
    {
        "name": "Six of Pentacles",
        "suit": "Pentacles",
        "rank": "Six",
        "description_short": "Giving, receiving, sharing wealth, generosity, charity",
        "description_upright": "Generosity, charity, giving and receiving, sharing wealth.",
        "description_reversed": "Debt, selfishness, one-sided charity, strings attached.",
        "image_url": get_image_url("/cards/pentacles/pentacles06.jpg"),
    },
    {
        "name": "Seven of Pentacles",
        "suit": "Pentacles",
        "rank": "Seven",
        "description_short": "Long-term view, sustainable results, perseverance, investment",
        "description_upright": "Patience, investment, perseverance, long-term view.",
        "description_reversed": "Lack of long-term vision, impatience, limited success, quick profits.",
        "image_url": get_image_url("/cards/pentacles/pentacles07.jpg"),
    },
    {
        "name": "Eight of Pentacles",
        "suit": "Pentacles",
        "rank": "Eight",
        "description_short": "Apprenticeship, repetitive tasks, mastery, skill development",
        "description_upright": "Apprenticeship, skill development, mastery, diligence.",
        "description_reversed": "Perfectionism, lacking ambition, repetitive tasks, no joy in work.",
        "image_url": get_image_url("/cards/pentacles/pentacles08.jpg"),
    },
    {
        "name": "Nine of Pentacles",
        "suit": "Pentacles",
        "rank": "Nine",
        "description_short": "Abundance, luxury, self-sufficiency, financial independence",
        "description_upright": "Self-sufficiency, financial independence, luxury, abundance.",
        "description_reversed": "Financial dependency, over-spending, isolation, superficiality.",
        "image_url": get_image_url("/cards/pentacles/pentacles09.jpg"),
    },
    {
        "name": "Ten of Pentacles",
        "suit": "Pentacles",
        "rank": "Ten",
        "description_short": "Wealth, financial security, family, long-term success, contribution",
        "description_upright": "Legacy, inheritance, family, financial security, abundance.",
        "description_reversed": "Financial failure, loss, family disputes, fleeting success.",
        "image_url": get_image_url("/cards/pentacles/pentacles10.jpg"),
    },
    {
        "name": "Page of Pentacles",
        "suit": "Pentacles",
        "rank": "Page",
        "description_short": "Manifestation, financial opportunity, skill development",
        "description_upright": "New opportunity, manifestation, skill development, ambition.",
        "description_reversed": "Lack of progress, procrastination, laziness, missed opportunity.",
        "image_url": get_image_url("/cards/pentacles/pentacles11.jpg"),
    },
    {
        "name": "Knight of Pentacles",
        "suit": "Pentacles",
        "rank": "Knight",
        "description_short": "Hard work, productivity, routine, conservatism",
        "description_upright": "Efficiency, hard work, routine, responsibility, practicality.",
        "description_reversed": "Boredom, stagnation, laziness, irresponsibility, obsession with work.",
        "image_url": get_image_url("/cards/pentacles/pentacles12.jpg"),
    },
    {
        "name": "Queen of Pentacles",
        "suit": "Pentacles",
        "rank": "Queen",
        "description_short": "Nurturing, practical, providing financially, a working parent",
        "description_upright": "Nurturing, practical, financially providing, down-to-earth.",
        "description_reversed": "Financial insecurity, self-worth issues, smothering, work-life imbalance.",
        "image_url": get_image_url("/cards/pentacles/pentacles13.jpg"),
    },
    {
        "name": "King of Pentacles",
        "suit": "Pentacles",
        "rank": "King",
        "description_short": "Wealth, business, leadership, security, discipline, abundance",
        "description_upright": "Abundance, security, business leadership, discipline, control.",
        "description_reversed": "Greed, materialism, ruthlessness, corruption, stubbornness.",
        "image_url": get_image_url("/cards/pentacles/pentacles14.jpg"),
    },
]


async def seed_cards(reset_db: bool = False, delete_only: bool = False):
    # For async, use create_async_engine
    if "sqlite" in DATABASE_URL:  # Check if we are using sqlite
        engine = create_async_engine(DATABASE_URL, connect_args={"check_same_thread": False}, echo=False)
    else:
        engine = create_async_engine(DATABASE_URL, echo=False)

    async with engine.begin() as _:
        # Ensure all tables are created (optional, usually handled by Alembic)
        # await conn.run_sync(Base.metadata.create_all)
        pass  # Tables should be created by alembic migrations

    AsyncSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine, class_=AsyncSession)

    async with AsyncSessionLocal() as session:
        try:  # Added try block for overall transaction error handling
            async with session.begin():  # This context manager handles commit/rollback
                proceed_to_seed = False
                if delete_only:
                    print("Deleting all existing cards as per --delete option...")
                    await session.execute(delete(Card))
                    print("Cards marked for deletion in current transaction.")
                    # Do not proceed to seed if only deleting
                    return  # Exit after deletion

                if reset_db:
                    print("Resetting database: Deleting all existing cards...")
                    await session.execute(delete(Card))
                    print("Cards marked for deletion in current transaction.")
                    proceed_to_seed = True  # Always seed if reset is true
                else:
                    # Not resetting, check if cards exist
                    # Use a more efficient query to check for existence
                    stmt = select(Card.id).limit(1)
                    result = await session.execute(stmt)
                    existing_card = result.scalars().first()
                    if existing_card:
                        print("Card data already exists and --reset not specified. Skipping seeding.")
                        # No explicit commit needed, session.begin() handles it.
                        # Return to skip seeding.
                        return  # Exits the seed_cards function
                    else:
                        # No cards exist, and not resetting, so proceed to seed
                        proceed_to_seed = True

                if proceed_to_seed:
                    action = "Re-seeding" if reset_db else "Seeding"
                    print(f"{action} {len(tarot_cards_data)} cards into the database...")
                    for card_data in tarot_cards_data:
                        card = Card(**card_data)
                        session.add(card)
                    # No explicit commit here, session.begin() will commit if no exceptions.
            # If async with session.begin() completed without error, it was committed.
            print("Card data transaction completed successfully.")

        except Exception as e:
            # An error occurred during the operations within session.begin(),
            # and session.begin() would have rolled back the transaction.
            print(f"Error during card seeding transaction: {e}")
            # Re-raise or handle as appropriate for the application
            # For this script, printing the error is sufficient.


if __name__ == "__main__":
    # Ensure alembic migrations are run first
    # print("Please ensure Alembic migrations have been run to create the tables before seeding.")
    # print("You can typically run migrations with a command like: alembic upgrade head")
    # input("Press Enter to continue with seeding if migrations are done, or Ctrl+C to cancel...")

    parser = argparse.ArgumentParser(description="Seed tarot cards into the database.")
    parser.add_argument(
        "--reset",
        action="store_true",
        help="Reset the database by deleting all cards before seeding.",
    )
    parser.add_argument(
        "--delete",
        action="store_true",
        help="Delete all cards from the database without re-seeding.",
    )
    args = parser.parse_args()

    # Check if we are using sqlite, if so, we can create tables directly
    # For production with PostgreSQL, migrations are preferred.
    if "sqlite" in DATABASE_URL:
        print("Detected SQLite, creating tables directly for seeding script...")
        # Synchronous engine for table creation if needed for SQLite
        sync_engine = create_engine(DATABASE_URL.replace("sqlite+aiosqlite", "sqlite"))
        Base.metadata.create_all(bind=sync_engine)
        print("Tables created (if they didn't exist).")

    asyncio.run(seed_cards(reset_db=args.reset, delete_only=args.delete))
