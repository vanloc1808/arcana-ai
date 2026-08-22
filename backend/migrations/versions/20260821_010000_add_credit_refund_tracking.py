"""Add purchase-level credit and refund tracking.

Revision ID: 20260821_credit_refunds
Revises: 20260821_payment_idempotency
Create Date: 2026-08-21 01:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "20260821_credit_refunds"
down_revision = "20260821_payment_idempotency"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("payment_transactions", schema=None) as batch_op:
        batch_op.add_column(sa.Column("turns_remaining", sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column("turns_refunded", sa.Integer(), nullable=False, server_default="0"))
        batch_op.add_column(sa.Column("refunded_amount", sa.String(), nullable=False, server_default="0.00"))
        batch_op.add_column(sa.Column("refund_requested_at", sa.DateTime(timezone=True), nullable=True))
        batch_op.add_column(sa.Column("refund_request_ticket_id", sa.String(), nullable=True))
        batch_op.create_index(
            "ix_payment_transactions_refund_requested_at",
            ["refund_requested_at"],
            unique=False,
        )

    # Existing balances cannot be attributed exactly to a purchase. New purchases
    # receive a precise remaining balance; legacy rows remain nullable and are
    # treated as untracked credits by the service.


def downgrade() -> None:
    with op.batch_alter_table("payment_transactions", schema=None) as batch_op:
        batch_op.drop_index("ix_payment_transactions_refund_requested_at")
        batch_op.drop_column("refund_request_ticket_id")
        batch_op.drop_column("refund_requested_at")
        batch_op.drop_column("refunded_amount")
        batch_op.drop_column("turns_refunded")
        batch_op.drop_column("turns_remaining")
