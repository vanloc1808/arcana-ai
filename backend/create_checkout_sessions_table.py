#!/usr/bin/env python3
"""Create checkout_sessions table migration."""

import sys
from pathlib import Path

# Add backend to path
sys.path.append(str(Path(__file__).parent))


from database import engine
from models import CheckoutSession
from utils.logging import logger


def create_checkout_sessions_table():
    """Create the checkout_sessions table."""
    try:
        logger.info("Creating checkout_sessions table...")

        # Create the table
        CheckoutSession.__table__.create(engine, checkfirst=True)

        logger.info("✅ Successfully created checkout_sessions table")

    except Exception as e:
        logger.error(f"❌ Error creating checkout_sessions table: {e}")
        raise

if __name__ == "__main__":
    create_checkout_sessions_table()
    print("Migration completed!")
