"""Content safety screening for user inputs and AI responses.

Detects potentially sensitive topics (crisis, medical, legal, financial) in
user messages and provides appropriate disclaimers and crisis resources.
"""

# --- Keyword detection ---

CRISIS_KEYWORDS = [
    "suicide", "kill myself", "end my life", "end my own life",
    "self-harm", "self harm", "want to die", "don't want to live",
    "no reason to live", "hurt myself", "cut myself", "overdose",
    "hang myself", "jump off", "end it all", "killing myself",
]

MEDICAL_KEYWORDS = [
    "diagnose", "diagnosis", "symptom", "disease", "cancer", "tumor",
    "prescription", "medication", "treatment", "should i see a doctor",
    "medical advice", "clinical", "sick with", "terminal",
]

LEGAL_KEYWORDS = [
    "sue", "lawsuit", "legal advice", "attorney", "lawyer",
    "court", "divorce lawyer", "custody battle", "suing",
    "legal action", "file a suit",
]

FINANCIAL_KEYWORDS = [
    "invest", "stock tip", "financial advice", "bankruptcy",
    "crypto advice", "should i buy", "stock market", "trading",
    "which stock", "investment advice",
]


def screen_content(text: str) -> list[str]:
    """Check user input for sensitive content categories.

    Args:
        text: The user's message text (case-insensitive matching).

    Returns:
        List of triggered category names (empty list if safe).
        Possible values: ``"crisis"``, ``"medical"``, ``"legal"``, ``"financial"``.
    """
    triggers: list[str] = []
    text_lower = text.lower()

    for kw in CRISIS_KEYWORDS:
        if kw in text_lower:
            triggers.append("crisis")
            break
    for kw in MEDICAL_KEYWORDS:
        if kw in text_lower:
            triggers.append("medical")
            break
    for kw in LEGAL_KEYWORDS:
        if kw in text_lower:
            triggers.append("legal")
            break
    for kw in FINANCIAL_KEYWORDS:
        if kw in text_lower:
            triggers.append("financial")
            break

    return triggers


# --- Messages ---

WELLBEING_DISCLAIMER = (
    "\n\n---\n*This reading is for entertainment and personal reflection purposes only. "
    "It is not a substitute for professional medical, legal, financial, or psychological advice. "
    "If you are experiencing a crisis, please contact a qualified professional or emergency service.*"
)

CRISIS_RESPONSE_PREFIX = (
    "I notice you may be going through a difficult time. While I'm here to "
    "offer tarot guidance for reflection, please know that I'm not a substitute "
    "for professional help. If you're in crisis, consider reaching out to a "
    "mental health professional or calling a crisis helpline.\n\n"
    "**Crisis Resources:**\n"
    "- National Suicide Prevention Lifeline: 988 (US)\n"
    "- Crisis Text Line: Text HOME to 741741\n"
    "- Samaritans: 116 123 (UK)\n\n"
    "I'll still provide your tarot reading as requested, with this context in mind.\n\n"
    "---\n\n"
)
