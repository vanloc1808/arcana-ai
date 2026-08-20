"""Content safety screening for user inputs and AI responses.

Detects potentially sensitive topics (crisis, medical, legal, financial, and
high-stakes predictive requests) in user messages and provides appropriate
support-oriented responses.
"""

import re

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

PREDICTIVE_KEYWORDS = [
    "will", "going to", "happen", "outcome", "survive", "disappear", "cure",
    "how long", "when will", "am i going to", "should i", "can i know", "do i have",
]

HIGH_STAKES_PREDICTIVE_TOPICS = [
    "death", "die", "dying", "life expectancy", "pregnant", "pregnancy",
    "cancer", "tumor", "serious illness", "terminal", "diagnosis",
    "medical treatment", "court case", "court outcome", "criminal guilt",
    "lawsuit outcome", "investment", "stock", "bitcoin", "crypto",
    "trading outcome",
]

PREDICTIVE_REQUEST_PATTERNS = (
    re.compile(r"\bwill\s+(?:i|my|we|they|he|she|it)\b", re.IGNORECASE),
    re.compile(r"\bwhen\s+will\b", re.IGNORECASE),
    re.compile(r"\bwhat\s+will\s+happen\b", re.IGNORECASE),
    re.compile(r"\bam\s+i\s+going\s+to\b", re.IGNORECASE),
)


def is_predictive_request(text: str) -> bool:
    """Identify likely predictive intent for observability, not request blocking."""
    return any(pattern.search(text) for pattern in PREDICTIVE_REQUEST_PATTERNS)


def screen_content(text: str) -> list[str]:
    """Check user input for sensitive content categories.

    Args:
        text: The user's message text (case-insensitive matching).

    Returns:
        List of triggered category names (empty list if safe).
        Possible values: ``"crisis"``, ``"medical"``, ``"legal"``, ``"financial"``,
        and ``"predictive_high_stakes"``.
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

    has_predictive_language = any(kw in text_lower for kw in PREDICTIVE_KEYWORDS)
    has_high_stakes_topic = any(kw in text_lower for kw in HIGH_STAKES_PREDICTIVE_TOPICS)
    if has_predictive_language and has_high_stakes_topic:
        triggers.append("predictive_high_stakes")

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
    "I won't use Tarot to answer whether someone should live or die, or to predict survival. "
    "If you may act on these thoughts now, call emergency services or go to the nearest emergency department.\n\n"
    "---\n\n"
)

HIGH_STAKES_RESPONSE = (
    "Tarot cannot determine medical, legal, financial, or other high-stakes outcomes. "
    "I can help you reflect on questions to ask a qualified professional, observable factors, "
    "or practical choices within your control—but I won't provide a Tarot prediction or diagnosis."
)
