"""
Task management API endpoints for monitoring and controlling Celery tasks.
"""

import logging
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr

from models import User
from routers.auth import get_current_user
from utils.celery_utils import (
    email_task_manager,
    notification_task_manager,
    task_manager,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/tasks", tags=["tasks"])


# Pydantic models for request/response
class TaskStatusResponse(BaseModel):
    task_id: str
    status: str
    message: str | None = None
    result: dict[str, Any] | None = None
    error: str | None = None


class BulkEmailRequest(BaseModel):
    emails: list[EmailStr]
    subject: str
    html_body: str
    text_body: str


class SystemNotificationRequest(BaseModel):
    notification_type: str
    data: dict[str, Any]
    target_users: list[int] | None = None


class TaskCreateResponse(BaseModel):
    task_id: str
    message: str


@router.get("/status/{task_id}", response_model=TaskStatusResponse)
async def get_task_status(task_id: str, current_user: User = Depends(get_current_user)):
    """
    Get the status of a specific task.

    Args:
        task_id: The ID of the task to check
        current_user: Current authenticated user

    Returns:
        TaskStatusResponse: Task status information
    """
    try:
        status_info = task_manager.get_task_status(task_id)
        return TaskStatusResponse(**status_info)
    except Exception as e:
        logger.error(f"Error getting task status: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error getting task status: {str(e)}"
        )


@router.delete("/cancel/{task_id}")
async def cancel_task(task_id: str, current_user: User = Depends(get_current_user)):
    """
    Cancel a running task.

    Args:
        task_id: The ID of the task to cancel
        current_user: Current authenticated user

    Returns:
        dict: Cancellation confirmation
    """
    try:
        result = task_manager.cancel_task(task_id)
        return result
    except Exception as e:
        logger.error(f"Error cancelling task: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error cancelling task: {str(e)}"
        )


@router.get("/active")
async def get_active_tasks(current_user: User = Depends(get_current_user)):
    """
    Get information about currently active tasks.

    Args:
        current_user: Current authenticated user

    Returns:
        dict: Information about active tasks
    """
    try:
        active_tasks = task_manager.get_active_tasks()
        return active_tasks
    except Exception as e:
        logger.error(f"Error getting active tasks: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error getting active tasks: {str(e)}"
        )


@router.get("/workers")
async def get_worker_stats(current_user: User = Depends(get_current_user)):
    """
    Get Celery worker statistics.

    Args:
        current_user: Current authenticated user

    Returns:
        dict: Worker statistics
    """
    try:
        worker_stats = task_manager.get_worker_stats()
        return worker_stats
    except Exception as e:
        logger.error(f"Error getting worker stats: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error getting worker statistics: {str(e)}"
        )


@router.post("/email/bulk", response_model=TaskCreateResponse)
async def send_bulk_email(request: BulkEmailRequest, current_user: User = Depends(get_current_user)):
    """
    Send bulk emails asynchronously.

    Args:
        request: Bulk email request data
        current_user: Current authenticated user

    Returns:
        TaskCreateResponse: Task creation confirmation with task ID
    """
    try:
        task_id = email_task_manager.send_bulk_email_async(
            emails=[str(email) for email in request.emails],
            subject=request.subject,
            html_body=request.html_body,
            text_body=request.text_body,
        )

        return TaskCreateResponse(
            task_id=task_id, message=f"Bulk email task created for {len(request.emails)} recipients"
        )
    except Exception as e:
        logger.error(f"Error creating bulk email task: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error creating bulk email task: {str(e)}"
        )


@router.post("/email/welcome", response_model=TaskCreateResponse)
async def send_welcome_email(email: EmailStr, username: str, current_user: User = Depends(get_current_user)):
    """
    Send welcome email asynchronously.

    Args:
        email: Email address to send welcome email to
        username: Username for personalization
        current_user: Current authenticated user

    Returns:
        TaskCreateResponse: Task creation confirmation with task ID
    """
    try:
        task_id = email_task_manager.send_welcome_email_async(email=str(email), username=username)

        return TaskCreateResponse(task_id=task_id, message=f"Welcome email task created for {email}")
    except Exception as e:
        logger.error(f"Error creating welcome email task: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error creating welcome email task: {str(e)}"
        )


@router.post("/notifications/reminder", response_model=TaskCreateResponse)
async def send_reading_reminder(
    user_id: int, reminder_type: str = "daily", current_user: User = Depends(get_current_user)
):
    """
    Send reading reminder asynchronously.

    Args:
        user_id: User ID to send reminder to
        reminder_type: Type of reminder (daily, weekly, monthly)
        current_user: Current authenticated user

    Returns:
        TaskCreateResponse: Task creation confirmation with task ID
    """
    try:
        if reminder_type not in ["daily", "weekly", "monthly"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="reminder_type must be one of: daily, weekly, monthly"
            )

        task_id = notification_task_manager.send_reading_reminder_async(user_id=user_id, reminder_type=reminder_type)

        return TaskCreateResponse(task_id=task_id, message=f"Reading reminder task created for user {user_id}")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating reading reminder task: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error creating reading reminder task: {str(e)}"
        )


@router.post("/notifications/daily-reminders", response_model=TaskCreateResponse)
async def process_daily_reminders(current_user: User = Depends(get_current_user)):
    """
    Process daily reminders for all users asynchronously.

    Args:
        current_user: Current authenticated user

    Returns:
        TaskCreateResponse: Task creation confirmation with task ID
    """
    try:
        task_id = notification_task_manager.process_daily_reminders_async()

        return TaskCreateResponse(task_id=task_id, message="Daily reminders processing task created")
    except Exception as e:
        logger.error(f"Error creating daily reminders task: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error creating daily reminders task: {str(e)}"
        )


@router.post("/notifications/system", response_model=TaskCreateResponse)
async def send_system_notification(
    request: SystemNotificationRequest,
    current_user: User = Depends(get_current_user),
):
    """Send a system notification."""
    if not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")

    task_id = notification_task_manager.send_system_notification_async(
        request.notification_type, request.data, request.target_users
    )

    return {"message": "System notification task started", "task_id": task_id}


@router.post("/reset-monthly-turns")
async def reset_monthly_free_turns(
    current_user: User = Depends(get_current_user),
):
    """Manually trigger the monthly free turns reset task (admin only)."""
    if not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")

    task_id = notification_task_manager.reset_monthly_free_turns_async()

    return {
        "message": "Monthly free turns reset task started",
        "task_id": task_id,
        "note": "This task will reset free turns for all users who need a reset based on their last reset date"
    }


@router.post("/maintenance/cleanup", response_model=TaskCreateResponse)
async def cleanup_old_tasks(days_old: int = 30, current_user: User = Depends(get_current_user)):
    """
    Cleanup old tasks asynchronously.

    Args:
        days_old: Remove tasks older than this many days
        current_user: Current authenticated user

    Returns:
        TaskCreateResponse: Task creation confirmation with task ID
    """
    try:
        if days_old < 1:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="days_old must be at least 1")

        task_id = notification_task_manager.cleanup_old_tasks_async(days_old=days_old)

        return TaskCreateResponse(
            task_id=task_id, message=f"Cleanup task created to remove tasks older than {days_old} days"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating cleanup task: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error creating cleanup task: {str(e)}"
        )
