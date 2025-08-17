"""add_message_card_association_nullable_orientation

Revision ID: ec3f7fdaef13
Revises: bf43f0cb2132
Create Date: 2025-05-30 05:16:43.069211+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "ec3f7fdaef13"
down_revision: Union[str, None] = "bf43f0cb2132"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Create cards table first
    op.create_table(
        "cards",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("suit", sa.String(50), nullable=True),
        sa.Column("rank", sa.String(50), nullable=True),
        sa.Column("image_url", sa.String(512), nullable=True),
        sa.Column("description_short", sa.String(255), nullable=True),
        sa.Column("description_upright", sa.String(), nullable=True),
        sa.Column("description_reversed", sa.String(), nullable=True),
        sa.Column("element", sa.String(50), nullable=True),
        sa.Column("astrology", sa.String(100), nullable=True),
        sa.Column("numerology", sa.Integer(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name")
    )
    op.create_index(op.f("ix_cards_id"), "cards", ["id"], unique=False)

    # # Create messages table
    # op.create_table(
    #     "messages",
    #     sa.Column("id", sa.Integer(), nullable=False),
    #     sa.Column("content", sa.String(), nullable=True),
    #     sa.Column("role", sa.String(), nullable=True),
    #     sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
    #     sa.Column("chat_session_id", sa.Integer(), nullable=True),
    #     sa.ForeignKeyConstraint(["chat_session_id"], ["chat_sessions.id"], ),
    #     sa.PrimaryKeyConstraint("id")
    # )
    # op.create_index(op.f("ix_messages_id"), "messages", ["id"], unique=False)

    # Create message_cards table
    op.create_table(
        "message_cards",
        sa.Column("message_id", sa.Integer(), nullable=False),
        sa.Column("card_id", sa.Integer(), nullable=False),
        sa.Column("orientation", sa.String(), nullable=True),
        sa.ForeignKeyConstraint(["card_id"], ["cards.id"], ),
        sa.ForeignKeyConstraint(["message_id"], ["messages.id"], ),
        sa.PrimaryKeyConstraint("message_id", "card_id")
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table("message_cards")
    op.drop_table("messages")
    op.drop_index(op.f("ix_cards_id"), table_name="cards")
    op.drop_table("cards")
