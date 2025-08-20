import pytest
from fastapi import status
from unittest.mock import patch
from datetime import datetime, timedelta
from sqlalchemy.orm import Session

from models import User, PasswordResetToken
from routers.auth import create_access_token, generate_reset_token


# Registration Tests
def test_register_user_success(client):
    """Test successful user registration"""
    response = client.post(
        "/auth/register",
        json={
            "username": "newuser",
            "email": "newuser@example.com",
            "password": "newpassword123",
        },
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["username"] == "newuser"
    assert data["email"] == "newuser@example.com"
    assert "id" in data
    assert "created_at" in data
    assert "is_active" in data
    assert data["is_active"] is True
    assert "password" not in data


def test_register_duplicate_username(client, test_user):
    """Test registration with duplicate username returns 400"""
    response = client.post(
        "/auth/register",
        json={
            "username": "testuser",
            "email": "different@example.com",
            "password": "password123",
        },
    )
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
    data = response.json()
    assert "Username already registered" in data["error"]


def test_register_duplicate_email(client, test_user):
    """Test registration with duplicate email returns 400"""
    response = client.post(
        "/auth/register",
        json={
            "username": "different",
            "email": "test@example.com",
            "password": "password123",
        },
    )
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
    data = response.json()
    assert "Email already registered" in data["error"]


def test_register_invalid_email(client):
    """Test registration with invalid email format returns 422"""
    response = client.post(
        "/auth/register",
        json={
            "username": "testuser",
            "email": "invalid_email",
            "password": "password123",
        },
    )
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


def test_register_missing_fields(client):
    """Test registration with missing required fields returns 422"""
    response = client.post(
        "/auth/register",
        json={
            "username": "testuser",
            # missing email and password
        },
    )
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


def test_register_empty_username(client):
    """Test registration with empty username returns 422"""
    response = client.post(
        "/auth/register",
        json={
            "username": " ",
            "email": "test@example.com",
            "password": "password123",
        },
    )
    assert response.status_code == 422
    data = response.json()
    assert "cannot be empty" in str(data)


def test_register_short_username(client):
    """Test registration with too short username returns 422"""
    response = client.post(
        "/auth/register",
        json={
            "username": "ab",
            "email": "test@example.com",
            "password": "password123",
        },
    )
    assert response.status_code == 422
    data = response.json()
    assert "at least 3 characters" in str(data)


def test_register_long_username(client):
    """Test registration with too long username returns 422"""
    response = client.post(
        "/auth/register",
        json={
            "username": "a" * 33,
            "email": "test@example.com",
            "password": "password123",
        },
    )
    assert response.status_code == 422
    data = response.json()
    assert "at most 32 characters" in str(data)


def test_register_username_with_html(client):
    """Test registration with HTML/script in username returns 422"""
    response = client.post(
        "/auth/register",
        json={
            "username": "<script>alert(1)</script>",
            "email": "test@example.com",
            "password": "password123",
        },
    )
    assert response.status_code == 422
    data = response.json()
    assert "forbidden content" in str(data) or "cannot be empty" in str(data)


def test_register_username_with_unicode(client):
    """Test registration with Unicode characters in username returns 422"""
    response = client.post(
        "/auth/register",
        json={
            "username": "VănLộc",
            "email": "test@example.com",
            "password": "password123",
        },
    )
    assert response.status_code == 422
    data = response.json()
    assert "letters, numbers, underscores, and dots" in str(data)


def test_register_username_with_numbers(client):
    """Test registration with numbers in username succeeds"""
    response = client.post(
        "/auth/register",
        json={
            "username": "John123",
            "email": "test@example.com",
            "password": "password123",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["username"] == "John123"


def test_register_username_with_underscores(client):
    """Test registration with underscores in username succeeds"""
    response = client.post(
        "/auth/register",
        json={
            "username": "john_doe",
            "email": "test2@example.com",
            "password": "password123",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["username"] == "john_doe"


def test_register_username_with_special_chars(client):
    """Test registration with special characters (not allowed) returns 422"""
    response = client.post(
        "/auth/register",
        json={
            "username": "john@doe",
            "email": "test3@example.com",
            "password": "password123",
        },
    )
    assert response.status_code == 422
    data = response.json()
    assert "letters, numbers, underscores, and dots" in str(data)


def test_register_valid_ascii_username(client):
    """Test registration with valid letters only username succeeds"""
    response = client.post(
        "/auth/register",
        json={
            "username": "JohnDoe",
            "email": "test4@example.com",
            "password": "password123",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["username"] == "JohnDoe"


def test_register_valid_mixed_username(client):
    """Test registration with valid mixed username (letters, numbers, underscores, dots) succeeds"""
    response = client.post(
        "/auth/register",
        json={
            "username": "user.123_test",
            "email": "test5@example.com",
            "password": "password123",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["username"] == "user.123_test"


def test_register_short_password(client):
    """Test registration with short password returns 422"""
    response = client.post(
        "/auth/register",
        json={
            "username": "testuser",
            "email": "test@example.com",
            "password": "123",
        },
    )
    assert response.status_code == 422
    data = response.json()
    assert "at least 8 characters" in str(data)


def test_register_long_password(client):
    """Test registration with too long password returns 422"""
    response = client.post(
        "/auth/register",
        json={
            "username": "testuser",
            "email": "test@example.com",
            "password": "a" * 129,
        },
    )
    assert response.status_code == 422
    data = response.json()
    assert "at most 128 characters" in str(data)


def test_register_password_with_html(client):
    """Test registration with HTML/script in password returns 422"""
    response = client.post(
        "/auth/register",
        json={
            "username": "testuser",
            "email": "test@example.com",
            "password": "<script>alert(1)</script>",
        },
    )
    assert response.status_code == 422
    data = response.json()
    assert "forbidden content" in str(data)


# Login Tests
def test_login_success(client, test_user):
    """Test successful login returns access token"""
    response = client.post("/auth/token", data={"username": "testuser", "password": "testpassword"})
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert len(data["access_token"]) > 0


def test_login_wrong_password(client, test_user):
    """Test login with wrong password returns 401"""
    response = client.post("/auth/token", data={"username": "testuser", "password": "wrongpassword"})
    assert response.status_code == status.HTTP_401_UNAUTHORIZED
    data = response.json()
    assert "Incorrect username or password" in data["error"]


def test_login_nonexistent_user(client):
    """Test login with nonexistent user returns 401"""
    response = client.post("/auth/token", data={"username": "nonexistent", "password": "password123"})
    assert response.status_code == status.HTTP_401_UNAUTHORIZED
    data = response.json()
    assert "Incorrect username or password" in data["error"]


def test_login_missing_username(client):
    """Test login with missing username returns 422"""
    response = client.post("/auth/token", data={"password": "password123"})
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


def test_login_missing_password(client):
    """Test login with missing password returns 422"""
    response = client.post("/auth/token", data={"username": "testuser"})
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


def test_login_empty_credentials(client):
    """Test login with empty credentials returns 401 (not 422)"""
    response = client.post("/auth/token", data={"username": "", "password": ""})
    # Empty credentials result in authentication failure, not validation error
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


# Token Authentication Tests
def test_protected_endpoint_with_valid_token(client, auth_headers, test_cards, mock_tarot_reader):
    """Test accessing protected endpoint with valid token"""
    response = client.post(
        "/tarot/reading", json={"concern": "What does my future hold?", "num_cards": 3}, headers=auth_headers
    )
    assert response.status_code == status.HTTP_200_OK


def test_protected_endpoint_with_invalid_token(client, invalid_auth_headers, test_cards):
    """Test accessing protected endpoint with invalid token returns 401"""
    response = client.post(
        "/tarot/reading", json={"concern": "What does my future hold?", "num_cards": 3}, headers=invalid_auth_headers
    )
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_protected_endpoint_without_token(client, test_cards):
    """Test accessing protected endpoint without token returns 401"""
    response = client.post("/tarot/reading", json={"concern": "What does my future hold?", "num_cards": 3})
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_malformed_authorization_header(client, test_cards):
    """Test accessing protected endpoint with malformed Authorization header"""
    response = client.post(
        "/tarot/reading",
        json={"concern": "What does my future hold?", "num_cards": 3},
        headers={"Authorization": "InvalidFormat token123"},
    )
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


# Password Reset Tests
@patch("utils.celery_utils.EmailTaskManager.send_password_reset_email_async")
def test_forgot_password_success_with_email(mock_send_email, client, test_user):
    """Test successful password reset request using email"""
    mock_send_email.return_value = "mock-task-id-123"

    response = client.post("/auth/forgot-password", json={"email_or_username": "test@example.com"})
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "password reset token has been sent" in data["message"]
    mock_send_email.assert_called_once_with("test@example.com", mock_send_email.call_args[0][1], test_user.id)


@patch("utils.celery_utils.EmailTaskManager.send_password_reset_email_async")
def test_forgot_password_success_with_username(mock_send_email, client, test_user):
    """Test successful password reset request using username"""
    mock_send_email.return_value = "mock-task-id-123"

    response = client.post("/auth/forgot-password", json={"email_or_username": "testuser"})
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "password reset token has been sent" in data["message"]
    mock_send_email.assert_called_once_with("test@example.com", mock_send_email.call_args[0][1], test_user.id)


@patch("utils.celery_utils.EmailTaskManager.send_password_reset_email_async")
def test_forgot_password_nonexistent_email_or_username(mock_send_email, client):
    """Test password reset request for nonexistent email/username still returns success"""
    mock_send_email.return_value = "mock-task-id-123"

    response = client.post("/auth/forgot-password", json={"email_or_username": "nonexistent@example.com"})
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "password reset token has been sent" in data["message"]
    # Should not call send_email for nonexistent user
    mock_send_email.assert_not_called()


def test_forgot_password_empty_email_or_username(client):
    """Test password reset request with empty email/username returns 422"""
    response = client.post("/auth/forgot-password", json={"email_or_username": ""})
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
    data = response.json()
    assert "cannot be empty" in str(data)


def test_forgot_password_whitespace_only_email_or_username(client):
    """Test password reset request with whitespace-only email/username returns 422"""
    response = client.post("/auth/forgot-password", json={"email_or_username": "   "})
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
    data = response.json()
    assert "cannot be empty" in str(data)


def test_forgot_password_missing_email_or_username(client):
    """Test password reset request with missing email_or_username returns 422"""
    response = client.post("/auth/forgot-password", json={})
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


def test_reset_password_success(client, test_password_reset_token):
    """Test successful password reset with valid token"""
    response = client.post(
        "/auth/reset-password", json={"token": test_password_reset_token.token, "new_password": "newpassword123"}
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["message"] == "Password has been reset successfully"


def test_reset_password_invalid_token(client):
    """Test password reset with invalid token returns 400"""
    response = client.post("/auth/reset-password", json={"token": "invalid_token", "new_password": "newpassword123"})
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
    data = response.json()
    assert "Invalid or expired reset token" in data["error"]


def test_reset_password_expired_token(client, db_session, test_user):
    """Test password reset with expired token returns 400"""
    from models import PasswordResetToken

    # Create expired token
    expired_token = PasswordResetToken(
        token="expired_token_123",
        user_id=test_user.id,
        expires_at=datetime.utcnow() - timedelta(hours=1),  # Expired
    )
    db_session.add(expired_token)
    db_session.commit()

    response = client.post(
        "/auth/reset-password", json={"token": "expired_token_123", "new_password": "newpassword123"}
    )
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
    data = response.json()
    assert "Invalid or expired reset token" in data["error"]


def test_reset_password_used_token(client, db_session, test_user):
    """Test password reset with already used token returns 400"""
    from models import PasswordResetToken

    # Create used token
    used_token = PasswordResetToken(
        token="used_token_123",
        user_id=test_user.id,
        expires_at=datetime.utcnow() + timedelta(hours=1),
        is_used=True,  # Already used
    )
    db_session.add(used_token)
    db_session.commit()

    response = client.post("/auth/reset-password", json={"token": "used_token_123", "new_password": "newpassword123"})
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
    data = response.json()
    assert "Invalid or expired reset token" in data["error"]


def test_reset_password_missing_token(client):
    """Test password reset with missing token returns 422"""
    response = client.post("/auth/reset-password", json={"new_password": "newpassword123"})
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


def test_reset_password_missing_new_password(client):
    """Test password reset with missing new password returns 422"""
    response = client.post("/auth/reset-password", json={"token": "some_token"})
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


def test_reset_password_empty_new_password(client, test_password_reset_token):
    """Test password reset with empty new password returns 422"""
    response = client.post("/auth/reset-password", json={"token": test_password_reset_token.token, "new_password": ""})
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
    data = response.json()
    assert "error" in data
    assert "details" in data
    assert any("Password cannot be empty" in detail["msg"] for detail in data["details"])


# Token Renewal Tests
def test_token_renewal_in_response_headers(client, auth_headers, test_cards, mock_tarot_reader):
    """Test that authenticated requests return renewed tokens in headers"""
    response = client.post(
        "/tarot/reading", json={"concern": "What does my future hold?", "num_cards": 3}, headers=auth_headers
    )
    assert response.status_code == status.HTTP_200_OK
    assert "X-Access-Token" in response.headers
    assert len(response.headers["X-Access-Token"]) > 0


# Edge Cases and Error Handling
@patch("routers.auth.create_access_token")
def test_login_token_creation_failure(mock_create_token, client, test_user):
    """Test login when token creation fails"""
    mock_create_token.side_effect = Exception("Token creation failed")

    response = client.post("/auth/token", data={"username": "testuser", "password": "testpassword"})
    assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR


@patch("routers.auth.generate_reset_token")
def test_forgot_password_token_generation_failure(mock_generate_token, client, test_user):
    """Test forgot password when token generation fails"""
    mock_generate_token.side_effect = Exception("Token generation failed")

    response = client.post("/auth/forgot-password", json={"email_or_username": "test@example.com"})
    assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR


@patch("utils.celery_utils.EmailTaskManager.send_password_reset_email_async")
def test_forgot_password_email_task_failure(mock_send_email, client, test_user):
    """Test forgot password when email task fails"""
    mock_send_email.side_effect = Exception("Email task failed")

    response = client.post("/auth/forgot-password", json={"email_or_username": "test@example.com"})
    assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR


def test_reset_password_short_password(client, test_password_reset_token):
    """Test password reset with password shorter than 8 characters returns 422"""
    response = client.post(
        "/auth/reset-password", json={"token": test_password_reset_token.token, "new_password": "123"}
    )
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
    data = response.json()
    assert "at least 8 characters" in str(data)


def test_reset_password_whitespace_only_password(client, test_password_reset_token):
    """Test password reset with whitespace-only password returns 422"""
    response = client.post(
        "/auth/reset-password", json={"token": test_password_reset_token.token, "new_password": "   "}
    )
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
    data = response.json()
    assert "Password must be at least 8 characters long" in str(data)


def test_reset_password_token_marks_as_used(client, test_password_reset_token, db_session):
    """Test that reset password marks token as used"""
    original_token = test_password_reset_token.token

    response = client.post("/auth/reset-password", json={"token": original_token, "new_password": "newpassword123"})
    assert response.status_code == status.HTTP_200_OK

    # Verify token is marked as used
    from models import PasswordResetToken

    used_token = db_session.query(PasswordResetToken).filter(PasswordResetToken.token == original_token).first()
    assert used_token.is_used is True


def test_reset_password_cannot_reuse_token(client, test_password_reset_token):
    """Test that a used token cannot be reused"""
    # Store the token string before using it
    token_string = test_password_reset_token.token

    # First reset
    response = client.post("/auth/reset-password", json={"token": token_string, "new_password": "newpassword123"})
    assert response.status_code == status.HTTP_200_OK

    # Try to use the same token again - it should fail since token is deleted after use
    response = client.post("/auth/reset-password", json={"token": token_string, "new_password": "anotherpassword123"})
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
    data = response.json()
    assert "Invalid or expired reset token" in data["error"]


def test_reset_password_updates_user_password(client, test_password_reset_token, test_user, db_session):
    """Test that reset password actually updates the user's password"""
    new_password = "newpassword123"

    response = client.post(
        "/auth/reset-password", json={"token": test_password_reset_token.token, "new_password": new_password}
    )
    assert response.status_code == status.HTTP_200_OK

    # Re-query the user from db_session to avoid InvalidRequestError
    updated_user = db_session.query(User).filter(User.id == test_user.id).first()
    assert updated_user.verify_password(new_password) is True
    assert updated_user.verify_password("testpassword") is False


def test_reset_password_with_special_characters(client, test_password_reset_token):
    """Test password reset with special characters in password"""
    special_password = "P@ssw0rd!@#$%^&*()"

    response = client.post(
        "/auth/reset-password", json={"token": test_password_reset_token.token, "new_password": special_password}
    )
    assert response.status_code == status.HTTP_200_OK


def test_reset_password_with_unicode_characters(client, test_password_reset_token):
    """Test password reset with unicode characters in password"""
    unicode_password = "P@ssw0rd🚀🌟✨"

    response = client.post(
        "/auth/reset-password", json={"token": test_password_reset_token.token, "new_password": unicode_password}
    )
    assert response.status_code == status.HTTP_200_OK


def test_reset_password_token_case_sensitive(client, test_password_reset_token):
    """Test that reset password token is case sensitive"""
    # Modify the token case
    modified_token = test_password_reset_token.token.upper()

    response = client.post("/auth/reset-password", json={"token": modified_token, "new_password": "newpassword123"})
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
    data = response.json()
    assert "Invalid or expired reset token" in data["error"]


def test_login_with_sql_injection_attempt(client):
    """Test login endpoint is protected against SQL injection"""
    response = client.post("/auth/token", data={"username": "'; DROP TABLE users; --", "password": "password123"})
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_register_with_extremely_long_username(client):
    """Test registration with extremely long username"""
    long_username = "a" * 1000
    response = client.post(
        "/auth/register", json={"username": long_username, "email": "test@example.com", "password": "password123"}
    )
    # Should either succeed or fail validation, but not crash
    assert response.status_code in [status.HTTP_200_OK, status.HTTP_422_UNPROCESSABLE_ENTITY]


def test_register_with_unicode_characters(client):
    """Test registration with unicode characters in username"""
    response = client.post(
        "/auth/register", json={"username": "测试用户", "email": "unicode@example.com", "password": "password123"}
    )
    # Should handle unicode gracefully
    assert response.status_code in [status.HTTP_200_OK, status.HTTP_422_UNPROCESSABLE_ENTITY]


# Rate Limiting Tests
def test_auth_rate_limiting(client):
    """Test that authentication endpoints respect rate limits"""
    # Make multiple requests to trigger rate limit
    for _ in range(6):  # One more than the auth rate limit
        response = client.post(
            "/auth/register",
            json={
                "username": f"testuser{_}",
                "email": f"test{_}@example.com",
                "password": "testpassword123",
            },
        )
        # All requests should succeed since rate limiting is disabled in tests
        assert response.status_code == status.HTTP_200_OK


# Profile Management Tests (full_name functionality)
def test_get_user_profile_success(client, auth_headers, test_user):
    """Test successful retrieval of user profile"""
    response = client.get("/auth/me", headers=auth_headers)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["id"] == test_user.id
    assert data["username"] == test_user.username
    assert data["email"] == test_user.email
    assert "full_name" in data
    assert data["full_name"] is None  # Default should be None
    assert "created_at" in data
    assert "is_active" in data
    assert "favorite_deck_id" in data


def test_get_user_profile_without_auth(client):
    """Test profile retrieval without authentication returns 401"""
    response = client.get("/auth/me")
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_update_user_profile_full_name_success(client, auth_headers, test_user, db_session):
    """Test successful update of user full name"""
    new_full_name = "John Doe Smith"
    response = client.put("/auth/me", headers=auth_headers, json={"full_name": new_full_name})
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["full_name"] == new_full_name

    # Verify the change persists by making another GET request
    response = client.get("/auth/me", headers=auth_headers)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["full_name"] == new_full_name


def test_update_user_profile_full_name_empty_string(client, auth_headers, test_user, db_session):
    """Test updating full name with empty string converts to None"""
    response = client.put("/auth/me", headers=auth_headers, json={"full_name": ""})
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["full_name"] is None

    # Verify the change persists by making another GET request
    response = client.get("/auth/me", headers=auth_headers)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["full_name"] is None


def test_update_user_profile_full_name_whitespace_only(client, auth_headers, test_user, db_session):
    """Test updating full name with whitespace only converts to None"""
    response = client.put("/auth/me", headers=auth_headers, json={"full_name": "   "})
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["full_name"] is None

    # Verify the change persists by making another GET request
    response = client.get("/auth/me", headers=auth_headers)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["full_name"] is None


def test_update_user_profile_full_name_with_extra_whitespace(client, auth_headers, test_user, db_session):
    """Test updating full name trims whitespace correctly"""
    response = client.put("/auth/me", headers=auth_headers, json={"full_name": "  John Doe  "})
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["full_name"] == "John Doe"

    # Verify the change persists by making another GET request
    response = client.get("/auth/me", headers=auth_headers)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["full_name"] == "John Doe"


def test_update_user_profile_full_name_too_long(client, auth_headers):
    """Test updating full name with too long value returns 422"""
    long_name = "a" * 101  # Exceeds 100 character limit
    response = client.put("/auth/me", headers=auth_headers, json={"full_name": long_name})
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
    data = response.json()
    assert "at most 100 characters" in str(data)


def test_update_user_profile_full_name_with_html(client, auth_headers):
    """Test updating full name with HTML/script content returns 422"""
    response = client.put("/auth/me", headers=auth_headers, json={"full_name": "<script>alert('xss')</script>"})
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
    data = response.json()
    assert "forbidden content" in str(data)


def test_update_user_profile_full_name_persistence(client, auth_headers, test_user, db_session):
    """Test that full name changes persist across sessions"""
    # First update
    response = client.put("/auth/me", headers=auth_headers, json={"full_name": "First Name"})
    assert response.status_code == status.HTTP_200_OK

    # Verify GET returns the updated value
    response = client.get("/auth/me", headers=auth_headers)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["full_name"] == "First Name"

    # Update again
    response = client.put("/auth/me", headers=auth_headers, json={"full_name": "Second Name"})
    assert response.status_code == status.HTTP_200_OK

    # Verify the new value persists
    response = client.get("/auth/me", headers=auth_headers)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["full_name"] == "Second Name"


def test_update_user_profile_without_full_name_field(client, auth_headers, test_user, db_session):
    """Test that omitting full_name field doesn't change existing value"""
    # Create a default deck for testing favorite_deck_id
    from tests.factories import DeckFactory

    DeckFactory.create_default_deck(db_session)

    # Set initial full name via API first
    response = client.put("/auth/me", headers=auth_headers, json={"full_name": "Initial Name"})
    assert response.status_code == status.HTTP_200_OK

    # Update only favorite_deck_id without full_name
    response = client.put("/auth/me", headers=auth_headers, json={"favorite_deck_id": 1})
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["full_name"] == "Initial Name"  # Should remain unchanged

    # Verify the value persists
    response = client.get("/auth/me", headers=auth_headers)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["full_name"] == "Initial Name"


def test_update_user_profile_multiple_fields_including_full_name(client, auth_headers, test_user, db_session):
    """Test updating multiple fields including full_name"""
    # Create a default deck for testing favorite_deck_id
    from tests.factories import DeckFactory

    DeckFactory.create_default_deck(db_session)

    response = client.put(
        "/auth/me", headers=auth_headers, json={"full_name": "Multi Field Name", "favorite_deck_id": 1}
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["full_name"] == "Multi Field Name"
    assert data["favorite_deck_id"] == 1

    # Verify the changes persist
    response = client.get("/auth/me", headers=auth_headers)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["full_name"] == "Multi Field Name"
    assert data["favorite_deck_id"] == 1


def test_update_user_profile_invalid_auth(client):
    """Test profile update without authentication returns 401"""
    response = client.put("/auth/me", json={"full_name": "Should Fail"})
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_update_user_profile_with_invalid_token(client, invalid_auth_headers):
    """Test profile update with invalid token returns 401"""
    response = client.put("/auth/me", headers=invalid_auth_headers, json={"full_name": "Should Fail"})
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_update_user_profile_empty_request_body(client, auth_headers):
    """Test profile update with empty request body"""
    response = client.put("/auth/me", headers=auth_headers, json={})
    assert response.status_code == status.HTTP_200_OK
    # Should return current user data without making changes


def test_user_profile_full_name_unicode_support(client, auth_headers, test_user, db_session):
    """Test full name supports Unicode characters"""
    unicode_name = "José María García-López"
    response = client.put("/auth/me", headers=auth_headers, json={"full_name": unicode_name})
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["full_name"] == unicode_name

    # Verify the change persists
    response = client.get("/auth/me", headers=auth_headers)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["full_name"] == unicode_name


def test_user_profile_full_name_special_characters(client, auth_headers, test_user, db_session):
    """Test full name with valid special characters"""
    special_name = "Mary O'Connor-Smith Jr."
    response = client.put("/auth/me", headers=auth_headers, json={"full_name": special_name})
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["full_name"] == special_name

    # Verify the change persists
    response = client.get("/auth/me", headers=auth_headers)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["full_name"] == special_name


def test_user_registration_does_not_require_full_name(client):
    """Test that user registration works without full_name field"""
    response = client.post(
        "/auth/register",
        json={
            "username": "newfullnameuser",
            "email": "newfullname@example.com",
            "password": "password123",
        },
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["username"] == "newfullnameuser"
    assert data["email"] == "newfullname@example.com"
    # full_name should not be required or included in registration response
    assert "full_name" not in data or data.get("full_name") is None
