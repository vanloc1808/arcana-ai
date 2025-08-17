import pytest
from unittest.mock import patch, MagicMock
from datetime import datetime, timedelta
from tasks.email_tasks import send_password_reset_email_task
from tests.factories import UserFactory, PasswordResetTokenFactory


@pytest.fixture
def mock_fastmail():
    """Mock FastMail for email testing"""
    with patch("tasks.email_tasks.FastMail") as mock_fm:
        mock_instance = MagicMock()
        mock_fm.return_value = mock_instance
        yield mock_instance


@pytest.fixture
def mock_settings():
    """Mock settings for email testing"""
    with patch("tasks.email_tasks.settings") as mock_settings:
        mock_settings.email_config = MagicMock()
        mock_settings.FRONTEND_URL = "http://localhost:3000"
        yield mock_settings


class TestPasswordResetEmailTask:
    """Test suite for password reset email task"""

    def test_send_password_reset_email_success(self, db_session, mock_fastmail, mock_settings):
        """Test successful password reset email sending"""
        # Create test user
        user = UserFactory.create(db=db_session, username="testuser", email="test@example.com")
        user_id = user.id  # Store user ID to avoid detached instance error

        # Create test token
        token = "test_token_123"

        # Mock the task context and SessionLocal
        with (
            patch("tasks.email_tasks.current_task") as mock_task,
            patch("tasks.email_tasks.SessionLocal") as mock_session_local,
        ):
            mock_task.request.id = "test-task-id"
            mock_session_local.return_value = db_session

            # Execute the task
            result = send_password_reset_email_task(email="test@example.com", token=token, user_id=user_id)

        # Verify result
        assert result["status"] == "success"
        assert result["message"] == "Password reset email sent successfully"
        assert result["task_id"] == "test-task-id"
        assert result["email"] == "test@example.com"

        # Verify email was sent
        mock_fastmail.send_message.assert_called_once()

        # Verify token was stored in database
        from models import PasswordResetToken

        stored_token = (
            db_session.query(PasswordResetToken)
            .filter(PasswordResetToken.user_id == user_id, PasswordResetToken.token == token)
            .first()
        )
        assert stored_token is not None
        assert stored_token.expires_at > datetime.utcnow()

    def test_send_password_reset_email_without_user_id(self, db_session, mock_fastmail, mock_settings):
        """Test password reset email when user_id is not provided"""
        # Create test user
        user = UserFactory.create(db=db_session, username="testuser", email="test@example.com")
        user_id = user.id  # Store user ID to avoid detached instance error

        token = "test_token_456"

        with (
            patch("tasks.email_tasks.current_task") as mock_task,
            patch("tasks.email_tasks.SessionLocal") as mock_session_local,
        ):
            mock_task.request.id = "test-task-id"
            mock_session_local.return_value = db_session

            # Execute the task without user_id
            result = send_password_reset_email_task(email="test@example.com", token=token, user_id=None)

        # Verify result
        assert result["status"] == "success"

        # Verify token was stored
        from models import PasswordResetToken

        stored_token = (
            db_session.query(PasswordResetToken)
            .filter(PasswordResetToken.user_id == user_id, PasswordResetToken.token == token)
            .first()
        )
        assert stored_token is not None

    def test_send_password_reset_email_nonexistent_user(self, db_session, mock_fastmail, mock_settings):
        """Test password reset email for nonexistent user"""
        token = "test_token_789"

        with patch("tasks.email_tasks.current_task") as mock_task:
            mock_task.request.id = "test-task-id"

            # Execute the task for nonexistent user
            result = send_password_reset_email_task(email="nonexistent@example.com", token=token, user_id=None)

        # Verify result
        assert result["status"] == "success"

        # Verify no token was stored
        from models import PasswordResetToken

        stored_token = db_session.query(PasswordResetToken).filter(PasswordResetToken.token == token).first()
        assert stored_token is None

    def test_send_password_reset_email_fastmail_failure(self, db_session, mock_fastmail, mock_settings):
        """Test password reset email when FastMail fails"""
        user = UserFactory.create(db=db_session, username="testuser", email="test@example.com")

        token = "test_token_fail"

        # Mock FastMail to raise an exception
        mock_fastmail.send_message.side_effect = Exception("SMTP connection failed")

        with patch("tasks.email_tasks.current_task") as mock_task:
            mock_task.request.id = "test-task-id"

            # Execute the task and expect it to retry
            with pytest.raises(Exception):
                send_password_reset_email_task(email="test@example.com", token=token, user_id=user.id)

    def test_send_password_reset_email_database_failure(self, db_session, mock_fastmail, mock_settings):
        """Test password reset email when database operations fail"""
        user = UserFactory.create(db=db_session, username="testuser", email="test@example.com")

        token = "test_token_db_fail"

        # Mock database session to raise an exception
        with patch("tasks.email_tasks.SessionLocal") as mock_session_local:
            mock_session = MagicMock()
            mock_session_local.return_value = mock_session
            mock_session.query.side_effect = Exception("Database connection failed")

            with patch("tasks.email_tasks.current_task") as mock_task:
                mock_task.request.id = "test-task-id"

                # Execute the task and expect it to retry
                with pytest.raises(Exception):
                    send_password_reset_email_task(email="test@example.com", token=token, user_id=user.id)

    def test_send_password_reset_email_message_content(self, db_session, mock_fastmail, mock_settings):
        """Test that password reset email contains correct content"""
        user = UserFactory.create(db=db_session, username="testuser", email="test@example.com")

        token = "test_token_content"

        with (
            patch("tasks.email_tasks.current_task") as mock_task,
            patch("tasks.email_tasks.SessionLocal") as mock_session_local,
        ):
            mock_task.request.id = "test-task-id"
            mock_session_local.return_value = db_session

            send_password_reset_email_task(email="test@example.com", token=token, user_id=user.id)

        # Verify email message content
        mock_fastmail.send_message.assert_called_once()
        call_args = mock_fastmail.send_message.call_args[0][0]

        # Check message schema
        assert call_args.subject == "Password Reset Request - ArcanaAI"
        assert call_args.recipients == ["test@example.com"]

        # Check HTML content (available via the 'body' attribute when subtype is html)
        html_body = call_args.body
        assert "Password Reset Request" in html_body
        assert "Reset Your Password" in html_body
        assert "http://localhost:3000/password-reset-confirm?token=test_token_content" in html_body
        assert "This link will expire in 1 hour" in html_body

        # Since subtype is html, the body contains HTML content
        # No need to check separate text content as the body is the HTML content

    def test_send_password_reset_email_custom_frontend_url(self, db_session, mock_fastmail):
        """Test password reset email with custom frontend URL"""
        user = UserFactory.create(db=db_session, username="testuser", email="test@example.com")

        token = "test_token_custom_url"

        # Mock settings with custom frontend URL
        with patch("tasks.email_tasks.settings") as mock_settings:
            mock_settings.email_config = MagicMock()
            mock_settings.FRONTEND_URL = "https://myapp.com"

            with patch("tasks.email_tasks.current_task") as mock_task:
                mock_task.request.id = "test-task-id"

                send_password_reset_email_task(email="test@example.com", token=token, user_id=user.id)

        # Verify custom URL in email
        call_args = mock_fastmail.send_message.call_args[0][0]
        html_body = call_args.body
        assert "https://myapp.com/password-reset-confirm?token=test_token_custom_url" in html_body

    def test_send_password_reset_email_token_expiration(self, db_session, mock_fastmail, mock_settings):
        """Test that password reset token has correct expiration time"""
        user = UserFactory.create(db=db_session, username="testuser", email="test@example.com")

        token = "test_token_expiration"

        with (
            patch("tasks.email_tasks.current_task") as mock_task,
            patch("tasks.email_tasks.SessionLocal") as mock_session_local,
        ):
            mock_task.request.id = "test-task-id"
            mock_session_local.return_value = db_session

            send_password_reset_email_task(email="test@example.com", token=token, user_id=user.id)

        # Verify token expiration
        from models import PasswordResetToken

        stored_token = db_session.query(PasswordResetToken).filter(PasswordResetToken.token == token).first()

        assert stored_token is not None
        # Token should expire in approximately 1 hour
        expected_expiry = datetime.utcnow() + timedelta(hours=1)
        assert stored_token.expires_at > datetime.utcnow()
        assert stored_token.expires_at < expected_expiry + timedelta(minutes=5)  # Allow some tolerance
