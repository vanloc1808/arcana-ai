#!/usr/bin/env python3
"""Create checkout_sessions table migration."""

import sys
from pathlib import Path

# Add backend to path
sys.path.append(str(Path(__file__).parent))

from database import engine, Base
from models import CheckoutSession
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

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