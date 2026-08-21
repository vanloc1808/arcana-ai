from utils.advisor_guardrails import inspect_advisor_output, safe_block_message


def test_detects_deterministic_claims():
    category, dangerous = inspect_advisor_output("The cards guarantee that you will definitely reconcile.")

    assert category == "deterministic_claim"
    assert dangerous is False


def test_detects_dangerous_high_stakes_claims():
    category, dangerous = inspect_advisor_output("The cards reveal that you will die soon.")

    assert category == "high_stakes_deterministic"
    assert dangerous is True
    assert "guaranteed prediction" in safe_block_message()


def test_allows_conditional_reflection():
    assert inspect_advisor_output("This card may invite reflection on communication.") == (None, False)
