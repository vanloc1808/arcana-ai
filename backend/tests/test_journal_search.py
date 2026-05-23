"""Tests for journal advanced search filters (card name, spread, tag mode) and helper endpoints."""
from fastapi import status

from tests.factories import JournalEntryFactory


class TestJournalCardSpreadFilters:
    def _seed(self, db_session, user_id):
        JournalEntryFactory.create(
            db=db_session,
            user_id=user_id,
            personal_notes="career one",
            tags=["career", "growth"],
            reading_snapshot={
                "cards": [{"name": "The Fool", "orientation": "upright"}],
                "spread": "three_card",
            },
        )
        JournalEntryFactory.create(
            db=db_session,
            user_id=user_id,
            personal_notes="love one",
            tags=["love"],
            reading_snapshot={
                "cards": [{"name": "The Lovers", "orientation": "upright"}],
                "spread": "celtic_cross",
            },
        )
        JournalEntryFactory.create(
            db=db_session,
            user_id=user_id,
            personal_notes="career two with fool",
            tags=["career"],
            reading_snapshot={
                "cards": [
                    {"name": "The Fool", "orientation": "reversed"},
                    {"name": "The Star", "orientation": "upright"},
                ],
                "spread": "three_card",
            },
        )

    def test_filter_by_card_name(self, client, auth_headers, test_user, db_session):
        self._seed(db_session, test_user.id)
        response = client.get("/api/journal/entries?card_name=The Fool", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data) == 2
        notes = {e["personal_notes"] for e in data}
        assert "love one" not in notes

    def test_filter_by_spread_name(self, client, auth_headers, test_user, db_session):
        self._seed(db_session, test_user.id)
        response = client.get("/api/journal/entries?spread_name=celtic_cross", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data) == 1
        assert data[0]["personal_notes"] == "love one"

    def test_filter_card_and_spread_combined(self, client, auth_headers, test_user, db_session):
        self._seed(db_session, test_user.id)
        response = client.get(
            "/api/journal/entries?card_name=The Fool&spread_name=three_card", headers=auth_headers
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data) == 2

    def test_tags_match_all_is_default(self, client, auth_headers, test_user, db_session):
        self._seed(db_session, test_user.id)
        response = client.get("/api/journal/entries?tags=career,growth", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        # Only the entry with BOTH career AND growth matches
        assert len(data) == 1
        assert data[0]["personal_notes"] == "career one"

    def test_tags_match_any(self, client, auth_headers, test_user, db_session):
        self._seed(db_session, test_user.id)
        response = client.get(
            "/api/journal/entries?tags=love,growth&tags_match=any", headers=auth_headers
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        # Matches "career one" (growth) and "love one" (love)
        assert len(data) == 2

    def test_card_name_unknown_returns_empty(self, client, auth_headers, test_user, db_session):
        self._seed(db_session, test_user.id)
        response = client.get("/api/journal/entries?card_name=Nonexistent", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        assert response.json() == []


class TestJournalDiscoveryEndpoints:
    def test_get_tags_returns_counts_sorted(self, client, auth_headers, test_user, db_session):
        for tag_set in (["love"], ["career", "growth"], ["career"], ["love", "career"]):
            JournalEntryFactory.create(
                db=db_session, user_id=test_user.id, tags=tag_set,
                reading_snapshot={"cards": [], "spread": "single"},
            )
        response = client.get("/api/journal/tags", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data[0]["tag"] == "career"
        assert data[0]["count"] == 3
        names_to_count = {item["tag"]: item["count"] for item in data}
        assert names_to_count["love"] == 2
        assert names_to_count["growth"] == 1

    def test_get_tags_isolates_by_user(self, client, auth_headers, auth_headers_2, test_user, test_user_2, db_session):
        JournalEntryFactory.create(
            db=db_session, user_id=test_user.id, tags=["only-mine"],
            reading_snapshot={"cards": [], "spread": "single"},
        )
        JournalEntryFactory.create(
            db=db_session, user_id=test_user_2.id, tags=["theirs"],
            reading_snapshot={"cards": [], "spread": "single"},
        )
        response = client.get("/api/journal/tags", headers=auth_headers)
        data = response.json()
        assert [item["tag"] for item in data] == ["only-mine"]

    def test_get_spreads_used(self, client, auth_headers, test_user, db_session):
        JournalEntryFactory.create(
            db=db_session, user_id=test_user.id,
            reading_snapshot={"cards": [], "spread": "three_card"},
        )
        JournalEntryFactory.create(
            db=db_session, user_id=test_user.id,
            reading_snapshot={"cards": [], "spread": "celtic_cross"},
        )
        JournalEntryFactory.create(
            db=db_session, user_id=test_user.id,
            reading_snapshot={"cards": [], "spread": "celtic_cross"},
        )
        response = client.get("/api/journal/spreads-used", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        assert response.json() == ["celtic_cross", "three_card"]

    def test_get_tags_requires_auth(self, client):
        response = client.get("/api/journal/tags")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
