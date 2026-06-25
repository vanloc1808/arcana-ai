import json
import socket
import traceback
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any

import requests

from utils.logging import logger


def is_telegram_configured(telegram_bot_token: str, chat_id: str) -> bool:
    """
    Check if Telegram bot token and chat ID are properly configured

    Args:
        telegram_bot_token: Telegram bot token
        chat_id: Telegram chat ID

    Returns:
        bool: True if both token and chat ID are configured, False otherwise
    """
    return bool(telegram_bot_token and chat_id)


def get_context_header():
    """Generate a context header with timestamp and hostname"""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    hostname = socket.gethostname()
    return f"📅 `{timestamp}`\n🖥️ `{hostname}`"


def send_telegram_alert(message: str, telegram_bot_token: str, chat_id: str) -> bool:
    """
    Send an alert message to Telegram

    Args:
        message: The message to send
        telegram_bot_token: Telegram bot token
        chat_id: Telegram chat ID

    Returns:
        bool: True if message was sent successfully, False otherwise
    """
    # Skip silently if tokens are not configured
    if not telegram_bot_token or not chat_id:
        return False

    url = f"https://api.telegram.org/bot{telegram_bot_token}/sendMessage"
    payload = {"chat_id": chat_id, "text": message, "parse_mode": "Markdown"}

    try:
        r = requests.post(url, json=payload, timeout=5)
        r.raise_for_status()
        logger.info("Telegram alert sent successfully")
        return True
    except Exception as e:
        logger.error(f"Failed to send Telegram alert: {e}")
        return False


def send_500_error_alert(
    request_method: str,
    request_url: str,
    error: Exception,
    telegram_bot_token: str,
    chat_id: str,
    client_host: str | None = None,
    request_payload: dict[str, Any] | None = None,
    request_headers: dict[str, str] | None = None,
) -> bool:
    """
    Send a 500 error alert to Telegram with traceback and request details

    Args:
        request_method: HTTP method of the request
        request_url: URL of the request
        error: The exception that occurred
        telegram_bot_token: Telegram bot token
        chat_id: Telegram chat ID
        client_host: Client IP address (optional)
        request_payload: Request body/payload for debugging (optional)
        request_headers: Request headers for debugging (optional)

    Returns:
        bool: True if alert was sent successfully, False otherwise
    """
    # Skip entirely if Telegram tokens are not configured
    if not telegram_bot_token or not chat_id:
        return False

    tb = traceback.format_exc()

    # Truncate traceback if too long for Telegram
    if len(tb) > 2500:
        tb = tb[:2500] + "\n...(truncated)"

    # Format client info
    client_info = f"\n👤 **Client:** `{client_host}`" if client_host else ""

    # Format request payload
    payload_info = ""
    if request_payload:
        try:
            payload_str = json.dumps(request_payload, indent=2, default=str)
            # Truncate payload if too long
            if len(payload_str) > 500:
                payload_str = payload_str[:500] + "\n...(truncated)"
            payload_info = f"\n📦 **Request Payload:**\n```json\n{payload_str}\n```"
        except Exception:
            payload_info = f"\n📦 **Request Payload:** `{str(request_payload)[:200]}...`"

    # Format important headers (exclude sensitive ones)
    headers_info = ""
    if request_headers:
        important_headers = {}
        for key, value in request_headers.items():
            if key.lower() in ["content-type", "user-agent", "accept", "content-length"] or key.lower().startswith(
                "x-"
            ):
                important_headers[key] = value

        if important_headers:
            try:
                headers_str = json.dumps(important_headers, indent=2)
                if len(headers_str) > 300:
                    headers_str = headers_str[:300] + "\n...(truncated)"
                headers_info = f"\n🔧 **Headers:**\n```json\n{headers_str}\n```"
            except Exception:
                headers_info = f"\n🔧 **Headers:** `{str(important_headers)[:150]}...`"

    message = (
        f"🎯 **ArcanaAI API Alert**\n"
        f"{get_context_header()}\n"
        f"🚨 **500 Internal Server Error**\n"
        f"🔗 **Request:** `{request_method} {request_url}`{client_info}\n"
        f"❌ **Error:** `{str(error)}`"
        f"{payload_info}"
        f"{headers_info}\n"
        f"📋 **Traceback:**\n```\n{tb}\n```"
    )

    return send_telegram_alert(message, telegram_bot_token, chat_id)


def send_user_error_alert(
    username: str,
    status_code: int,
    request_method: str,
    request_url: str,
    error: Exception,
    telegram_bot_token: str,
    chat_id: str,
    client_host: str | None = None,
    request_payload: dict[str, Any] | None = None,
) -> bool:
    """
    Send a Telegram alert for a VIP user that encountered a 4xx or 5xx error.

    Args:
        username: The username of the VIP user.
        status_code: HTTP status code of the error response.
        request_method: HTTP method of the request.
        request_url: URL of the request.
        error: The exception or error that occurred.
        telegram_bot_token: Telegram bot token.
        chat_id: Telegram chat ID.
        client_host: Client IP address (optional).
        request_payload: Request body/payload for debugging (optional).

    Returns:
        bool: True if alert was sent successfully, False otherwise.
    """
    if not telegram_bot_token or not chat_id:
        return False

    status_emoji = "🚨" if status_code >= 500 else "⚠️"
    client_info = f"\n👤 **Client IP:** `{client_host}`" if client_host else ""

    payload_info = ""
    if request_payload:
        try:
            payload_str = json.dumps(request_payload, indent=2, default=str)
            if len(payload_str) > 500:
                payload_str = payload_str[:500] + "\n...(truncated)"
            payload_info = f"\n📦 **Payload:**\n```json\n{payload_str}\n```"
        except Exception:
            payload_info = f"\n📦 **Payload:** `{str(request_payload)[:200]}...`"

    traceback_info = ""
    if status_code >= 500:
        tb = traceback.format_exc()
        if tb and tb.strip() not in ("NoneType: None", "None"):
            if len(tb) > 1500:
                tb = tb[:1500] + "\n...(truncated)"
            traceback_info = f"\n📋 **Traceback:**\n```\n{tb}\n```"

    message = (
        f"🌟 **VIP User Error — @{username}**\n"
        f"{get_context_header()}\n"
        f"{status_emoji} **HTTP {status_code}**\n"
        f"🔗 **Request:** `{request_method} {request_url}`{client_info}\n"
        f"❌ **Error:** `{str(error)}`"
        f"{payload_info}"
        f"{traceback_info}"
    )

    return send_telegram_alert(message, telegram_bot_token, chat_id)


def update_last_error_time(path: str):
    """Update the last error timestamp file"""
    try:
        path_obj = Path(path)
        path_obj.parent.mkdir(parents=True, exist_ok=True)
        with path_obj.open("w") as f:
            f.write(datetime.now().isoformat())
    except Exception as e:
        logger.error(f"Failed to update error timestamp file {path}: {e}")


def should_report_healthy(error_path: str, report_path: str, threshold: timedelta = timedelta(hours=24)) -> bool:
    """Check if we should report that the service is healthy again"""
    error_path_obj = Path(error_path)
    report_path_obj = Path(report_path)
    if not error_path_obj.exists():
        return False
    if not report_path_obj.exists():
        return True
    try:
        with error_path_obj.open() as f:
            last_error = datetime.fromisoformat(f.read().strip())
        with report_path_obj.open() as f:
            last_report = datetime.fromisoformat(f.read().strip())
        return datetime.now() - last_error >= threshold and datetime.now() - last_report >= threshold
    except Exception:
        return False


def mark_healthy_reported(path: str):
    """Mark that we've reported the service as healthy"""
    try:
        path_obj = Path(path)
        path_obj.parent.mkdir(parents=True, exist_ok=True)
        with path_obj.open("w") as f:
            f.write(datetime.now().isoformat())
    except Exception as e:
        logger.error(f"Failed to mark healthy reported in {path}: {e}")


def ensure_state_files_exist(file_paths: list):
    """Ensure all state files exist by creating them if they don't"""
    for file_path in file_paths:
        path_obj = Path(file_path)
        if not path_obj.exists():
            try:
                path_obj.parent.mkdir(parents=True, exist_ok=True)
                with path_obj.open("w") as f:
                    f.write(datetime.now().isoformat())
                logger.info(f"Created state file: {file_path}")
            except Exception as e:
                logger.error(f"Failed to create state file {file_path}: {e}")
