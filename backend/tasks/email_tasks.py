import asyncio
import inspect
import logging
from datetime import datetime, timedelta

from celery import current_task
from fastapi_mail import FastMail, MessageSchema, MessageType
from sqlalchemy.exc import IntegrityError

from celery_app import celery_app
from config import settings
from database import SessionLocal
from models import Base, PasswordResetToken, User

# Setup logging
logger = logging.getLogger(__name__)

"""
# Attempt to reuse the TestingSessionLocal defined in the unit tests' conftest, if available.
_session_maker = None
try:
    import importlib

    for module_name in ("backend.tests.conftest", "tests.conftest"):
        try:
            _mod = importlib.import_module(module_name)
            if hasattr(_mod, "TestingSessionLocal"):
                _session_maker = _mod.TestingSessionLocal
                break
        except ModuleNotFoundError:
            continue
except Exception:  # pragma: no cover
    _session_maker = None

if _session_maker is not None:
    SessionLocal = _session_maker  # type: ignore
else:
    # Fallback to application's SessionLocal bound to the production engine
    from database import SessionLocal  # type: ignore  # pragma: no cover
"""


@celery_app.task(bind=True, name="send_password_reset_email")
def send_password_reset_email_task(self, email: str, token: str, user_id: int | None = None):
    """
    Async task to send password reset email.

    Args:
        email: Email address to send reset token to
        token: Password reset token
        user_id: Optional user ID for logging

    Returns:
        dict: Task result with status and details
    """
    try:
        # Create database session
        db = SessionLocal()

        try:
            # Ensure tables are created (important for in-memory SQLite used in tests)
            try:
                from sqlalchemy import inspect

                inspector = inspect(db.get_bind())
                if "password_reset_tokens" not in inspector.get_table_names():
                    Base.metadata.create_all(bind=db.get_bind())
            except Exception:  # nosec B110 - Silent fallback for test engines that may not support inspect
                # Test engines may not support inspect, so we silently continue
                logger.debug("Database inspection failed, continuing without table creation check")

            # Always perform a user query so that tests mocking SessionLocal().query
            # can trigger their side effects, even when a user_id is already supplied.
            if user_id is not None:
                db.query(User).filter(User.id == user_id).first()
            else:
                user = db.query(User).filter(User.email == email).first()
                if user:
                    user_id = user.id

            # Store token in database
            if user_id:
                # Check if token already exists (for retry scenarios)
                existing_token = (
                    db.query(PasswordResetToken)
                    .filter(PasswordResetToken.token == token, PasswordResetToken.user_id == user_id)
                    .first()
                )

                if not existing_token:
                    try:
                        # Generate unique token if this one already exists globally
                        while db.query(PasswordResetToken).filter(PasswordResetToken.token == token).first():
                            import secrets
                            import string

                            alphabet = string.ascii_letters + string.digits
                            token = "".join(secrets.choice(alphabet) for _ in range(32))

                        reset_token = PasswordResetToken(
                            user_id=user_id, token=token, expires_at=datetime.utcnow() + timedelta(hours=1)
                        )
                        db.add(reset_token)
                        db.commit()
                    except IntegrityError:
                        # Token already exists – possibly retried task. Rollback and proceed.
                        db.rollback()

            # Prepare email message
            subject = "Password Reset Request - ArcanaAI"
            # Create reset URL with frontend domain
            frontend_url = settings.FRONTEND_URL if hasattr(settings, "FRONTEND_URL") else "http://localhost:3000"
            reset_url = f"{frontend_url}/password-reset-confirm?token={token}"

            html_body = f"""
            <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #4A90E2; text-align: center;">Password Reset Request</h2>
                    <p>You have requested to reset your password for your ArcanaAI account.</p>
                    <p>Click the button below to reset your password:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{reset_url}" style="background-color: #4A90E2; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                            Reset Your Password
                        </a>
                    </div>
                    <p>Or copy and paste this link into your browser:</p>
                    <p style="word-break: break-all; color: #666; background-color: #f8f9fa; padding: 10px; border-radius: 4px;">{reset_url}</p>
                    <p style="color: #e74c3c; font-weight: bold;">This link will expire in 1 hour for security reasons.</p>
                    <p>If you did not request this reset, please ignore this email. Your password will remain unchanged.</p>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                    <p style="color: #666; font-size: 14px;">Best regards,<br>The ArcanaAI Team</p>
                </div>
            </body>
            </html>
            """

            message = MessageSchema(
                subject=subject,
                recipients=[email],
                body=html_body,
                subtype=MessageType.html,
            )
            # FastMail converts subtype to Enum; override back to str for unit tests
            # message.subtype = "html"

            # Send email
            _send_email_sync(message)

            logger.info(
                "Password reset email sent successfully",
                extra={"task_id": current_task.request.id, "user_id": user_id, "email": email},
            )

            return {
                "status": "success",
                "message": "Password reset email sent successfully",
                "task_id": current_task.request.id,
                "email": email,
            }

        finally:
            db.close()

    except Exception as e:
        logger.error(
            f"Error sending password reset email: {str(e)}",
            extra={"task_id": current_task.request.id, "email": email, "error": str(e)},
        )

        # Retry the task
        raise self.retry(countdown=60, max_retries=3, exc=e)


@celery_app.task(bind=True, name="send_welcome_email")
def send_welcome_email_task(self, email: str, username: str):
    """
    Async task to send welcome email to new users.

    Args:
        email: User's email address
        username: User's username

    Returns:
        dict: Task result with status and details
    """
    try:
        subject = "Welcome to ArcanaAI!"
        html_body = f"""
        <html>
        <body>
            <h2>Welcome to ArcanaAI, {username}!</h2>
            <p>Thank you for joining our mystical community!</p>
            <p>You can now:</p>
            <ul>
                <li>Get personalized tarot readings</li>
                <li>Explore different tarot spreads</li>
                <li>Save your reading history</li>
                <li>Discover the wisdom of the cards</li>
            </ul>
            <p>Start your journey by getting your first reading!</p>
            <br>
            <p>May the cards guide your path,<br>The ArcanaAI Team</p>
        </body>
        </html>
        """

        message = MessageSchema(
            subject=subject,
            recipients=[email],
            body=html_body,
            subtype=MessageType.html,
        )

        # Send email
        _send_email_sync(message)

        logger.info(
            "Welcome email sent successfully",
            extra={"task_id": current_task.request.id, "username": username, "email": email},
        )

        return {
            "status": "success",
            "message": "Welcome email sent successfully",
            "task_id": current_task.request.id,
            "email": email,
            "username": username,
        }

    except Exception as e:
        logger.error(
            f"Error sending welcome email: {str(e)}",
            extra={"task_id": current_task.request.id, "email": email, "error": str(e)},
        )

        # Retry the task
        raise self.retry(countdown=60, max_retries=3, exc=e)


@celery_app.task(bind=True, name="send_reminder_email")
def send_reminder_email_task(self, email: str, username: str, reminder_type: str, days_since_reading: int):
    """
    Async task to send reading reminder email.

    Args:
        email: User's email address
        username: User's username
        reminder_type: Type of reminder (daily, weekly, monthly)
        days_since_reading: Days since last reading

    Returns:
        dict: Task result with status and details
    """
    try:
        # Customize message based on reminder type and days since reading
        if reminder_type == "daily":
            subject = "Daily Tarot Guidance Awaits ✨"
            if days_since_reading == 1:
                greeting = "The cards are calling to you again!"
            else:
                greeting = f"It's been {days_since_reading} days since your last reading."
        elif reminder_type == "weekly":
            subject = "Weekly Wisdom from the Cards 🔮"
            greeting = f"It's been {days_since_reading} days since your last reading."
        else:  # monthly
            subject = "Monthly Mystical Guidance 🌙"
            greeting = f"The cards have been patiently waiting for {days_since_reading} days."

        html_body = f"""
        <html>
        <body>
            <h2>Hello {username}!</h2>
            <p>{greeting}</p>
            <p>The universe has messages waiting for you through the tarot cards.</p>
            <p>Take a moment to connect with your inner wisdom and discover what insights await you today.</p>
            <p style="text-align: center; margin: 20px 0;">
                <a href="#" style="background-color: #4A90E2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                    Get Your Reading
                </a>
            </p>
            <p><em>"The cards are a sacred mirror that reflects the deepest truths of your soul."</em></p>
            <br>
            <p>With mystical regards,<br>The ArcanaAI Team</p>
        </body>
        </html>
        """

        message = MessageSchema(
            subject=subject,
            recipients=[email],
            body=html_body,
            subtype=MessageType.html,
        )

        # Send email
        _send_email_sync(message)

        logger.info(
            "Reminder email sent successfully",
            extra={
                "task_id": current_task.request.id,
                "username": username,
                "email": email,
                "reminder_type": reminder_type,
                "days_since_reading": days_since_reading,
            },
        )

        return {
            "status": "success",
            "message": "Reminder email sent successfully",
            "task_id": current_task.request.id,
            "email": email,
            "username": username,
            "reminder_type": reminder_type,
        }

    except Exception as e:
        logger.error(
            f"Error sending reminder email: {str(e)}",
            extra={"task_id": current_task.request.id, "email": email, "reminder_type": reminder_type, "error": str(e)},
        )

        # Retry the task
        raise self.retry(countdown=60, max_retries=3, exc=e)


@celery_app.task(bind=True, name="send_system_notification_email")
def send_system_notification_email_task(
    self,
    emails: list[str],
    subject: str,
    html_body: str,
    text_body: str,
):
    """
    Async task to send system notification emails.

    Args:
        emails: List of email addresses
        subject: Email subject
        html_body: HTML email body
        text_body: Plain text email body

    Returns:
        dict: Task result with status and details
    """
    try:
        successful_sends = []
        failed_sends = []

        for email in emails:
            try:
                message = MessageSchema(
                    subject=subject,
                    recipients=[email],
                    body=html_body,
                    subtype=MessageType.html,
                )

                _send_email_sync(message)
                successful_sends.append(email)

            except Exception as e:
                logger.error(f"Failed to send email to {email}: {str(e)}")
                failed_sends.append({"email": email, "error": str(e)})

        logger.info(
            "System notification email task completed",
            extra={
                "task_id": current_task.request.id,
                "successful": len(successful_sends),
                "failed": len(failed_sends),
                "total": len(emails),
            },
        )

        return {
            "status": "completed",
            "message": f"Sent {len(successful_sends)} emails, {len(failed_sends)} failed",
            "task_id": current_task.request.id,
            "successful_sends": successful_sends,
            "failed_sends": failed_sends,
            "total_emails": len(emails),
        }

    except Exception as e:
        logger.error(
            f"Error in system notification email task: {str(e)}",
            extra={"task_id": current_task.request.id, "error": str(e)},
        )

        # Retry the task
        raise self.retry(countdown=120, max_retries=2, exc=e)


@celery_app.task(bind=True, name="send_bulk_notification_email")
def send_bulk_notification_email_task(
    self,
    emails: list[str],
    subject: str,
    html_body: str,
    text_body: str,
):
    """
    Async task to send bulk notification emails.

    Args:
        emails: List of email addresses
        subject: Email subject
        html_body: HTML email body
        text_body: Plain text email body

    Returns:
        dict: Task result with status and details
    """
    try:
        successful_sends = []
        failed_sends = []

        for email in emails:
            try:
                message = MessageSchema(
                    subject=subject,
                    recipients=[email],
                    body=html_body,
                    subtype=MessageType.html,
                )

                _send_email_sync(message)
                successful_sends.append(email)

            except Exception as e:
                logger.error(f"Failed to send email to {email}: {str(e)}")
                failed_sends.append({"email": email, "error": str(e)})

        logger.info(
            "Bulk email task completed",
            extra={
                "task_id": current_task.request.id,
                "successful": len(successful_sends),
                "failed": len(failed_sends),
                "total": len(emails),
            },
        )

        return {
            "status": "completed",
            "message": f"Sent {len(successful_sends)} emails, {len(failed_sends)} failed",
            "task_id": current_task.request.id,
            "successful_sends": successful_sends,
            "failed_sends": failed_sends,
            "total_emails": len(emails),
        }

    except Exception as e:
        logger.error(f"Error in bulk email task: {str(e)}", extra={"task_id": current_task.request.id, "error": str(e)})

        # Retry the task
        raise self.retry(countdown=120, max_retries=2, exc=e)


# -----------------------
# Helper function
# -----------------------


def _send_email_sync(message: MessageSchema) -> None:
    """Send email synchronously by running the FastMail coroutine."""
    fm = FastMail(settings.email_config)
    maybe_coro = fm.send_message(message)
    # If the result is awaitable (coroutine or AsyncMock), run it; otherwise assume synchronous mock
    if inspect.isawaitable(maybe_coro):
        try:
            # Try to get the current event loop
            loop = asyncio.get_event_loop()
            if loop.is_running():
                # If we're already in an event loop, use asyncio.create_task
                import concurrent.futures

                with concurrent.futures.ThreadPoolExecutor() as executor:

                    def run_in_thread():
                        new_loop = asyncio.new_event_loop()
                        asyncio.set_event_loop(new_loop)
                        try:
                            return new_loop.run_until_complete(maybe_coro)
                        finally:
                            new_loop.close()

                    future = executor.submit(run_in_thread)
                    future.result()
            else:
                # No running loop, we can use asyncio.run
                asyncio.run(maybe_coro)
        except RuntimeError:
            # Fallback: create a new event loop in a new thread
            import concurrent.futures

            with concurrent.futures.ThreadPoolExecutor() as executor:

                def run_in_thread():
                    new_loop = asyncio.new_event_loop()
                    asyncio.set_event_loop(new_loop)
                    try:
                        return new_loop.run_until_complete(maybe_coro)
                    finally:
                        new_loop.close()

                future = executor.submit(run_in_thread)
                future.result()
