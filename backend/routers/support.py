import traceback
import uuid
from pathlib import Path
from typing import Optional

import httpx
from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from sqlalchemy.orm import Session

from config import settings
from database import get_db
from models import User
from routers.auth import RATE_LIMITS, get_current_user, limiter
from schemas import SupportTicketResponse
from utils.error_handlers import logger

# Initialize support router with prefix and tags
router = APIRouter(prefix="/support", tags=["support"])

# Configuration for file uploads
MAX_FILE_SIZE = 25 * 1024 * 1024  # 25MB per file (Slack limit is 1GB, but we'll be conservative)
MAX_FILES = 5  # Maximum number of files per ticket
ALLOWED_EXTENSIONS = {
    ".jpg",
    ".jpeg",
    ".png",
    ".gif",
    ".webp",
    ".bmp",  # Images
    ".mp4",
    ".mov",
    ".avi",
    ".mkv",
    ".webm",
    ".flv",  # Videos
    ".pdf",
    ".doc",
    ".docx",
    ".txt",
    ".rtf",  # Documents
    ".zip",
    ".rar",
    ".7z",  # Archives
}

# Slack configuration
SLACK_BOT_TOKEN = settings.SLACK_BOT_TOKEN
SLACK_CHANNEL = settings.SLACK_CHANNEL

# Required Slack OAuth Scopes for file uploads:
# - files:write: Required to upload files using the new external upload API
# - chat:write: Required to send messages to channels
#
# Note: This system uses Slack's new file upload API (files.getUploadURLExternal + files.completeUploadExternal)
# The old files.upload method was deprecated by Slack and replaced in November 2024
# If your bot token doesn't have these scopes, file uploads will fail with "missing_scope" error


def validate_file(file: UploadFile) -> None:
    """Validate uploaded file for support tickets.

    Args:
        file: The uploaded file to validate

    Raises:
        HTTPException: If file is invalid
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file selected")

    # Check file extension
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type '{file_ext}'. Allowed types: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
        )


async def upload_file_to_slack(file: UploadFile, ticket_id: str, channel: str) -> Optional[dict]:
    """Upload file to Slack using the new external upload API.

    The old files.upload method has been deprecated by Slack. This function uses
    the new 3-step process: getUploadURLExternal -> upload to URL -> completeUploadExternal

    Args:
        file: The uploaded file
        ticket_id: Unique ticket identifier
        channel: Slack channel to upload to

    Returns:
        Optional[dict]: File info from Slack if successful, None otherwise

    Raises:
        HTTPException: If file processing fails
    """
    if not SLACK_BOT_TOKEN:
        logger.logger.warning("SLACK_BOT_TOKEN not configured, skipping file upload")
        return None

    try:
        validate_file(file)

        # Read and validate file size
        file_content = file.file.read()
        if len(file_content) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=400,
                detail=f"File '{file.filename}' is too large. Maximum size: {MAX_FILE_SIZE // (1024*1024)}MB",
            )

        file_size = len(file_content)

        # Reset file pointer
        file.file.seek(0)

        async with httpx.AsyncClient(timeout=60.0) as client:
            headers = {"Authorization": f"Bearer {SLACK_BOT_TOKEN}"}

            # Step 1: Get upload URL
            get_url_response = await client.get(
                "https://slack.com/api/files.getUploadURLExternal",
                params={"filename": file.filename, "length": file_size},
                headers=headers,
            )

            if get_url_response.status_code != 200:
                logger.logger.error(f"Failed to get upload URL: HTTP {get_url_response.status_code}")
                return None

            url_result = get_url_response.json()
            if not url_result.get("ok"):
                error_msg = url_result.get("error", "Unknown error")
                if error_msg == "missing_scope":
                    logger.logger.error(
                        f"Slack file upload failed: {error_msg}. Your Slack bot token needs 'files:write' scope."
                    )
                else:
                    logger.logger.error(f"Failed to get upload URL: {error_msg}")
                return None

            upload_url = url_result.get("upload_url")
            file_id = url_result.get("file_id")

            if not upload_url or not file_id:
                logger.logger.error("Missing upload_url or file_id in response")
                return None

            # Step 2: Upload file to the URL
            upload_response = await client.post(
                upload_url, files={"file": (file.filename, file_content, file.content_type)}
            )

            if upload_response.status_code != 200:
                logger.logger.error(f"File upload to URL failed: HTTP {upload_response.status_code}")
                return None

            # Step 3: Complete the upload and try to share to channel
            # First try with channel sharing
            complete_response = await client.post(
                "https://slack.com/api/files.completeUploadExternal",
                json={
                    "files": [{"id": file_id, "title": f"Support Ticket #{ticket_id} - {file.filename}"}],
                    "channel_id": channel,
                    "initial_comment": f"📎 File attached to support ticket #{ticket_id}",
                },
                headers=headers,
            )

            if complete_response.status_code != 200:
                logger.logger.error(f"Failed to complete upload: HTTP {complete_response.status_code}")
                return None

            complete_result = complete_response.json()
            logger.logger.info(f"Complete upload response: {complete_result}")

            if complete_result.get("ok"):
                files = complete_result.get("files", [])
                if files:
                    uploaded_file = files[0]

                    # File should now be shared to the channel via the completeUploadExternal call above
                    # Check if the file was properly shared
                    if uploaded_file.get("shares") and channel in str(uploaded_file.get("shares", {})):
                        logger.logger.info(f"File '{file.filename}' successfully shared to channel {channel}")
                    else:
                        logger.logger.warning(
                            f"File '{file.filename}' uploaded but may not be visible in channel {channel}"
                        )
                        logger.logger.info(f"File sharing info: {uploaded_file.get('shares', 'No shares')}")
                        logger.logger.info(f"File channels: {uploaded_file.get('channels', 'No channels')}")

                    logger.logger.info(f"File '{file.filename}' uploaded to Slack successfully for ticket #{ticket_id}")
                    return uploaded_file
                else:
                    logger.logger.error("No files returned in complete upload response")
                    return None
            else:
                error_msg = complete_result.get("error", "Unknown error")
                if error_msg == "channel_not_found":
                    logger.logger.error(
                        f"Slack file upload failed: {error_msg}. Channel '{channel}' not found. Please ensure: 1) Channel exists, 2) Bot is invited to channel, 3) Channel ID is correct (starts with C for public channels, G for private groups)"
                    )
                elif error_msg == "missing_scope":
                    logger.logger.error(
                        f"Slack file upload failed: {error_msg}. Your Slack bot token needs 'files:write' scope."
                    )
                else:
                    logger.logger.error(f"Failed to complete upload: {error_msg}")
                return None

    except Exception as e:
        if isinstance(e, HTTPException):
            raise
        logger.logger.error(f"Error uploading file to Slack: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing file '{file.filename}'")
    finally:
        # Reset file pointer
        file.file.seek(0)


async def send_to_slack(
    ticket_id: str, user: User, title: str, description: str, uploaded_files: list[dict] = None
) -> Optional[str]:
    """Send support ticket to Slack via webhook.

    Args:
        ticket_id: Unique ticket identifier
        user: The user who submitted the ticket
        title: Ticket title
        description: Ticket description
        uploaded_files: List of uploaded file info from Slack (if any)

    Returns:
        Optional[str]: Slack message ID if successful, None otherwise
    """
    webhook_url = settings.SLACK_WEBHOOK_URL
    if not webhook_url:
        logger.logger.warning("SLACK_WEBHOOK_URL not configured, skipping Slack notification")
        return None

    try:
        # Prepare file attachments text
        files_text = ""
        if uploaded_files:
            file_list = []
            for file_info in uploaded_files:
                file_name = file_info.get("name", file_info.get("title", "Unknown file"))
                file_size = file_info.get("size", 0)
                file_type = file_info.get("mimetype", file_info.get("filetype", "unknown"))

                # Try different URL fields from the new API
                file_url = (
                    file_info.get("permalink_public")
                    or file_info.get("url_private")
                    or file_info.get("permalink")
                    or file_info.get("url_private_download")
                )

                if file_url:
                    file_list.append(f"• <{file_url}|{file_name}> ({file_type}, {file_size} bytes)")
                else:
                    # If no URL available, just show file info
                    file_id = file_info.get("id", "unknown")
                    file_list.append(f"• {file_name} (ID: {file_id}, {file_type}, {file_size} bytes)")

            if file_list:
                files_text = "\n\n📎 *Attachments:*\n" + "\n".join(file_list)

        # Prepare Slack message
        slack_message = {
            "text": f"🎴 New Support Ticket #{ticket_id}",
            "blocks": [
                {"type": "header", "text": {"type": "plain_text", "text": f"🎴 Support Ticket #{ticket_id}"}},
                {
                    "type": "section",
                    "fields": [
                        {"type": "mrkdwn", "text": f"*User:* {user.username}"},
                        {"type": "mrkdwn", "text": f"*Email:* {user.email}"},
                        {"type": "mrkdwn", "text": f"*User ID:* {user.id}"},
                        {"type": "mrkdwn", "text": f"*Premium:* {'Yes' if user.is_specialized_premium else 'No'}"},
                    ],
                },
                {"type": "section", "text": {"type": "mrkdwn", "text": f"*Subject:* {title}"}},
                {"type": "section", "text": {"type": "mrkdwn", "text": f"*Description:*\n{description}"}},
            ],
        }

        # Add files section if there are attachments
        if files_text:
            slack_message["blocks"].append({"type": "section", "text": {"type": "mrkdwn", "text": files_text}})

        # Send to Slack
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(webhook_url, json=slack_message)
            response.raise_for_status()

            logger.logger.info(f"Support ticket #{ticket_id} sent to Slack successfully")
            return "success"  # Slack webhooks don't return message IDs

    except Exception as e:
        logger.logger.error(f"Failed to send support ticket #{ticket_id} to Slack: {str(e)}")
        return None


@router.post("/", response_model=SupportTicketResponse)
@limiter.limit(RATE_LIMITS["upload"])  # Use upload rate limit (more restrictive)
async def create_support_ticket(
    request: Request,
    title: str = Form(..., description="Support ticket title/subject"),
    description: str = Form(..., description="Detailed description of the issue"),
    files: list[UploadFile] = File(None, description="Optional file attachments"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Create Support Ticket

    Submit a new support ticket with optional file attachments. The ticket and files will be
    automatically uploaded to Slack for immediate support team access. No files are stored locally.

    Args:
        request (Request): FastAPI request object for rate limiting
        title (str): Support ticket title/subject (1-200 characters)
        description (str): Detailed description of the issue (1-2000 characters)
        files (List[UploadFile], optional): File attachments (max 5 files, 25MB each)
        current_user (User): Current authenticated user
        db (Session): Database session

    Returns:
        SupportTicketResponse: Ticket creation confirmation
            - message (str): Success message
            - ticket_id (str): Unique ticket identifier
            - slack_message_id (str, optional): Slack message ID if sent successfully

    Raises:
        HTTPException (400): If validation fails or files are invalid
        HTTPException (401): If user is not authenticated
        HTTPException (429): If rate limit is exceeded
        HTTPException (500): If ticket creation fails

    File Requirements:
        - Maximum files: 5 per ticket
        - Maximum size: 25MB per file
        - Supported formats: Images (jpg, png, gif, etc.), Videos (mp4, mov, etc.),
          Documents (pdf, doc, txt), Archives (zip, rar)
        - Files are uploaded directly to Slack (no local storage)

    Environment Variables Required:
        - SLACK_BOT_TOKEN: Bot token for uploading files to Slack
        - SLACK_CHANNEL: Channel to upload files to (default: #support)
        - SLACK_WEBHOOK_URL: Webhook URL for sending ticket notifications

    Example:
        ```bash
        curl -X POST "http://api.example.com/support/" \
             -H "Authorization: Bearer your-token" \
             -F "title=Login Issues" \
             -F "description=I cannot log into my account" \
             -F "files=@screenshot.png"
        ```
    """
    try:
        # Validate input lengths (additional validation beyond Pydantic)
        if not title or len(title.strip()) == 0:
            raise HTTPException(status_code=400, detail="Title cannot be empty")

        if not description or len(description.strip()) == 0:
            raise HTTPException(status_code=400, detail="Description cannot be empty")

        if len(title) > 200:
            raise HTTPException(status_code=400, detail="Title must be 200 characters or less")

        if len(description) > 2000:
            raise HTTPException(status_code=400, detail="Description must be 2000 characters or less")

        # Validate files if provided
        if files:
            # Filter out empty files
            files = [f for f in files if f.filename]

            if len(files) > MAX_FILES:
                raise HTTPException(status_code=400, detail=f"Too many files. Maximum allowed: {MAX_FILES}")

        # Generate unique ticket ID
        ticket_id = str(uuid.uuid4())

        # Upload files directly to Slack
        uploaded_files = []

        if files:
            for file in files:
                try:
                    file_info = await upload_file_to_slack(file, ticket_id, SLACK_CHANNEL)
                    if file_info:
                        uploaded_files.append(file_info)
                    else:
                        logger.logger.warning(
                            f"Failed to upload file '{file.filename}' to Slack for ticket #{ticket_id}"
                        )

                except Exception as e:
                    # Log error but continue - we don't want to fail the entire ticket for one file
                    logger.logger.error(f"Error uploading file '{file.filename}' to Slack: {str(e)}")
                    # Re-raise if it's a validation error
                    if isinstance(e, HTTPException):
                        raise

        # Send ticket info to Slack
        slack_message_id = await send_to_slack(
            ticket_id=ticket_id,
            user=current_user,
            title=title.strip(),
            description=description.strip(),
            uploaded_files=uploaded_files if uploaded_files else None,
        )

        # Log successful ticket creation
        logger.logger.info(
            "Support ticket created successfully",
            extra={
                "ticket_id": ticket_id,
                "user_id": current_user.id,
                "username": current_user.username,
                "files_count": len(uploaded_files),
                "files_uploaded_to_slack": len(uploaded_files),
                "sent_to_slack": slack_message_id is not None,
            },
        )

        return SupportTicketResponse(
            message="Support ticket created successfully. Our team will get back to you soon!",
            ticket_id=ticket_id,
            slack_message_id=slack_message_id,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.logger.error(
            "Error creating support ticket",
            extra={"error": str(e), "user_id": current_user.id, "traceback": traceback.format_exc()},
        )
        raise HTTPException(
            status_code=500, detail="An error occurred while creating your support ticket. Please try again."
        )
