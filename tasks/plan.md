# Implementation Plan: ArcanaAI Advisor-Only Refactor

## Overview

Refactor ArcanaAI so its Tarot functionality is clearly a hosted reflection and decision-support product rather than a fortune-telling service. Preserve card drawing, spreads, symbolism, relationship readings, streaming, and paid software access while preventing predictive, supernatural, hidden-fact, and high-stakes claims.

## Architecture Decisions

- Store the canonical advisor policy in `backend/prompts/advisor_policy.py` and reuse it for chat fallbacks and reading prompts.
- Keep high-stakes detection conservative and category-based; crisis takes priority over Tarot generation.
- Treat generated text as an untrusted boundary: log and count suspicious deterministic claims, with hard blocking only for clearly dangerous output.
- Use advisor-oriented product copy and describe paid access as hosted SaaS/software functionality, not a human consulting service.
- Do not rename canonical Tarot card meanings or unrelated technical uses of words such as “future”.

## Task List

### Phase 1: Policy Foundation

- [ ] Add centralized advisor policy and replace the system prompt.
- [ ] Make chat fallback and `draw_cards` use advisor language.
- [ ] Add prompt-version labels and advisor metrics.

### Phase 2: Reading Generation

- [ ] Refactor normal reading prompts.
- [ ] Deduplicate streaming and non-streaming compatibility prompts.
- [ ] Rename the compatibility position to `Possible Direction` in seed/migration/test/UI paths.

### Phase 3: Safety and Guardrails

- [ ] Extend content safety with high-stakes predictive detection.
- [ ] Stop Tarot generation on crisis input and return support-focused guidance.
- [ ] Add advisor output guardrails for non-streaming and streaming paths.
- [ ] Add focused backend behavior and regression tests.

### Phase 4: Product Positioning

- [ ] Update homepage, onboarding, pricing, reading, terms, README, and translations.
- [ ] Add a concise product disclaimer in appropriate user-facing locations.
- [ ] Ensure Lemon Squeezy-facing product language describes hosted software access rather than a service.

### Checkpoints

- [ ] Backend focused tests pass after policy/safety changes.
- [ ] Frontend tests, lint, and type-check pass after copy changes.
- [ ] Full verification and repo-wide copy audit complete.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Prompt paths drift | High | Shared policy constants/builders and prompt regression tests |
| Crisis user receives Tarot guidance | High | Early return before tool binding/generation |
| Guardrails damage legitimate symbolism | Medium | Match only strong deterministic patterns and log triggers |
| Lemon Squeezy classifies the product as a prohibited service | High | Market as hosted SaaS/software; request merchant review with an accurate description |
| Existing Tarot UX regresses | Medium | Preserve card mechanics and run existing frontend/backend tests |

## Open Questions

- Lemon Squeezy approval remains a business/platform decision; code changes cannot guarantee approval.
- Existing crypto/MetaMask payment code may need separate removal or migration because Lemon Squeezy lists NFT/crypto-related products as prohibited; this implementation should not silently remove that payment path without confirming the desired billing migration.
