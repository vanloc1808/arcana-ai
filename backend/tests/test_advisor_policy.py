from prompts.advisor_policy import DEFAULT_CHAT_SYSTEM_PROMPT, REFLECTION_ADVISOR_POLICY
from routers.chat import DRAW_CARDS_TOOL, load_system_prompt


def test_system_prompt_contains_advisor_policy():
    prompt = load_system_prompt()

    assert "reflection advisor" in prompt
    assert "cannot determine future events" in prompt
    assert "Do not claim destiny" in prompt
    assert "Do not draw cards" in prompt


def test_fallback_policy_is_canonical():
    assert "reflection advisor" in DEFAULT_CHAT_SYSTEM_PROMPT
    assert REFLECTION_ADVISOR_POLICY in DEFAULT_CHAT_SYSTEM_PROMPT


def test_draw_cards_tool_is_reflection_oriented():
    description = DRAW_CARDS_TOOL["function"]["description"]

    assert "reflect" in description
    assert "predict future events" in description
    assert "reveal unknown facts" in description
