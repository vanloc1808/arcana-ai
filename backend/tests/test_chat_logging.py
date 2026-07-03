from routers.chat import _log_llm_tool_calls


def test_llm_tool_call_logging_accepts_structured_tool_call_payloads():
    tool_calls = [
        {
            "name": "draw_cards",
            "args": {"user_question": "test", "num_cards": 3},
            "id": "call_123",
        }
    ]

    _log_llm_tool_calls(tool_calls)
