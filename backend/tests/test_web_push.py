"""Tests for the Web Push subscription endpoints and the due-reminder task."""
from datetime import UTC, datetime, timedelta
from unittest.mock import patch

from fastapi import status

from config import settings
from models import ReadingReminder, UserReadingJournal, WebPushSubscription


def _enable_vapid():
    """Patch settings so is_configured() returns True for the duration of a test."""
    return patch.multiple(
        settings,
        WEBPUSH_PUBLIC_KEY="BPublicKeyFortestingOnly_dummy_value_xx",
        WEBPUSH_PRIVATE_KEY="dummy_private_key_for_testing",
    )


class TestVapidPublicKeyEndpoint:
    def test_returns_configured_false_when_unset(self, client):
        response = client.get("/api/web-push/vapid-public-key")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["configured"] is False
        assert data["public_key"] == ""

    def test_returns_configured_true_when_set(self, client):
        with _enable_vapid():
            response = client.get("/api/web-push/vapid-public-key")
            assert response.status_code == status.HTTP_200_OK
            data = response.json()
            assert data["configured"] is True
            assert data["public_key"].startswith("B")


class TestSubscribeEndpoint:
    def _payload(self, endpoint="https://push.example.com/abc"):
        return {
            "endpoint": endpoint,
            "keys": {
                "p256dh": "BNcRdreALRFXTkOiHmuv4kP1234567890abcdef",
                "auth": "abcd1234567890efghijkl",
            },
            "user_agent": "Test Browser 1.0",
        }

    def test_creates_subscription(self, client, auth_headers, test_user, db_session):
        user_id = test_user.id
        with _enable_vapid():
            response = client.post(
                "/api/web-push/subscribe", json=self._payload(), headers=auth_headers
            )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["endpoint"] == "https://push.example.com/abc"
        assert db_session.query(WebPushSubscription).filter_by(user_id=user_id).count() == 1

    def test_subscribe_updates_existing(self, client, auth_headers, test_user, db_session):
        user_id = test_user.id
        with _enable_vapid():
            client.post("/api/web-push/subscribe", json=self._payload(), headers=auth_headers)
            updated = self._payload()
            updated["keys"]["p256dh"] = "BUpdatedKey1234567890abcdef0123456789"
            client.post("/api/web-push/subscribe", json=updated, headers=auth_headers)

        rows = db_session.query(WebPushSubscription).filter_by(user_id=user_id).all()
        assert len(rows) == 1
        assert rows[0].p256dh.startswith("BUpdatedKey")

    def test_subscribe_returns_503_when_unconfigured(self, client, auth_headers):
        response = client.post(
            "/api/web-push/subscribe", json=self._payload(), headers=auth_headers
        )
        assert response.status_code == status.HTTP_503_SERVICE_UNAVAILABLE

    def test_subscribe_requires_auth(self, client):
        with _enable_vapid():
            response = client.post("/api/web-push/subscribe", json=self._payload())
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


class TestUnsubscribeEndpoint:
    def test_removes_subscription(self, client, auth_headers, test_user, db_session):
        user_id = test_user.id
        with _enable_vapid():
            client.post(
                "/api/web-push/subscribe",
                json={
                    "endpoint": "https://push.example.com/x",
                    "keys": {"p256dh": "Bkey1234567890abcdef", "auth": "auth1234567890"},
                },
                headers=auth_headers,
            )
        response = client.post(
            "/api/web-push/unsubscribe",
            json={"endpoint": "https://push.example.com/x"},
            headers=auth_headers,
        )
        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert db_session.query(WebPushSubscription).filter_by(user_id=user_id).count() == 0

    def test_unsubscribe_unknown_endpoint_is_idempotent(self, client, auth_headers):
        response = client.post(
            "/api/web-push/unsubscribe",
            json={"endpoint": "https://push.example.com/nope"},
            headers=auth_headers,
        )
        assert response.status_code == status.HTTP_204_NO_CONTENT


class TestProcessDueRemindersTask:
    def test_processes_due_and_marks_sent(self, db_session, test_user):
        # Seed a journal entry + an overdue reminder
        entry = UserReadingJournal(user_id=test_user.id, reading_snapshot={"cards": []})
        db_session.add(entry)
        db_session.flush()

        past = datetime.now(UTC) - timedelta(hours=2)
        future = datetime.now(UTC) + timedelta(hours=2)
        overdue = ReadingReminder(
            user_id=test_user.id,
            journal_entry_id=entry.id,
            reminder_type="follow_up",
            reminder_date=past,
            message="Check in on your reading",
        )
        not_yet_due = ReadingReminder(
            user_id=test_user.id,
            journal_entry_id=entry.id,
            reminder_type="follow_up",
            reminder_date=future,
            message="Future reminder",
        )
        db_session.add_all([overdue, not_yet_due])
        db_session.commit()

        # Patch the task's SessionLocal so it uses the same DB as the test
        from sqlalchemy.orm import scoped_session, sessionmaker

        from tasks import web_push_tasks
        bind = db_session.get_bind()
        TestSession = scoped_session(sessionmaker(bind=bind, expire_on_commit=False))

        with _enable_vapid(), patch.object(web_push_tasks, "SessionLocal", TestSession), \
                patch.object(web_push_tasks, "send_push_to_user") as mock_send:
            mock_send.return_value = type("R", (), {"sent": 1, "failed": 0, "pruned": 0})()
            result = web_push_tasks.process_due_reading_reminders_task.run()

        assert result["status"] == "success"
        assert result["due_count"] == 1
        # Refresh from DB
        db_session.expire_all()
        overdue_row = db_session.query(ReadingReminder).filter_by(id=overdue.id).one()
        not_yet_row = db_session.query(ReadingReminder).filter_by(id=not_yet_due.id).one()
        assert overdue_row.is_sent is True
        assert not_yet_row.is_sent is False

    def test_skips_when_not_configured(self, db_session, test_user):
        from tasks import web_push_tasks

        result = web_push_tasks.process_due_reading_reminders_task.run()
        assert result == {"status": "skipped", "reason": "web_push_not_configured"}
