"""
Utility functions for Celery task management and integration with FastAPI.
"""

import logging
from typing import Any

from celery.result import AsyncResult
from fastapi import HTTPException

from celery_app import celery_app

logger = logging.getLogger(__name__)


class TaskManager:
    """Manager class for handling Celery tasks."""

    @staticmethod
    def get_task_status(task_id: str) -> dict[str, Any]:
        """
        Get the status of a Celery task.

        Args:
            task_id: The Celery task ID

        Returns:
            dict: Task status information

        Raises:
            HTTPException: If task is not found
        """
        try:
            result = AsyncResult(task_id, app=celery_app)

            if result.state == "PENDING":
                # Task is waiting or doesn't exist
                return {"task_id": task_id, "status": "PENDING", "message": "Task is pending or does not exist"}
            elif result.state == "PROGRESS":
                return {
                    "task_id": task_id,
                    "status": "PROGRESS",
                    "current": result.info.get("current", 0),
                    "total": result.info.get("total", 1),
                    "message": result.info.get("message", ""),
                }
            elif result.state == "SUCCESS":
                return {"task_id": task_id, "status": "SUCCESS", "result": result.result}
            else:
                # Task failed
                return {
                    "task_id": task_id,
                    "status": result.state,
                    "error": str(result.info),
                    "traceback": result.traceback,
                }

        except Exception as e:
            logger.error(f"Error getting task status for {task_id}: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Error retrieving task status: {str(e)}")

    @staticmethod
    def cancel_task(task_id: str) -> dict[str, Any]:
        """
        Cancel a Celery task.

        Args:
            task_id: The Celery task ID

        Returns:
            dict: Cancellation result
        """
        try:
            celery_app.control.revoke(task_id, terminate=True)
            return {"task_id": task_id, "status": "CANCELLED", "message": "Task has been cancelled"}
        except Exception as e:
            logger.error(f"Error cancelling task {task_id}: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Error cancelling task: {str(e)}")

    @staticmethod
    def get_active_tasks() -> dict[str, Any]:
        """
        Get list of active tasks.

        Returns:
            dict: Information about active tasks
        """
        try:
            inspect = celery_app.control.inspect()
            active_tasks = inspect.active()

            if not active_tasks:
                return {"active_tasks": {}, "total_active": 0}

            total_active = sum(len(tasks) for tasks in active_tasks.values())

            return {"active_tasks": active_tasks, "total_active": total_active}

        except Exception as e:
            logger.error(f"Error getting active tasks: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Error retrieving active tasks: {str(e)}")

    @staticmethod
    def get_worker_stats() -> dict[str, Any]:
        """
        Get Celery worker statistics.

        Returns:
            dict: Worker statistics
        """
        try:
            inspect = celery_app.control.inspect()
            stats = inspect.stats()

            if not stats:
                return {"workers": {}, "total_workers": 0}

            return {"workers": stats, "total_workers": len(stats)}

        except Exception as e:
            logger.error(f"Error getting worker stats: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Error retrieving worker statistics: {str(e)}")


class EmailTaskManager:
    """Manager for email-related tasks."""

    @staticmethod
    def send_password_reset_email_async(email: str, token: str, user_id: int | None = None) -> str:
        """
        Enqueue password reset email task.

        Args:
            email: Email address
            token: Reset token
            user_id: Optional user ID

        Returns:
            str: Task ID
        """
        from tasks.email_tasks import send_password_reset_email_task

        result = send_password_reset_email_task.delay(email, token, user_id)
        logger.info(f"Password reset email task queued: {result.id}")
        return result.id

    @staticmethod
    def send_welcome_email_async(email: str, username: str) -> str:
        """
        Enqueue welcome email task.

        Args:
            email: Email address
            username: Username

        Returns:
            str: Task ID
        """
        from tasks.email_tasks import send_welcome_email_task

        result = send_welcome_email_task.delay(email, username)
        logger.info(f"Welcome email task queued: {result.id}")
        return result.id

    @staticmethod
    def send_bulk_email_async(emails: list[str], subject: str, html_body: str, text_body: str) -> str:
        """
        Enqueue bulk email task.

        Args:
            emails: List of email addresses
            subject: Email subject
            html_body: HTML email body
            text_body: Plain text email body

        Returns:
            str: Task ID
        """
        from tasks.email_tasks import send_bulk_notification_email_task

        result = send_bulk_notification_email_task.delay(emails, subject, html_body, text_body)
        logger.info(f"Bulk email task queued: {result.id}")
        return result.id


class NotificationTaskManager:
    """Manager for notification-related tasks."""

    @staticmethod
    def send_reading_reminder_async(user_id: int, reminder_type: str = "daily") -> str:
        """
        Enqueue reading reminder task.

        Args:
            user_id: User ID
            reminder_type: Type of reminder

        Returns:
            str: Task ID
        """
        from tasks.notification_tasks import send_reading_reminder_task

        result = send_reading_reminder_task.delay(user_id, reminder_type)
        logger.info(f"Reading reminder task queued: {result.id}")
        return result.id

    @staticmethod
    def process_daily_reminders_async() -> str:
        """
        Enqueue daily reminders processing task.

        Returns:
            str: Task ID
        """
        from tasks.notification_tasks import process_daily_reminders_task

        result = process_daily_reminders_task.delay()
        logger.info(f"Daily reminders processing task queued: {result.id}")
        return result.id

    @staticmethod
    def send_system_notification_async(
        notification_type: str, data: dict[str, Any], target_users: list[int] | None = None
    ) -> str:
        """
        Enqueue system notification task.

        Args:
            notification_type: Type of notification
            data: Notification data
            target_users: Optional list of target user IDs

        Returns:
            str: Task ID
        """
        from tasks.notification_tasks import send_system_notification_task

        result = send_system_notification_task.delay(notification_type, data, target_users)
        logger.info(f"System notification task queued: {result.id}")
        return result.id

    @staticmethod
    def cleanup_old_tasks_async(days_old: int = 30) -> str:
        """
        Enqueue cleanup task.

        Args:
            days_old: Days old threshold for cleanup

        Returns:
            str: Task ID
        """
        from tasks.notification_tasks import cleanup_old_tasks_task

        result = cleanup_old_tasks_task.delay(days_old)
        logger.info(f"Cleanup task queued: {result.id}")
        return result.id

    @staticmethod
    def reset_monthly_free_turns_async() -> str:
        """
        Enqueue monthly free turns reset task.

        Returns:
            str: Task ID
        """
        from tasks.notification_tasks import reset_monthly_free_turns_task

        result = reset_monthly_free_turns_task.delay()
        logger.info(f"Monthly free turns reset task queued: {result.id}")
        return result.id


# Convenience instances
task_manager = TaskManager()
email_task_manager = EmailTaskManager()
notification_task_manager = NotificationTaskManager()
