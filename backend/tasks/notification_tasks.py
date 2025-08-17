# noqa: E501
import logging
from datetime import datetime, timedelta

from celery import current_task
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from celery_app import celery_app
from config import settings
from models import ChatSession, User

# Setup logging
logger = logging.getLogger(__name__)

# Database setup for tasks
engine = create_engine(settings.SQLALCHEMY_DATABASE_URL.replace("sqlite+aiosqlite://", "sqlite://"))
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@celery_app.task(bind=True, name="send_reading_reminder")
def send_reading_reminder_task(self, user_id: int, reminder_type: str = "daily"):
    """
    Async task to send reading reminders to users.

    Args:
        user_id: User ID to send reminder to
        reminder_type: Type of reminder (daily, weekly, monthly)

    Returns:
        dict: Task result with status and details
    """
    try:
        db = SessionLocal()

        try:
            # Get user
            user = db.query(User).filter(User.id == user_id).first()
            if not user:
                return {
                    "status": "error",
                    "message": f"User with ID {user_id} not found",
                    "task_id": current_task.request.id,
                }

            # Get user's last chat session (closest equivalent to reading)
            last_session = (
                db.query(ChatSession)
                .filter(ChatSession.user_id == user_id)
                .order_by(ChatSession.created_at.desc())
                .first()
            )

            # Calculate time since last session
            days_since_reading = 0
            if last_session:
                days_since_reading = (datetime.utcnow() - last_session.created_at).days

            # Determine if reminder should be sent based on type
            should_send = False
            if (
                (reminder_type == "daily" and (not last_session or days_since_reading >= 1))
                or (reminder_type == "weekly" and (not last_session or days_since_reading >= 7))
                or (reminder_type == "monthly" and (not last_session or days_since_reading >= 30))
            ):
                should_send = True

            if not should_send:
                return {
                    "status": "skipped",
                    "message": f"Reminder not needed for user {user.username}",
                    "task_id": current_task.request.id,
                    "days_since_reading": days_since_reading,
                }

            # Import here to avoid circular imports
            from tasks.email_tasks import send_reminder_email_task

            # Send reminder email
            reminder_result = send_reminder_email_task.delay(
                email=user.email,
                username=user.username,
                reminder_type=reminder_type,
                days_since_reading=days_since_reading,
            )

            logger.info(
                "Reading reminder sent",
                extra={
                    "task_id": current_task.request.id,
                    "user_id": user_id,
                    "username": user.username,
                    "reminder_type": reminder_type,
                    "email_task_id": reminder_result.id,
                },
            )

            return {
                "status": "success",
                "message": f"Reminder sent to {user.username}",
                "task_id": current_task.request.id,
                "user_id": user_id,
                "reminder_type": reminder_type,
                "email_task_id": reminder_result.id,
            }

        finally:
            db.close()

    except Exception as e:
        logger.error(
            f"Error sending reading reminder: {str(e)}",
            extra={"task_id": current_task.request.id, "user_id": user_id, "error": str(e)},
        )

        # Retry the task
        raise self.retry(countdown=300, max_retries=2, exc=e)


@celery_app.task(bind=True, name="process_daily_reminders")
def process_daily_reminders_task(self):
    """
    Async task to process daily reading reminders for all eligible users.
    This task should be scheduled to run daily.

    Returns:
        dict: Task result with status and details
    """
    try:
        db = SessionLocal()

        try:
            # Get all active users (you might want to add a user preference for reminders)
            users = db.query(User).all()

            reminder_tasks = []
            for user in users:
                # Check if user has opted in for reminders (add this to user model later)
                # For now, send to all users
                task_result = send_reading_reminder_task.delay(user.id, "daily")
                reminder_tasks.append({"user_id": user.id, "username": user.username, "task_id": task_result.id})

            logger.info(
                "Daily reminders processed",
                extra={
                    "task_id": current_task.request.id,
                    "total_users": len(users),
                    "tasks_created": len(reminder_tasks),
                },
            )

            return {
                "status": "success",
                "message": f"Daily reminders processed for {len(users)} users",
                "task_id": current_task.request.id,
                "total_users": len(users),
                "reminder_tasks": reminder_tasks,
            }

        finally:
            db.close()

    except Exception as e:
        logger.error(
            f"Error processing daily reminders: {str(e)}", extra={"task_id": current_task.request.id, "error": str(e)}
        )

        # Retry the task
        raise self.retry(countdown=600, max_retries=1, exc=e)


@celery_app.task(bind=True, name="send_system_notification")
def send_system_notification_task(self, notification_type: str, data: dict, target_users: list[int] | None = None):
    """
    Async task to send system notifications.

    Args:
        notification_type: Type of notification (maintenance, feature_update, etc.)
        data: Notification data
        target_users: Optional list of user IDs to target (if None, sends to all)

    Returns:
        dict: Task result with status and details
    """
    try:
        db = SessionLocal()

        try:
            users = db.query(User).filter(User.id.in_(target_users)).all() if target_users else db.query(User).all()

            if not users:
                return {
                    "status": "error",
                    "message": "No users found for notification",
                    "task_id": current_task.request.id,
                }

            # Import here to avoid circular imports
            from tasks.email_tasks import send_system_notification_email_task

            emails = [user.email for user in users]

            if notification_type == "maintenance":
                subject = "Scheduled Maintenance - ArcanaAI"
                html_body = f"""
                <html>
                <body>
                    <h2>Scheduled Maintenance Notice</h2>
                    <p>We will be performing scheduled maintenance on our ArcanaAI service.</p>
                    <p><strong>Maintenance Window:</strong> {data.get('start_time', 'TBD')} - {data.get('end_time', 'TBD')}</p>
                    <p><strong>Expected Downtime:</strong> {data.get('duration', 'Up to 2 hours')}</p>
                    <p>During this time, the service may be temporarily unavailable.</p>
                    <p>We apologize for any inconvenience and appreciate your patience.</p>
                    <br>
                    <p>Best regards,<br>The ArcanaAI Team</p>
                </body>
                </html>
                """
                text_body = f"""
                Scheduled Maintenance Notice

                We will be performing scheduled maintenance on our ArcanaAI service.

                Maintenance Window: {data.get('start_time', 'TBD')} - {data.get('end_time', 'TBD')}
                Expected Downtime: {data.get('duration', 'Up to 2 hours')}

                During this time, the service may be temporarily unavailable.
                We apologize for any inconvenience and appreciate your patience.

                Best regards,
                The ArcanaAI Team
                """

            elif notification_type == "feature_update":
                subject = "New Features Available - ArcanaAI"
                html_body = """
                <html>
                <body>
                    <h2>Exciting New Features!</h2>
                    <p>We're excited to announce new features in ArcanaAI:</p>
                    <ul>
                """
                for feature in data.get("features", []):
                    html_body += f"<li>{feature}</li>"
                html_body += """
                    </ul>
                    <p>Log in to your account to explore these new capabilities!</p>
                    <br>
                    <p>May the cards reveal new insights,<br>The ArcanaAI Team</p>
                </body>
                </html>
                """

                text_body = """
                Exciting New Features!

                We're excited to announce new features in ArcanaAI:
                """
                for feature in data.get("features", []):
                    text_body += f"- {feature}\n"
                text_body += """
                Log in to your account to explore these new capabilities!

                May the cards reveal new insights,
                The ArcanaAI Team
                """

            else:
                # Generic notification
                subject = data.get("subject", "Notification from ArcanaAI")
                html_body = data.get("html_body", data.get("message", ""))
                text_body = data.get("text_body", data.get("message", ""))

            # Send bulk email
            task_result = send_system_notification_email_task.delay(
                emails=emails, subject=subject, html_body=html_body, text_body=text_body
            )

            logger.info(
                "System notification sent",
                extra={
                    "task_id": current_task.request.id,
                    "notification_type": notification_type,
                    "target_users_count": len(users),
                    "email_task_id": task_result.id,
                },
            )

            return {
                "status": "success",
                "message": f"System notification sent to {len(users)} users",
                "task_id": current_task.request.id,
                "notification_type": notification_type,
                "target_users_count": len(users),
                "email_task_id": task_result.id,
            }

        finally:
            db.close()

    except Exception as e:
        logger.error(
            f"Error sending system notification: {str(e)}",
            extra={"task_id": current_task.request.id, "notification_type": notification_type, "error": str(e)},
        )

        # Retry the task
        raise self.retry(countdown=300, max_retries=2, exc=e)


@celery_app.task(bind=True, name="cleanup_old_tasks")
def cleanup_old_tasks_task(self, days_old: int = 30):
    """
    Async task to cleanup old task results and logs.

    Args:
        days_old: Remove task results older than this many days

    Returns:
        dict: Task result with status and details
    """
    try:
        # Calculate cutoff date
        cutoff_date = datetime.utcnow() - timedelta(days=days_old)

        # This would typically connect to Redis and clean up old task results
        # For now, we'll just log the cleanup attempt
        logger.info(
            "Cleanup task executed",
            extra={"task_id": current_task.request.id, "cutoff_date": cutoff_date.isoformat(), "days_old": days_old},
        )

        return {
            "status": "success",
            "message": f"Cleanup completed for tasks older than {days_old} days",
            "task_id": current_task.request.id,
            "cutoff_date": cutoff_date.isoformat(),
        }

    except Exception as e:
        logger.error(f"Error in cleanup task: {str(e)}", extra={"task_id": current_task.request.id, "error": str(e)})

        # Retry the task
        raise self.retry(countdown=3600, max_retries=1, exc=e)


@celery_app.task(bind=True, name="reset_monthly_free_turns")
def reset_monthly_free_turns_task(self):
    """
    Async task to reset all users' free turns to 3 at the beginning of each month.
    This task should be scheduled to run on the 1st of each month.

    Returns:
        dict: Task result with status and details
    """
    try:
        db = SessionLocal()

        try:
            # Get all active users
            users = db.query(User).filter(User.is_active == True).all()  # noqa: E712

            reset_count = 0
            skipped_count = 0
            error_count = 0

            for user in users:
                try:
                    # Check if this user needs their free turns reset
                    if user.should_reset_free_turns():
                        user.reset_free_turns()
                        reset_count += 1
                        logger.info(
                            f"Reset free turns for user {user.username} (ID: {user.id})",
                            extra={
                                "task_id": current_task.request.id,
                                "user_id": user.id,
                                "username": user.username,
                            },
                        )
                    else:
                        skipped_count += 1

                except Exception as user_error:
                    error_count += 1
                    logger.error(
                        f"Failed to reset turns for user {user.id}: {str(user_error)}",
                        extra={
                            "task_id": current_task.request.id,
                            "user_id": user.id,
                            "error": str(user_error),
                        },
                    )

            # Commit all changes
            db.commit()

            logger.info(
                "Monthly free turns reset completed",
                extra={
                    "task_id": current_task.request.id,
                    "total_users": len(users),
                    "reset_count": reset_count,
                    "skipped_count": skipped_count,
                    "error_count": error_count,
                },
            )

            return {
                "status": "success",
                "message": f"Monthly free turns reset completed. Reset: {reset_count}, Skipped: {skipped_count}, Errors: {error_count}",
                "task_id": current_task.request.id,
                "total_users": len(users),
                "reset_count": reset_count,
                "skipped_count": skipped_count,
                "error_count": error_count,
            }

        finally:
            db.close()

    except Exception as e:
        logger.error(
            f"Error in monthly free turns reset task: {str(e)}",
            extra={"task_id": current_task.request.id, "error": str(e)},
        )

        # Retry the task
        raise self.retry(countdown=3600, max_retries=2, exc=e)
