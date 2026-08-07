# Split Plan: Complex Modules

## Overview

Six files have grown beyond a maintainable size. Each will be split by responsibility into smaller, independently testable modules while preserving every existing import path (backward-compatible via `__init__.py` re-exports or domain module re-exports).

---

## 1. `backend/routers/chat.py` (1,454 lines → 2 files)

**Current**: 7 routes + 9 helper functions + 2 tool definitions + streaming generator in one file.

| New File | Contents | ~Lines |
|---|---|---|
| `routers/chat.py` | 7 route endpoints: `create_chat_session`, `get_chat_sessions`, `get_chat_messages`, `delete_chat_session`, `update_chat_session`, `create_message`, `search_chat_sessions` | ~470 |
| `services/chat_streaming_service.py` | Streaming generator, `execute_draw_cards_tool`, `handle_llm_tool_calls`, OpenAI record helpers, `load_system_prompt`, `DRAW_CARDS_TOOL`, `RENAME_CHAT_TOOL`, `validate_chat_session_exists`, in-memory rate limiter | ~980 |

**Rationale**: The streaming logic and tool execution are a self-contained unit — no FastAPI routing dependency, just `TarotReader`, settings, and models. Extracting makes the router thin and the streaming service independently testable.

---

## 2. `backend/routers/auth.py` (1,254 lines → 3 files)

**Current**: 13 routes + token creation + session management + password reset + auth dependencies jumbled together.

| New File | Contents | ~Lines |
|---|---|---|
| `routers/auth.py` | 13 route endpoints only (`register`, `login`, `refresh_token`, `logout`, `logout_all`, `forgot_password`, `reset_password`, `get_current_user_profile`, `update_current_user_profile`, `get_available_decks`, `upload_avatar`, `delete_avatar`, `get_avatar`) | ~700 |
| `services/auth_service.py` | `create_access_token`, `create_refresh_token`, `hash_token`, `set_auth_cookies`, `clear_auth_cookies`, `revoke_session`, `revoke_user_sessions`, `generate_reset_token`, `send_reset_email`, time helpers (`_utc_now`, `_as_utc`, `_is_expired`, `_is_in_future`) | ~300 |
| `dependencies/auth.py` | `get_auth_token`, `get_current_user`, `get_optional_current_user`, `get_admin_user`, `oauth2_scheme`, `optional_oauth2_scheme` | ~130 |

**Rationale**: `get_current_user` is already cross-imported by other routers from `routers.auth`. Moving auth dependencies to `dependencies/auth.py` resolves that awkward import and makes auth logic usable anywhere without coupling to the auth router.

---

## 3. `backend/models.py` (1,130 lines → package of 7 files)

**Current**: All 24 SQLAlchemy models in one file.

| New File | Classes | ~Lines |
|---|---|---|
| `models/__init__.py` | Re-exports all models + shared `Base`, `_prepare_password` | ~25 |
| `models/user.py` | `User` | ~180 |
| `models/chat.py` | `ChatSession`, `Message`, `MessageCardAssociation` | ~120 |
| `models/tarot.py` | `Deck`, `Card`, `Spread` | ~170 |
| `models/auth.py` | `PasswordResetToken`, `AuthSession`, `WebPushSubscription` | ~100 |
| `models/payments.py` | `CheckoutSession`, `SubscriptionEvent`, `PaymentTransaction`, `TurnUsageHistory`, `SubscriptionPlan`, `EthereumTransaction` | ~340 |
| `models/engagement.py` | `SharedReading`, `UserReadingJournal`, `UserCardMeaning`, `UserReadingAnalytics`, `ReadingReminder`, `UserStreak`, `UserAchievement`, `DailyCardPull` | ~290 |

**Rationale**: Grouped by domain boundary. All cross-model relationships use string-based foreign keys already (e.g., `ForeignKey("users.id")`), so they resolve fine across files. `from models import User` still works via `__init__.py`.

**Risk: Medium.** Verify all 13 `from models import ...` statements across routers and services still resolve after split.

---

## 4. `backend/services/subscription_service.py` (761 lines → 3 files)

**Current**: Monolithic `SubscriptionService` class with checkout, webhook processing, event handlers, turn management, and logging.

| New File | Contents | ~Lines |
|---|---|---|
| `services/subscription_service.py` | `SubscriptionService` as coordinator — checkout methods, `log_subscription_event`, delegates to handler and turn manager | ~250 |
| `services/subscription_webhook_handler.py` | `process_webhook_event`, `_handle_subscription_created_updated`, `_handle_subscription_cancelled`, `_handle_subscription_resumed`, `_handle_order_created`, user-matching logic | ~350 |
| `services/subscription_turn_manager.py` | `consume_user_turn`, turn validation, free/paid tier logic | ~160 |

**Rationale**: Pure organizational split by responsibility. All modules receive the same `db` and config. `SubscriptionService` becomes a thin coordinator.

---

## 5. `backend/tarot_reader.py` (517 lines → 2 files)

**Current**: One `TarotReader` class with deck initialization, card loading, Monte Carlo shuffling, and AI reading generation.

| New File | Contents | ~Lines |
|---|---|---|
| `services/tarot_deck.py` | `TarotDeck` class — `__init__`, `_load_image_urls`, `_load_cards_from_json`, `_load_cards`, `shuffle_and_draw` | ~270 |
| `services/tarot_reader.py` | `TarotReader` class — `create_reading`, `create_compatibility_reading`, `stream_reading`, `stream_compatibility_reading`, retry logic, cost tracking | ~250 |

**Rationale**: Deck operations (shuffling, loading) are pure data operations with no AI dependency. Reading generation depends on LangChain + OpenAI. Separating makes deck logic testable without mocking the LLM, and the reading generator testable with a mock deck.

---

## 6. `frontend/src/lib/api.ts` (813 lines → 10 files)

**Current**: Single file with axios instance, interceptors, and 9 domain-specific API modules.

| New File | Contents | ~Lines |
|---|---|---|
| `lib/api.ts` | Axios instance, CSRF helper, 401 interceptor with queue, `setGlobalLogoutCallback`, re-exports all domain modules | ~120 |
| `lib/api/auth.ts` | `auth` object — login, refresh, register, forgot/reset password, profile, avatar | ~180 |
| `lib/api/chat.ts` | `chat` object — sessions CRUD, messages, search | ~45 |
| `lib/api/tarot.ts` | `tarot` object — readings, card-of-day, spreads, draw | ~150 |
| `lib/api/sharing.ts` | `sharing` object — create/delete share links, fetch shared reading | ~40 |
| `lib/api/subscription.ts` | `subscription` object — plans, checkout, history, MetaMask payments | ~105 |
| `lib/api/journal.ts` | `journal` object — entries CRUD, card meanings, analytics, reminders | ~140 |
| `lib/api/dashboard.ts` | `dashboardStats` object | ~10 |
| `lib/api/streaks.ts` | `streaks` object | ~20 |
| `lib/api/webPush.ts` | `webPush` object | ~20 |

**Rationale**: Each domain module imports the shared `api` (axios instance) and returns the same object shape. All existing imports like `import { auth, chat } from '@/lib/api'` continue working via re-exports from `lib/api.ts`.

---

## Execution Strategy

Split one module at a time, running the full test suite after each:

```
1. models.py (highest blast radius — do first)
2. auth.py (depends on models, creates new dependencies/ module)
3. subscription_service.py
4. tarot_reader.py
5. chat.py (depends on tarot_reader)
6. api.ts (frontend, zero backend impact)
```

Each split should be a single commit. All existing import paths stay valid — no callers need changing.
