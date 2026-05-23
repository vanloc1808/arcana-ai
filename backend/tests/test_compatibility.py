"""Tests for the compatibility (relationship) reading endpoint."""
import json

import pytest
from fastapi import status

from models import Spread


@pytest.fixture
def relationship_spread(db_session):
    """Insert the Relationship Cross spread used by the compatibility endpoint."""
    existing = db_session.query(Spread).filter(Spread.name == "Relationship Cross").first()
    if existing:
        return existing
    positions = [
        {"index": 0, "name": "You", "description": "person A", "x": 25, "y": 50},
        {"index": 1, "name": "Them", "description": "person B", "x": 75, "y": 50},
        {"index": 2, "name": "The Connection", "description": "bond", "x": 50, "y": 25},
        {"index": 3, "name": "The Challenge", "description": "friction", "x": 50, "y": 75},
        {"index": 4, "name": "The Outcome", "description": "outcome", "x": 50, "y": 50},
    ]
    spread = Spread(
        name="Relationship Cross",
        description="Five-card relationship spread",
        num_cards=5,
        positions=json.dumps(positions),
    )
    db_session.add(spread)
    db_session.commit()
    db_session.refresh(spread)
    return spread


class TestCompatibilityReading:
    def test_returns_five_cards_with_personalized_positions(
        self, client, auth_headers, test_cards, mock_tarot_reader, relationship_spread
    ):
        payload = {
            "person_a": {"name": "Avery"},
            "person_b": {"name": "Blake"},
            "focus": "Are we on the same path?",
        }
        response = client.post("/tarot/compatibility", json=payload, headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["spread_name"] == "Relationship Cross"
        assert data["person_a"]["name"] == "Avery"
        assert data["person_b"]["name"] == "Blake"
        assert data["focus"] == "Are we on the same path?"
        assert len(data["cards"]) == 5
        # Position 0 should be personalized with Avery; position 1 with Blake
        assert "Avery" in data["cards"][0]["position"]
        assert "Blake" in data["cards"][1]["position"]
        # Non-person positions are not personalized
        assert data["cards"][2]["position"] == "The Connection"
        assert data["cards"][3]["position"] == "The Challenge"
        assert data["cards"][4]["position"] == "The Outcome"

    def test_works_without_focus(self, client, auth_headers, test_cards, mock_tarot_reader, relationship_spread):
        response = client.post(
            "/tarot/compatibility",
            json={"person_a": {"name": "A"}, "person_b": {"name": "B"}},
            headers=auth_headers,
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["focus"] is None

    def test_accepts_birth_dates(self, client, auth_headers, test_cards, mock_tarot_reader, relationship_spread):
        response = client.post(
            "/tarot/compatibility",
            json={
                "person_a": {"name": "A", "birth_date": "1990-04-15"},
                "person_b": {"name": "B", "birth_date": "1992-11-02"},
            },
            headers=auth_headers,
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["person_a"]["birth_date"] == "1990-04-15"
        assert data["person_b"]["birth_date"] == "1992-11-02"

    def test_requires_authentication(self, client, test_cards, mock_tarot_reader, relationship_spread):
        response = client.post(
            "/tarot/compatibility",
            json={"person_a": {"name": "A"}, "person_b": {"name": "B"}},
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_rejects_empty_name(self, client, auth_headers, test_cards, mock_tarot_reader, relationship_spread):
        response = client.post(
            "/tarot/compatibility",
            json={"person_a": {"name": ""}, "person_b": {"name": "B"}},
            headers=auth_headers,
        )
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_missing_spread_returns_error(self, client, auth_headers, test_cards, mock_tarot_reader, db_session):
        # Ensure Relationship Cross spread does NOT exist
        db_session.query(Spread).filter(Spread.name == "Relationship Cross").delete()
        db_session.commit()
        response = client.post(
            "/tarot/compatibility",
            json={"person_a": {"name": "A"}, "person_b": {"name": "B"}},
            headers=auth_headers,
        )
        assert response.status_code >= 400
        # The error handler converts TarotAPIException to a structured response
        body = response.json()
        assert "compatibility" in json.dumps(body).lower()

    def test_rejects_long_focus(self, client, auth_headers, test_cards, mock_tarot_reader, relationship_spread):
        response = client.post(
            "/tarot/compatibility",
            json={
                "person_a": {"name": "A"},
                "person_b": {"name": "B"},
                "focus": "x" * 501,
            },
            headers=auth_headers,
        )
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


class TestCompatibilityInterpretation:
    def _cards(self):
        return [
            {"name": "Four of Wands", "orientation": "upright", "position": "You — A", "meaning": "Harmony"},
            {"name": "Queen of Cups", "orientation": "reversed", "position": "Them — B", "meaning": "Insecurity"},
            {"name": "Four of Pentacles", "orientation": "upright", "position": "The Connection", "meaning": "Security"},
            {"name": "Eight of Swords", "orientation": "upright", "position": "The Challenge", "meaning": "Restriction"},
            {"name": "Eight of Pentacles", "orientation": "reversed", "position": "The Outcome", "meaning": "Perfectionism"},
        ]

    def test_interpret_returns_text(self, client, auth_headers, test_cards):
        from unittest.mock import AsyncMock, patch

        with patch("routers.tarot.TarotReader") as mock_reader_cls:
            mock_reader_cls.return_value.create_compatibility_reading = AsyncMock(
                return_value="A and B share a grounded, committed bond."
            )
            response = client.post(
                "/tarot/compatibility/interpret",
                json={
                    "person_a": {"name": "A"},
                    "person_b": {"name": "B"},
                    "focus": "Are we ready to commit?",
                    "cards": self._cards(),
                },
                headers=auth_headers,
            )
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["interpretation"].startswith("A and B")

    def test_interpret_requires_cards(self, client, auth_headers, test_cards):
        response = client.post(
            "/tarot/compatibility/interpret",
            json={"person_a": {"name": "A"}, "person_b": {"name": "B"}, "cards": []},
            headers=auth_headers,
        )
        assert response.status_code >= 400

    def test_interpret_requires_auth(self, client):
        response = client.post(
            "/tarot/compatibility/interpret",
            json={"person_a": {"name": "A"}, "person_b": {"name": "B"}, "cards": self._cards()},
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
