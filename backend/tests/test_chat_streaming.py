from unittest.mock import MagicMock, patch

from models import Message


def test_non_tool_response_uses_the_tool_decision_response(
    client, auth_headers, test_chat_session, db_session
):
    session_id = test_chat_session.id
    llm = MagicMock()
    llm_response = MagicMock()
    llm_response.content = "A thoughtful answer from the model."
    llm_response.tool_calls = []
    llm_response.usage_metadata = {}
    llm_response.response_metadata = {}
    llm.bind_tools.return_value = llm
    llm.invoke.return_value = llm_response

    async def empty_stream(*args, **kwargs):
        yield MagicMock(content="")

    llm.astream = empty_stream

    with patch("routers.chat.ChatOpenAI", return_value=llm):
        response = client.post(
            f"/chat/sessions/{session_id}/messages/",
            json={"content": "Hello"},
            headers=auth_headers,
        )

    assert response.status_code == 200
    assert "A thoughtful answer from the model." in response.text
    assert (
        db_session.query(Message)
        .filter(Message.chat_session_id == session_id, Message.role == "assistant")
        .one()
        .content
        == "A thoughtful answer from the model."
    )


def test_empty_llm_stream_saves_a_non_empty_fallback_message(
    client, auth_headers, test_chat_session, db_session
):
    session_id = test_chat_session.id
    llm = MagicMock()
    llm_response = MagicMock()
    llm_response.content = ""
    llm_response.tool_calls = []
    llm_response.usage_metadata = {}
    llm_response.response_metadata = {}
    llm.bind_tools.return_value = llm
    llm.invoke.return_value = llm_response

    async def empty_stream(*args, **kwargs):
        yield MagicMock(content="")

    llm.astream = empty_stream

    with patch("routers.chat.ChatOpenAI", return_value=llm):
        response = client.post(
            f"/chat/sessions/{session_id}/messages/",
            json={"content": "Hello"},
            headers=auth_headers,
        )

    assert response.status_code == 200
    assert '"type": "assistant_message"' in response.text

    messages = (
        db_session.query(Message)
        .filter(Message.chat_session_id == session_id)
        .order_by(Message.id)
        .all()
    )
    assert [message.role for message in messages] == ["user", "assistant"]
    assert messages[-1].content.strip()
