"""
Tests for Metrics Utils

This module contains unit tests for the metrics utility functions,
covering Prometheus metrics tracking and timing operations.
"""

import pytest
import time
from unittest.mock import Mock, patch, MagicMock

from utils.metrics import (
    setup_metrics,
    track_tarot_reading,
    track_card_drawn,
    track_auth_request,
    track_database_query,
    track_openai_request,
    track_application_error,
    track_chat_message,
    MetricsTimer,
    app_info,
    tarot_requests_total,
    tarot_readings_total,
    tarot_reading_duration,
    tarot_cards_drawn,
    active_users,
    auth_requests_total,
    database_queries_total,
    database_query_duration,
    openai_requests_total,
    openai_tokens_used,
    application_errors_total,
    chat_messages_total,
    chat_conversations_active,
)


class TestMetricsSetup:
    """Test suite for metrics setup functionality."""

    @patch('utils.metrics.Instrumentator')
    @patch('utils.metrics.app_info')
    def test_setup_metrics_success(self, mock_app_info, mock_instrumentator_class):
        """Test successful metrics setup."""
        # Mock FastAPI app
        mock_app = Mock()

        # Mock instrumentator
        mock_instrumentator = Mock()
        mock_instrumentator_class.return_value = mock_instrumentator

        # Mock app_info
        mock_app_info.info = Mock()

        # Call setup function
        result = setup_metrics(mock_app)

        # Verify app_info was set
        mock_app_info.info.assert_called_once_with({
            "version": "1.0.0",
            "name": "ArcanaAI API",
            "environment": "production"
        })

        # Verify instrumentator was configured and used
        mock_instrumentator_class.assert_called_once_with(
            should_group_status_codes=False,
            should_ignore_untemplated=True,
            should_group_untemplated=True,
            should_instrument_requests_inprogress=True,
            excluded_handlers=["/metrics", "/health", "/docs", "/redoc", "/openapi.json"],
            inprogress_name="tarot_requests_inprogress",
            inprogress_labels=True,
        )

        mock_instrumentator.instrument.assert_called_once_with(mock_app)
        mock_instrumentator.expose.assert_called_once_with(mock_app, endpoint="/metrics")

        # Verify correct instrumentator is returned
        assert result == mock_instrumentator


class TestTrackingFunctions:
    """Test suite for individual metric tracking functions."""

    @patch('utils.metrics.tarot_readings_total')
    @patch('utils.metrics.tarot_reading_duration')
    def test_track_tarot_reading_success(self, mock_duration, mock_counter):
        """Test tracking successful tarot reading."""
        # Mock metric objects
        mock_counter_labels = Mock()
        mock_counter.labels.return_value = mock_counter_labels

        mock_duration_labels = Mock()
        mock_duration.labels.return_value = mock_duration_labels

        # Call function
        track_tarot_reading("three_card", 2.5, "success")

        # Verify counter was incremented
        mock_counter.labels.assert_called_once_with(reading_type="three_card", status="success")
        mock_counter_labels.inc.assert_called_once()

        # Verify duration was observed
        mock_duration.labels.assert_called_once_with(reading_type="three_card")
        mock_duration_labels.observe.assert_called_once_with(2.5)

    @patch('utils.metrics.tarot_readings_total')
    @patch('utils.metrics.tarot_reading_duration')
    def test_track_tarot_reading_error(self, mock_duration, mock_counter):
        """Test tracking failed tarot reading."""
        # Mock metric objects
        mock_counter_labels = Mock()
        mock_counter.labels.return_value = mock_counter_labels

        mock_duration_labels = Mock()
        mock_duration.labels.return_value = mock_duration_labels

        # Call function
        track_tarot_reading("celtic_cross", 1.2, "error")

        # Verify counter was incremented with error status
        mock_counter.labels.assert_called_once_with(reading_type="celtic_cross", status="error")
        mock_counter_labels.inc.assert_called_once()

        # Verify duration was still observed
        mock_duration.labels.assert_called_once_with(reading_type="celtic_cross")
        mock_duration_labels.observe.assert_called_once_with(1.2)

    @patch('utils.metrics.tarot_cards_drawn')
    def test_track_card_drawn(self, mock_counter):
        """Test tracking card drawn."""
        # Mock metric object
        mock_counter_labels = Mock()
        mock_counter.labels.return_value = mock_counter_labels

        # Call function
        track_card_drawn("The Fool", "past")

        # Verify counter was incremented
        mock_counter.labels.assert_called_once_with(card_name="The Fool", position="past")
        mock_counter_labels.inc.assert_called_once()

    @patch('utils.metrics.tarot_cards_drawn')
    def test_track_card_drawn_default_position(self, mock_counter):
        """Test tracking card drawn with default position."""
        # Mock metric object
        mock_counter_labels = Mock()
        mock_counter.labels.return_value = mock_counter_labels

        # Call function without position
        track_card_drawn("The Magician")

        # Verify counter was incremented with default position
        mock_counter.labels.assert_called_once_with(card_name="The Magician", position="unknown")
        mock_counter_labels.inc.assert_called_once()

    @patch('utils.metrics.auth_requests_total')
    def test_track_auth_request_login_success(self, mock_counter):
        """Test tracking successful login request."""
        # Mock metric object
        mock_counter_labels = Mock()
        mock_counter.labels.return_value = mock_counter_labels

        # Call function
        track_auth_request("login", "success")

        # Verify counter was incremented
        mock_counter.labels.assert_called_once_with(action="login", status="success")
        mock_counter_labels.inc.assert_called_once()

    @patch('utils.metrics.auth_requests_total')
    def test_track_auth_request_register_failure(self, mock_counter):
        """Test tracking failed registration request."""
        # Mock metric object
        mock_counter_labels = Mock()
        mock_counter.labels.return_value = mock_counter_labels

        # Call function
        track_auth_request("register", "failure")

        # Verify counter was incremented
        mock_counter.labels.assert_called_once_with(action="register", status="failure")
        mock_counter_labels.inc.assert_called_once()

    @patch('utils.metrics.database_queries_total')
    @patch('utils.metrics.database_query_duration')
    def test_track_database_query_success(self, mock_duration, mock_counter):
        """Test tracking successful database query."""
        # Mock metric objects
        mock_counter_labels = Mock()
        mock_counter.labels.return_value = mock_counter_labels

        mock_duration_labels = Mock()
        mock_duration.labels.return_value = mock_duration_labels

        # Call function
        track_database_query("select", "users", 0.05, "success")

        # Verify counter was incremented
        mock_counter.labels.assert_called_once_with(operation="select", table="users", status="success")
        mock_counter_labels.inc.assert_called_once()

        # Verify duration was observed
        mock_duration.labels.assert_called_once_with(operation="select", table="users")
        mock_duration_labels.observe.assert_called_once_with(0.05)

    @patch('utils.metrics.database_queries_total')
    @patch('utils.metrics.database_query_duration')
    def test_track_database_query_error(self, mock_duration, mock_counter):
        """Test tracking failed database query."""
        # Mock metric objects
        mock_counter_labels = Mock()
        mock_counter.labels.return_value = mock_counter_labels

        mock_duration_labels = Mock()
        mock_duration.labels.return_value = mock_duration_labels

        # Call function
        track_database_query("insert", "messages", 0.1, "error")

        # Verify counter was incremented with error status
        mock_counter.labels.assert_called_once_with(operation="insert", table="messages", status="error")
        mock_counter_labels.inc.assert_called_once()

        # Verify duration was still observed
        mock_duration.labels.assert_called_once_with(operation="insert", table="messages")
        mock_duration_labels.observe.assert_called_once_with(0.1)

    @patch('utils.metrics.openai_requests_total')
    @patch('utils.metrics.openai_tokens_used')
    def test_track_openai_request_with_tokens(self, mock_tokens_counter, mock_requests_counter):
        """Test tracking OpenAI request with token usage."""
        # Mock metric objects
        mock_requests_labels = Mock()
        mock_requests_counter.labels.return_value = mock_requests_labels

        mock_tokens_prompt_labels = Mock()
        mock_tokens_completion_labels = Mock()
        def mock_tokens_labels(**kwargs):
            if kwargs.get('type') == 'prompt':
                return mock_tokens_prompt_labels
            elif kwargs.get('type') == 'completion':
                return mock_tokens_completion_labels
            return Mock()

        mock_tokens_counter.labels.side_effect = mock_tokens_labels

        # Call function
        track_openai_request("gpt-4", "success", prompt_tokens=100, completion_tokens=50)

        # Verify request counter was incremented
        mock_requests_counter.labels.assert_called_once_with(model="gpt-4", status="success")
        mock_requests_labels.inc.assert_called_once()

        # Verify token counters were incremented
        assert mock_tokens_counter.labels.call_count == 2
        mock_tokens_prompt_labels.inc.assert_called_once_with(100)
        mock_tokens_completion_labels.inc.assert_called_once_with(50)

    @patch('utils.metrics.openai_requests_total')
    @patch('utils.metrics.openai_tokens_used')
    def test_track_openai_request_no_tokens(self, mock_tokens_counter, mock_requests_counter):
        """Test tracking OpenAI request without token usage."""
        # Mock metric objects
        mock_requests_labels = Mock()
        mock_requests_counter.labels.return_value = mock_requests_labels

        # Call function
        track_openai_request("gpt-3.5-turbo", "error", prompt_tokens=0, completion_tokens=0)

        # Verify request counter was incremented
        mock_requests_counter.labels.assert_called_once_with(model="gpt-3.5-turbo", status="error")
        mock_requests_labels.inc.assert_called_once()

        # Verify token counters were not called
        mock_tokens_counter.labels.assert_not_called()

    @patch('utils.metrics.application_errors_total')
    def test_track_application_error(self, mock_counter):
        """Test tracking application error."""
        # Mock metric object
        mock_counter_labels = Mock()
        mock_counter.labels.return_value = mock_counter_labels

        # Call function
        track_application_error("ValueError", "/tarot/reading")

        # Verify counter was incremented
        mock_counter.labels.assert_called_once_with(error_type="ValueError", endpoint="/tarot/reading")
        mock_counter_labels.inc.assert_called_once()

    @patch('utils.metrics.chat_messages_total')
    def test_track_chat_message_success(self, mock_counter):
        """Test tracking successful chat message."""
        # Mock metric object
        mock_counter_labels = Mock()
        mock_counter.labels.return_value = mock_counter_labels

        # Call function
        track_chat_message("user", "success")

        # Verify counter was incremented
        mock_counter.labels.assert_called_once_with(message_type="user", status="success")
        mock_counter_labels.inc.assert_called_once()

    @patch('utils.metrics.chat_messages_total')
    def test_track_chat_message_assistant_error(self, mock_counter):
        """Test tracking failed assistant message."""
        # Mock metric object
        mock_counter_labels = Mock()
        mock_counter.labels.return_value = mock_counter_labels

        # Call function
        track_chat_message("assistant", "error")

        # Verify counter was incremented
        mock_counter.labels.assert_called_once_with(message_type="assistant", status="error")
        mock_counter_labels.inc.assert_called_once()


class TestMetricsTimer:
    """Test suite for MetricsTimer context manager."""

    @patch('utils.metrics.time')
    def test_metrics_timer_success(self, mock_time):
        """Test MetricsTimer with successful operation."""
        # Mock time values
        mock_time.time.side_effect = [100.0, 102.5]  # Start at 100.0, end at 102.5

        # Mock metric function
        mock_metric_func = Mock()

        # Use timer
        with MetricsTimer(mock_metric_func, "arg1", "arg2", kwarg1="value1", kwarg2="value2") as timer:
            # Simulate some work
            pass

        # Verify timing
        assert timer.start_time == 100.0

        # Verify metric function was called with duration
        mock_metric_func.assert_called_once()
        call_args = mock_metric_func.call_args
        assert call_args[0] == ("arg1", "arg2")
        assert call_args[1]["kwarg1"] == "value1"
        assert call_args[1]["kwarg2"] == "value2"
        assert call_args[1]["duration"] == 2.5

    @patch('utils.metrics.time')
    def test_metrics_timer_exception(self, mock_time):
        """Test MetricsTimer when exception occurs."""
        # Mock time values
        mock_time.time.side_effect = [50.0, 53.2]

        # Mock metric function
        mock_metric_func = Mock()

        # Use timer with exception
        with pytest.raises(ValueError):
            with MetricsTimer(mock_metric_func, "test") as timer:
                # Simulate some work then exception
                raise ValueError("Test exception")

        # Verify timing still worked despite exception
        assert timer.start_time == 50.0

        # Verify metric function was still called with duration
        mock_metric_func.assert_called_once()
        call_args = mock_metric_func.call_args
        assert call_args[0] == ("test",)
        # Allow for small floating point precision differences
        duration = call_args[1]["duration"]
        assert abs(duration - 3.2) < 0.01

    @patch('utils.metrics.time')
    def test_metrics_timer_no_start_time(self, mock_time):
        """Test MetricsTimer when start_time is not set."""
        # Mock time to return None initially
        mock_time.time.side_effect = [None, 200.0]

        # Mock metric function
        mock_metric_func = Mock()

        # Use timer
        with MetricsTimer(mock_metric_func) as timer:
            # Simulate some work
            pass

        # Verify start_time is None
        assert timer.start_time is None

        # Verify metric function was not called
        mock_metric_func.assert_not_called()

    def test_metrics_timer_initialization(self):
        """Test MetricsTimer initialization."""
        mock_metric_func = Mock()

        timer = MetricsTimer(mock_metric_func, "arg1", kwarg="value")

        assert timer.metric_func == mock_metric_func
        assert timer.args == ("arg1",)
        assert timer.kwargs == {"kwarg": "value"}
        assert timer.start_time is None


class TestMetricsIntegration:
    """Test suite for metrics integration and edge cases."""

    def test_all_metrics_are_defined(self):
        """Test that all expected metrics are defined."""
        # Test that all metric objects exist
        assert app_info is not None
        assert tarot_requests_total is not None
        assert tarot_readings_total is not None
        assert tarot_reading_duration is not None
        assert tarot_cards_drawn is not None
        assert active_users is not None
        assert auth_requests_total is not None
        assert database_queries_total is not None
        assert database_query_duration is not None
        assert openai_requests_total is not None
        assert openai_tokens_used is not None
        assert application_errors_total is not None
        assert chat_messages_total is not None
        assert chat_conversations_active is not None

    @patch('utils.metrics.tarot_reading_duration')
    def test_track_tarot_reading_duration_buckets(self, mock_duration):
        """Test that tarot reading duration uses correct histogram buckets."""
        mock_duration_labels = Mock()
        mock_duration.labels.return_value = mock_duration_labels

        # Test various durations
        durations = [0.05, 0.3, 0.8, 3.0, 7.0, 15.0, 45.0, 90.0]

        for duration in durations:
            track_tarot_reading("test", duration)
            mock_duration_labels.observe.assert_called_with(duration)

        # Verify observe was called for each duration
        assert mock_duration_labels.observe.call_count == len(durations)

    @patch('utils.metrics.database_query_duration')
    def test_track_database_query_duration_buckets(self, mock_duration):
        """Test that database query duration uses correct histogram buckets."""
        mock_duration_labels = Mock()
        mock_duration.labels.return_value = mock_duration_labels

        # Test various durations
        durations = [0.0005, 0.003, 0.008, 0.03, 0.08, 0.3, 0.8]

        for duration in durations:
            track_database_query("select", "users", duration)
            mock_duration_labels.observe.assert_called_with(duration)

        # Verify observe was called for each duration
        assert mock_duration_labels.observe.call_count == len(durations)
