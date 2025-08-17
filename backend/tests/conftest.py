import os
import sys
from pathlib import Path
os.environ["FASTAPI_ENV"] = "local"
os.environ["MAIL_FROM"] = "test@example.com"
# Add project root to sys.path for absolute imports
sys.path.insert(0, str(Path(__file__).parent.parent.absolute()))

# PATCH limiter.limit BEFORE importing app/routers
from utils.rate_limiter import limiter
original_limit = limiter.limit

def no_limit(*args, **kwargs):
    def decorator(func):
        return func
    return decorator
limiter.limit = no_limit

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from unittest.mock import patch, MagicMock
import asyncio
from fastapi import Request
from slowapi.util import get_remote_address

from models import Base
from database import get_db
from app import app
from routers.auth import create_access_token
from tests.factories import UserFactory, ChatSessionFactory, CardFactory

# Create test database - use persistent file for CI, in-memory for local
if os.getenv("CI") == "true":
    SQLALCHEMY_DATABASE_URL = "sqlite:///./tarot.db"
else:
    SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
    echo=False  # Disable SQL echo in tests
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def mock_request():
    """Create a mock request object for rate limiting"""
    request = MagicMock(spec=Request)
    request.client = MagicMock()
    request.client.host = "127.0.0.1"
    request.headers = {}
    request.scope = {"type": "http", "client": ("127.0.0.1", 12345)}
    return request


@pytest.fixture(scope="function")
def db_session():
    if os.getenv("CI") == "true":
        # In CI, use the existing migrated database but clean data between tests
        session = TestingSessionLocal()
        try:
            # Clean up all data before each test to ensure isolation
            for table in reversed(Base.metadata.sorted_tables):
                if table.name != 'alembic_version':  # Don't delete migration version
                    session.execute(table.delete())
            session.commit()
            yield session
        finally:
            session.close()
    else:
        # In local development, create/drop tables for each test
        Base.metadata.create_all(bind=engine)
        session = TestingSessionLocal()
        try:
            yield session
        finally:
            session.close()
            Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def mock_celery_app():
    """Mock the entire Celery app to prevent Redis connections"""
    with patch('celery_app.celery_app') as mock_app:
        mock_result = MagicMock()
        mock_result.id = "mock-task-id-123"

        # Mock the delay methods to return mock results
        mock_app.control.revoke.return_value = None
        mock_app.control.inspect.return_value.active.return_value = {}
        mock_app.control.inspect.return_value.stats.return_value = {}

        # Mock task delay methods
        def create_mock_delay_method(task_id):
            def mock_delay(*args, **kwargs):
                result = MagicMock()
                result.id = task_id
                return result
            return mock_delay

        # Mock all task imports to prevent actual Celery imports
        with patch.dict('sys.modules', {
            'tasks.email_tasks': MagicMock(),
            'tasks.notification_tasks': MagicMock(),
        }):
            yield mock_app


@pytest.fixture(scope="function")
def client(db_session, mock_celery_app):
    def override_get_db():
        try:
            yield db_session
        finally:
            db_session.close()

    def override_get_request():
        return mock_request

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[Request] = override_get_request
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture(scope="function")
def mock_celery_tasks(mock_celery_app):
    """Mock Celery task managers to return predictable results"""
    with patch('utils.celery_utils.email_task_manager') as mock_email_mgr, \
         patch('utils.celery_utils.notification_task_manager') as mock_notif_mgr, \
         patch('utils.celery_utils.task_manager') as mock_task_mgr:

        # Mock email task manager methods
        mock_email_mgr.send_password_reset_email_async.return_value = "mock-task-id-123"
        mock_email_mgr.send_welcome_email_async.return_value = "mock-task-id-456"
        mock_email_mgr.send_bulk_email_async.return_value = "mock-task-id-789"

        # Mock notification task manager methods
        mock_notif_mgr.send_reading_reminder_async.return_value = "mock-reminder-task-123"
        mock_notif_mgr.process_daily_reminders_async.return_value = "mock-daily-task-456"
        mock_notif_mgr.send_system_notification_async.return_value = "mock-system-task-789"
        mock_notif_mgr.cleanup_old_tasks_async.return_value = "mock-cleanup-task-123"

        # Mock task manager methods
        mock_task_mgr.get_task_status.return_value = {
            "task_id": "mock-task-id",
            "status": "SUCCESS",
            "result": {"message": "Task completed successfully"}
        }
        mock_task_mgr.cancel_task.return_value = {
            "task_id": "mock-task-id",
            "status": "CANCELLED",
            "message": "Task has been cancelled"
        }
        mock_task_mgr.get_active_tasks.return_value = {"active_tasks": {}, "total_active": 0}
        mock_task_mgr.get_worker_stats.return_value = {"workers": {}, "total_workers": 0}

        yield {
            'email_manager': mock_email_mgr,
            'notification_manager': mock_notif_mgr,
            'task_manager': mock_task_mgr
        }


@pytest.fixture(scope="function")
def test_user(db_session):
    """Create a test user with hashed password"""
    return UserFactory.create(db=db_session, username="testuser", email="test@example.com")


@pytest.fixture(scope="function")
def test_user_2(db_session):
    """Create a second test user for multi-user scenarios"""
    return UserFactory.create(
        db=db_session,
        username="testuser2",
        email="test2@example.com"
    )


@pytest.fixture(scope="function")
def auth_headers(test_user):
    """Create authentication headers for test user"""
    token = create_access_token(data={"sub": test_user.username})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="function")
def auth_headers_2(test_user_2):
    """Create authentication headers for second test user"""
    token = create_access_token(data={"sub": test_user_2.username})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="function")
def invalid_auth_headers():
    """Create invalid authentication headers"""
    return {"Authorization": "Bearer invalid_token"}


@pytest.fixture(scope="function")
def test_cards(db_session):
    """Create test cards in the database"""
    return CardFactory.create_default_cards(db_session)


@pytest.fixture(scope="function")
def test_chat_session(db_session, test_user):
    """Create a test chat session"""
    return ChatSessionFactory.create(
        db=db_session,
        user_id=test_user.id
    )


@pytest.fixture(scope="function")
def test_password_reset_token(db_session, test_user):
    """Create a test password reset token"""
    from datetime import datetime, timedelta
    from tests.factories import PasswordResetTokenFactory

    return PasswordResetTokenFactory.create(
        db=db_session,
        user_id=test_user.id,
        expires_at=datetime.utcnow() + timedelta(hours=1)
    )


@pytest.fixture(scope="function")
def mock_tarot_reader():
    """Mock the TarotReader to avoid external dependencies"""
    base_cards = [
        {
            "name": "The Fool",
            "orientation": "upright",
            "meaning": "New beginnings and fresh starts"
        },
        {
            "name": "The Magician",
            "orientation": "reversed",
            "meaning": "Manipulation and poor planning"
        },
        {
            "name": "Three of Cups",
            "orientation": "upright",
            "meaning": "Friendship and community support"
        },
        {
            "name": "The Star",
            "orientation": "upright",
            "meaning": "Hope and inspiration"
        },
        {
            "name": "Ten of Pentacles",
            "orientation": "reversed",
            "meaning": "Financial difficulties"
        },
        {
            "name": "The High Priestess",
            "orientation": "upright",
            "meaning": "Intuition and inner wisdom"
        },
        {
            "name": "Seven of Swords",
            "orientation": "reversed",
            "meaning": "Truth revealed"
        },
        {
            "name": "The Hermit",
            "orientation": "upright",
            "meaning": "Soul searching and introspection"
        },
        {
            "name": "Ace of Wands",
            "orientation": "upright",
            "meaning": "New creative opportunities"
        },
        {
            "name": "Five of Cups",
            "orientation": "reversed",
            "meaning": "Recovery and moving forward"
        }
    ]

    def mock_shuffle_and_draw(num_cards, spread=None):
        # Always return successful cards - this makes tests more predictable
        selected_cards = []
        for i in range(num_cards):
            card = base_cards[i % len(base_cards)].copy()
            if spread:
                positions = spread.get_positions() if hasattr(spread, 'get_positions') else []
                if i < len(positions):
                    position = positions[i]
                    card["position"] = position["name"]
                    card["position_description"] = position["description"]
                    card["position_index"] = position["index"]
                    card["position_x"] = position["x"]
                    card["position_y"] = position["y"]
                else:
                    card["position"] = f"Card {i + 1}"
                    card["position_description"] = f"Card {i + 1} in the reading"
                    card["position_index"] = i
            else:
                card["position"] = f"Card {i + 1}"
                card["position_description"] = f"Card {i + 1} in the reading"
                card["position_index"] = i
            selected_cards.append(card)
        return selected_cards

    with patch('routers.tarot.TarotReader') as mock_reader_class:
        mock_instance = mock_reader_class.return_value
        mock_instance.shuffle_and_draw = mock_shuffle_and_draw
        # Also mock the constructor to always succeed
        mock_reader_class.return_value = mock_instance
        yield mock_instance


@pytest.fixture(scope="function")
def mock_openai():
    """Mock OpenAI responses for chat functionality"""
    with patch('routers.chat.ChatOpenAI') as mock_llm, \
         patch('openai.OpenAI') as mock_client, \
         patch('langchain_openai.ChatOpenAI') as mock_langchain, \
         patch('utils.metrics.track_openai_request') as mock_track:

        # Mock the ChatOpenAI instance
        mock_instance = mock_llm.return_value

        # Default response for invoke
        mock_instance.invoke.return_value = type('obj', (object,), {
            'content': "Thank you for your question. I can help you with a tarot reading.",
            'tool_calls': None
        })()

        # Default response for stream
        mock_instance.stream.return_value = [
            "Thank you for your question. ",
            "I can help you with a tarot reading."
        ]

        def set_invoke_response(content, tool_calls=None):
            mock_instance.invoke.return_value = type('obj', (object,), {
                'content': content,
                'tool_calls': tool_calls
            })()

        def set_stream_response(chunks):
            mock_instance.stream.return_value = chunks

        mock_instance.set_invoke_response = set_invoke_response
        mock_instance.set_stream_response = set_stream_response

        # Mock the OpenAI client
        mock_client_instance = mock_client.return_value
        mock_client_instance.chat.completions.create.return_value = type('obj', (object,), {
            'choices': [
                type('obj', (object,), {
                    'message': type('obj', (object,), {
                        'content': "Thank you for your question. I can help you with a tarot reading.",
                        'tool_calls': None
                    })()
                })()
            ]
        })()

        # Mock the Langchain ChatOpenAI
        mock_langchain_instance = mock_langchain.return_value
        mock_langchain_instance.invoke.return_value = type('obj', (object,), {
            'content': "Thank you for your question. I can help you with a tarot reading.",
            'tool_calls': None
        })()

        # Default streaming response for langchain
        mock_langchain_instance.stream.return_value = [
            type('obj', (object,), {'content': 'Hello, '})(),
            type('obj', (object,), {'content': 'I can help '})(),
            type('obj', (object,), {'content': 'with tarot guidance.'})()
        ]

        # Mock astream for async streaming
        async def mock_astream(*args, **kwargs):
            for chunk in mock_langchain_instance.stream.return_value:
                yield chunk
                await asyncio.sleep(0)

        mock_langchain_instance.astream = mock_astream

        # Mock metrics tracking
        mock_track.return_value = None

        yield mock_instance


@pytest.fixture(autouse=True)
def disable_rate_limiting():
    """Clear user_request_counts for custom chat limiter"""
    from routers.chat import user_request_counts
    user_request_counts.clear()
    yield

# Restore limiter after all tests (optional, for safety)
def pytest_sessionfinish(session, exitstatus):
    limiter.limit = original_limit
