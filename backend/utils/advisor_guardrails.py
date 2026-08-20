"""Defense-in-depth checks for deterministic or supernatural advisor output."""

import re

DETERMINISTIC_PATTERNS = (
    re.compile(r"\byou will definitely\b", re.IGNORECASE),
    re.compile(r"\bthe cards guarantee\b", re.IGNORECASE),
    re.compile(r"\bthis will happen\b", re.IGNORECASE),
    re.compile(r"\bthe cards reveal that\b", re.IGNORECASE),
    re.compile(r"\bthe cards confirm that\b", re.IGNORECASE),
    re.compile(r"\byou are destined to\b", re.IGNORECASE),
    re.compile(r"\byour destiny is\b", re.IGNORECASE),
)

DANGEROUS_PATTERNS = (
    re.compile(r"\bthe cards (?:say|show|reveal|confirm).{0,80}\b(?:die|death|survive|cancer|pregnan)", re.IGNORECASE),
    re.compile(r"\byou will (?:die|survive|recover|win your court case)\b", re.IGNORECASE),
)


def inspect_advisor_output(text: str) -> tuple[str | None, bool]:
    """Return the first matched category and whether the match is dangerous."""
    for pattern in DANGEROUS_PATTERNS:
        if pattern.search(text):
            return "high_stakes_deterministic", True
    for pattern in DETERMINISTIC_PATTERNS:
        if pattern.search(text):
            return "deterministic_claim", False
    return None, False


def safe_block_message() -> str:
    return (
        "I can’t present a Tarot interpretation as a guaranteed prediction or as proof of hidden facts. "
        "I can offer a symbolic reflection on the situation, possible perspectives, and choices within your control."
    )
