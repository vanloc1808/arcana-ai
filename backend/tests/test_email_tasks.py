"""
Tests for Email Tasks

This module contains unit tests for the email background tasks,
covering password reset, welcome emails, reminders, and bulk notifications.
"""

import pytest
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime, timedelta
from sqlalchemy.exc import IntegrityError

from tasks.email_tasks import (
    send_password_reset_email_task,
    send_welcome_email_task,
    send_reminder_email_task,
    send_system_notification_email_task,
    send_bulk_notification_email_task,
    _send_email_sync,
)
from models import PasswordResetToken, User
from tests.factories import UserFactory


class TestSendPasswordResetEmailTask:
    """Test suite for send_password_reset_email_task function."""

    @patch('tasks.email_tasks.SessionLocal')
    @patch('tasks.email_tasks.current_task')
    @patch('tasks.email_tasks._send_email_sync')
    def test_send_password_reset_success(self, mock_send_email, mock_current_task, mock_session_local):
        """Test successful password reset email sending."""
        # Mock database session
        mock_session = Mock()
        mock_session_local.return_value = mock_session

        # Mock user
        mock_user = Mock()
        mock_user.id = 1

        # Mock user query
        mock_session.query.return_value.filter.return_value.first.return_value = mock_user

        # Mock current task
        mock_current_task.request.id = "task_123"

        # Mock settings
        with patch('tasks.email_tasks.settings') as mock_settings:
            mock_settings.FRONTEND_URL = "http://localhost:3000"

            result = send_password_reset_email_task("test@example.com", "reset_token_123", 1)

        expected = {
            "status": "success",
            "message": "Password reset email sent successfully",
            "task_id": "task_123",
            "email": "test@example.com",
        }
        assert result == expected


class TestSendWelcomeEmailTask:
    """Test suite for send_welcome_email_task function."""

    @patch('tasks.email_tasks.current_task')
    @patch('tasks.email_tasks._send_email_sync')
    def test_send_welcome_email_success(self, mock_send_email, mock_current_task):
        """Test successful welcome email sending."""
        # Mock current task
        mock_current_task.request.id = "task_123"

        result = send_welcome_email_task("newuser@example.com", "newuser")

        expected = {
            "status": "success",
            "message": "Welcome email sent successfully",
            "task_id": "task_123",
            "email": "newuser@example.com",
            "username": "newuser",
        }
        assert result == expected


class TestSendReminderEmailTask:
    """Test suite for send_reminder_email_task function."""

    @patch('tasks.email_tasks.current_task')
    @patch('tasks.email_tasks._send_email_sync')
    def test_send_reminder_email_daily(self, mock_send_email, mock_current_task):
        """Test sending daily reminder email."""
        # Mock current task
        mock_current_task.request.id = "task_123"

        result = send_reminder_email_task("user@example.com", "username", "daily", 1)

        expected = {
            "status": "success",
            "message": "Reminder email sent successfully",
            "task_id": "task_123",
            "email": "user@example.com",
            "username": "username",
            "reminder_type": "daily",
        }
        assert result == expected


class TestSendSystemNotificationEmailTask:
    """Test suite for send_system_notification_email_task function."""

    @patch('tasks.email_tasks.current_task')
    @patch('tasks.email_tasks._send_email_sync')
    def test_send_system_notification_success(self, mock_send_email, mock_current_task):
        """Test successful system notification email sending."""
        # Mock current task
        mock_current_task.request.id = "task_123"

        emails = ["user1@example.com", "user2@example.com"]

        result = send_system_notification_email_task(
            emails=emails,
            subject="Test Notification",
            html_body="<p>Test message</p>",
            text_body="Test message"
        )

        expected = {
            "status": "completed",
            "message": "Sent 2 emails, 0 failed",
            "task_id": "task_123",
            "successful_sends": emails,
            "failed_sends": [],
            "total_emails": 2,
        }
        assert result == expected


class TestSendBulkNotificationEmailTask:
    """Test suite for send_bulk_notification_email_task function."""

    @patch('tasks.email_tasks.current_task')
    @patch('tasks.email_tasks._send_email_sync')
    def test_send_bulk_notification_success(self, mock_send_email, mock_current_task):
        """Test successful bulk notification email sending."""
        # Mock current task
        mock_current_task.request.id = "task_123"

        emails = ["user1@example.com", "user2@example.com"]

        result = send_bulk_notification_email_task(
            emails=emails,
            subject="Bulk Notification",
            html_body="<p>Bulk message</p>",
            text_body="Bulk message"
        )

        expected = {
            "status": "completed",
            "message": "Sent 2 emails, 0 failed",
            "task_id": "task_123",
            "successful_sends": emails,
            "failed_sends": [],
            "total_emails": 2,
        }
        assert result == expected


class TestSendEmailSync:
    """Test suite for _send_email_sync helper function."""

    @patch('tasks.email_tasks.settings')
    @patch('tasks.email_tasks.FastMail')
    @patch('tasks.email_tasks.inspect')
    def test_send_email_sync_not_awaitable(self, mock_inspect, mock_fastmail, mock_settings):
        """Test _send_email_sync when result is not awaitable."""
        # Mock message
        mock_message = Mock()

        # Mock FastMail
        mock_fm = Mock()
        mock_fastmail.return_value = mock_fm

        # Mock non-awaitable result
        mock_result = Mock()
        mock_fm.send_message.return_value = mock_result

        # Mock inspect.isawaitable to return False
        mock_inspect.isawaitable.return_value = False

        # Call function (should not raise exception)
        _send_email_sync(mock_message)

        # Verify FastMail was created and used
        mock_fastmail.assert_called_once()
        mock_fm.send_message.assert_called_once_with(mock_message)