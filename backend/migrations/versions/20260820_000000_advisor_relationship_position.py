"""rename relationship outcome position for advisor terminology

Revision ID: 20260820_advisor_relationship_position
Revises: 20260723_reset_token_hash
"""

import json
from collections.abc import Sequence
from typing import Union

import sqlalchemy as sa

from alembic import op

revision: str = "20260820_advisor_relationship_position"
down_revision: Union[str, None] = "20260723_reset_token_hash"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


SPREAD_POSITION_RENAMES = {
    "Three-Card Spread": {2: ("Future", "Possible Direction")},
    "Five-Card Cross": {2: ("Future", "Possible Direction")},
    "Horseshoe Spread": {6: ("Outcome", "Possible Direction")},
    "Celtic Cross": {
        4: ("Crown/Possible Outcome", "Crown/Possible Direction"),
        5: ("Immediate Future", "Near-Term Perspective"),
        9: ("Final Outcome", "Closing Perspective"),
    },
    "Career Path": {4: ("Career Outcome", "Career Direction")},
    "Relationship Cross": {4: ("The Outcome", "Possible Direction")},
}


def _update_positions(reverse: bool = False) -> None:
    bind = op.get_bind()
    rows = bind.execute(sa.text("SELECT id, name, positions FROM spreads")).all()
    for spread_id, spread_name, positions_json in rows:
        positions = json.loads(positions_json)
        position_renames = SPREAD_POSITION_RENAMES.get(spread_name, {})
        changed = False
        for position in positions:
            index = position.get("index")
            rename_pair = position_renames.get(index)
            if rename_pair:
                old_name, new_name = rename_pair
                if reverse:
                    old_name, new_name = new_name, old_name
                if position.get("name") == old_name:
                    position["name"] = new_name
                    changed = True
        if changed:
            bind.execute(
                sa.text("UPDATE spreads SET positions = :positions WHERE id = :id"),
                {"id": spread_id, "positions": json.dumps(positions)},
            )


def upgrade() -> None:
    _update_positions()


def downgrade() -> None:
    _update_positions(reverse=True)
