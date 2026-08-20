from utils.content_safety import is_predictive_request, screen_content


def test_crisis_is_detected():
    assert "crisis" in screen_content("I want to kill myself")


def test_high_stakes_prediction_is_detected():
    triggers = screen_content("Will my cancer go away?")

    assert "medical" in triggers
    assert "predictive_high_stakes" in triggers


def test_normal_reflection_is_not_high_stakes():
    assert screen_content("What can I reflect on about my relationship?") == []


def test_predictive_intent_is_observable_without_blocking_normal_questions():
    assert is_predictive_request("Will my ex come back?") is True
    assert screen_content("Will my ex come back?") == []


def test_regular_financial_question_remains_categorized():
    assert "financial" in screen_content("Should I buy Bitcoin?")
