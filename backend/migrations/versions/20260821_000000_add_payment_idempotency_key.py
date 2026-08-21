"""Add payment webhook idempotency keys.

Revision ID: 20260821_payment_idempotency
Revises: 20260820_advisor_position
Create Date: 2026-08-21 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "20260821_payment_idempotency"
down_revision = "20260820_advisor_position"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("payment_transactions", schema=None) as batch_op:
        batch_op.add_column(sa.Column("idempotency_key", sa.String(), nullable=True))
        batch_op.create_index(
            "ix_payment_transactions_idempotency_key",
            ["idempotency_key"],
            unique=True,
        )


def downgrade() -> None:
    with op.batch_alter_table("payment_transactions", schema=None) as batch_op:
        batch_op.drop_index("ix_payment_transactions_idempotency_key")
        batch_op.drop_column("idempotency_key")
