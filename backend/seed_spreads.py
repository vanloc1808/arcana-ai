#!/usr/bin/env python3
"""
Seed script for tarot spreads.
This script populates the spreads table with common tarot reading templates.
"""

from database import SessionLocal
from models import Spread


def seed_spreads():
    """Seed the database with common tarot spreads."""

    spreads_data = [
        {
            "name": "Single Card",
            "description": "A simple one-card draw for quick insight and guidance.",
            "num_cards": 1,
            "positions": [
                {
                    "index": 0,
                    "name": "Insight",
                    "description": "The main insight or guidance for your question",
                    "x": 50,
                    "y": 50,
                }
            ],
        },
        {
            "name": "Three-Card Spread",
            "description": "A classic spread representing Past, Present, and Future influences.",
            "num_cards": 3,
            "positions": [
                {
                    "index": 0,
                    "name": "Past",
                    "description": "Past influences affecting the situation",
                    "x": 20,
                    "y": 50,
                },
                {"index": 1, "name": "Present", "description": "Current situation and energies", "x": 50, "y": 50},
                {
                    "index": 2,
                    "name": "Future",
                    "description": "Potential outcome or future influences",
                    "x": 80,
                    "y": 50,
                },
            ],
        },
        {
            "name": "Mind-Body-Spirit",
            "description": "A three-card spread focusing on mental, physical, and spiritual aspects.",
            "num_cards": 3,
            "positions": [
                {
                    "index": 0,
                    "name": "Mind",
                    "description": "Mental state, thoughts, and intellectual aspects",
                    "x": 20,
                    "y": 50,
                },
                {
                    "index": 1,
                    "name": "Body",
                    "description": "Physical health, material concerns, and practical matters",
                    "x": 50,
                    "y": 50,
                },
                {
                    "index": 2,
                    "name": "Spirit",
                    "description": "Spiritual guidance, higher purpose, and inner wisdom",
                    "x": 80,
                    "y": 50,
                },
            ],
        },
        {
            "name": "Five-Card Cross",
            "description": "A cross formation exploring the core issue and surrounding influences.",
            "num_cards": 5,
            "positions": [
                {"index": 0, "name": "Core Issue", "description": "The heart of the matter", "x": 50, "y": 50},
                {"index": 1, "name": "Past", "description": "Past influences and experiences", "x": 20, "y": 50},
                {"index": 2, "name": "Future", "description": "Potential future outcome", "x": 80, "y": 50},
                {"index": 3, "name": "Conscious Mind", "description": "What you're aware of", "x": 50, "y": 20},
                {
                    "index": 4,
                    "name": "Unconscious",
                    "description": "Hidden influences and subconscious factors",
                    "x": 50,
                    "y": 80,
                },
            ],
        },
        {
            "name": "Horseshoe Spread",
            "description": "A seven-card spread providing comprehensive guidance on a situation.",
            "num_cards": 7,
            "positions": [
                {
                    "index": 0,
                    "name": "Past",
                    "description": "Past influences affecting the situation",
                    "x": 10,
                    "y": 80,
                },
                {"index": 1, "name": "Present", "description": "Current circumstances", "x": 25, "y": 50},
                {
                    "index": 2,
                    "name": "Hidden Influences",
                    "description": "Unknown factors affecting the situation",
                    "x": 40,
                    "y": 30,
                },
                {"index": 3, "name": "Obstacles", "description": "Challenges to overcome", "x": 50, "y": 20},
                {
                    "index": 4,
                    "name": "Environment",
                    "description": "External influences and people around you",
                    "x": 60,
                    "y": 30,
                },
                {"index": 5, "name": "Action to Take", "description": "What you should do", "x": 75, "y": 50},
                {
                    "index": 6,
                    "name": "Outcome",
                    "description": "Likely result if current path continues",
                    "x": 90,
                    "y": 80,
                },
            ],
        },
        {
            "name": "Celtic Cross",
            "description": "The most famous tarot spread, providing deep insight into complex situations.",
            "num_cards": 10,
            "positions": [
                {
                    "index": 0,
                    "name": "Present Situation",
                    "description": "Your current circumstances and what's happening now",
                    "x": 40,
                    "y": 50,
                },
                {
                    "index": 1,
                    "name": "Challenge/Cross",
                    "description": "The challenge you face or what crosses you",
                    "x": 60,
                    "y": 50,
                },
                {
                    "index": 2,
                    "name": "Distant Past",
                    "description": "Distant past influences and foundation",
                    "x": 40,
                    "y": 80,
                },
                {
                    "index": 3,
                    "name": "Recent Past",
                    "description": "Recent events that have led to this situation",
                    "x": 20,
                    "y": 50,
                },
                {
                    "index": 4,
                    "name": "Crown/Possible Outcome",
                    "description": "Possible outcome or what may come to pass",
                    "x": 40,
                    "y": 20,
                },
                {
                    "index": 5,
                    "name": "Immediate Future",
                    "description": "What will happen in the near future",
                    "x": 60,
                    "y": 20,
                },
                {
                    "index": 6,
                    "name": "Your Approach",
                    "description": "Your approach to the situation",
                    "x": 80,
                    "y": 80,
                },
                {
                    "index": 7,
                    "name": "External Influences",
                    "description": "How others see you and external factors",
                    "x": 80,
                    "y": 60,
                },
                {
                    "index": 8,
                    "name": "Hopes and Fears",
                    "description": "Your inner hopes and fears about the situation",
                    "x": 80,
                    "y": 40,
                },
                {
                    "index": 9,
                    "name": "Final Outcome",
                    "description": "The ultimate outcome and resolution",
                    "x": 80,
                    "y": 20,
                },
            ],
        },
        {
            "name": "Relationship Spread",
            "description": "A specialized spread for exploring relationship dynamics.",
            "num_cards": 6,
            "positions": [
                {
                    "index": 0,
                    "name": "You",
                    "description": "Your role and feelings in the relationship",
                    "x": 20,
                    "y": 30,
                },
                {
                    "index": 1,
                    "name": "Your Partner",
                    "description": "Their role and feelings in the relationship",
                    "x": 80,
                    "y": 30,
                },
                {"index": 2, "name": "The Connection", "description": "The bond between you", "x": 50, "y": 30},
                {"index": 3, "name": "Strengths", "description": "What strengthens the relationship", "x": 30, "y": 70},
                {"index": 4, "name": "Challenges", "description": "What challenges the relationship", "x": 70, "y": 70},
                {
                    "index": 5,
                    "name": "Future Potential",
                    "description": "Where the relationship is heading",
                    "x": 50,
                    "y": 70,
                },
            ],
        },
        {
            "name": "Career Path",
            "description": "A focused spread for career and professional guidance.",
            "num_cards": 5,
            "positions": [
                {
                    "index": 0,
                    "name": "Current Situation",
                    "description": "Your current professional state",
                    "x": 50,
                    "y": 80,
                },
                {
                    "index": 1,
                    "name": "Skills & Talents",
                    "description": "Your professional strengths",
                    "x": 20,
                    "y": 50,
                },
                {"index": 2, "name": "Challenges", "description": "Obstacles in your career path", "x": 80, "y": 50},
                {"index": 3, "name": "Action to Take", "description": "What you should do next", "x": 50, "y": 50},
                {"index": 4, "name": "Career Outcome", "description": "Where your career is heading", "x": 50, "y": 20},
            ],
        },
    ]

    db = SessionLocal()
    try:
        # Check if spreads already exist
        existing_spreads = db.query(Spread).count()
        if existing_spreads > 0:
            print(f"Spreads table already has {existing_spreads} entries. Skipping seed.")
            return

        # Add each spread to the database
        for spread_data in spreads_data:
            spread = Spread(
                name=spread_data["name"], description=spread_data["description"], num_cards=spread_data["num_cards"]
            )
            spread.set_positions(spread_data["positions"])
            db.add(spread)

        db.commit()
        print(f"Successfully seeded {len(spreads_data)} tarot spreads!")

        # Print summary
        for spread_data in spreads_data:
            print(f"  - {spread_data['name']} ({spread_data['num_cards']} cards)")

    except Exception as e:
        db.rollback()
        print(f"Error seeding spreads: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    seed_spreads()
