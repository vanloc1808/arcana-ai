"""add_lemon_squeezy_subscription_fields

Revision ID: 1be34bbfb3ff
Revises: f118722afcd0
Create Date: 2025-06-20 16:03:00.795275+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1be34bbfb3ff'
down_revision: Union[str, None] = 'f118722afcd0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add subscription-related fields to users table
    with op.batch_alter_table('users') as batch_op:
        batch_op.add_column(sa.Column('lemon_squeezy_customer_id', sa.String(), nullable=True))
        batch_op.add_column(sa.Column('subscription_status', sa.String(), nullable=False, server_default='none'))
        batch_op.add_column(sa.Column('number_of_free_turns', sa.Integer(), nullable=False, server_default='3'))
        batch_op.add_column(sa.Column('number_of_paid_turns', sa.Integer(), nullable=False, server_default='0'))
        batch_op.add_column(sa.Column('last_free_turns_reset', sa.DateTime(timezone=True), nullable=True))
        batch_op.add_column(sa.Column('last_subscription_sync', sa.DateTime(timezone=True), nullable=True))

        # Create indexes
        batch_op.create_index(op.f('ix_users_lemon_squeezy_customer_id'), ['lemon_squeezy_customer_id'], unique=False)
        batch_op.create_index(op.f('ix_users_subscription_status'), ['subscription_status'], unique=False)
        batch_op.create_index(op.f('ix_users_number_of_free_turns'), ['number_of_free_turns'], unique=False)
        batch_op.create_index(op.f('ix_users_number_of_paid_turns'), ['number_of_paid_turns'], unique=False)
        batch_op.create_index(op.f('ix_users_last_free_turns_reset'), ['last_free_turns_reset'], unique=False)
        batch_op.create_index(op.f('ix_users_last_subscription_sync'), ['last_subscription_sync'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    # Remove subscription-related fields from users table
    with op.batch_alter_table('users') as batch_op:
        batch_op.drop_index(op.f('ix_users_last_subscription_sync'))
        batch_op.drop_index(op.f('ix_users_last_free_turns_reset'))
        batch_op.drop_index(op.f('ix_users_number_of_paid_turns'))
        batch_op.drop_index(op.f('ix_users_number_of_free_turns'))
        batch_op.drop_index(op.f('ix_users_subscription_status'))
        batch_op.drop_index(op.f('ix_users_lemon_squeezy_customer_id'))

        batch_op.drop_column('last_subscription_sync')
        batch_op.drop_column('last_free_turns_reset')
        batch_op.drop_column('number_of_paid_turns')
        batch_op.drop_column('number_of_free_turns')
        batch_op.drop_column('subscription_status')
        batch_op.drop_column('lemon_squeezy_customer_id')
