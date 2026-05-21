# ArcanaAI — Feature Recommendations

This document proposes new features for ArcanaAI, organized by impact and effort. It complements `implementation-guide.md` (which covers the in-progress admin subscription dashboard, message encryption at rest, and AI usage monitoring) and avoids duplicating those efforts.

The repository today is a feature-complete MVP with:

- FastAPI backend, Next.js 15 frontend, PostgreSQL/SQLite, Redis + Celery
- AI-powered readings via OpenAI GPT-4.1-mini + LangChain
- Chat sessions, personal journal, multiple decks/spreads
- Dual payments (Lemon Squeezy + MetaMask/Ethereum), turn-based subscriptions
- Admin panel, public sharing, support tickets, reminders, Prometheus/Grafana

The recommendations below extend that base.

---

## Priority matrix

| Status | #  | Feature                                  | Impact | Effort | Premium fit |
|--------|----|------------------------------------------|--------|--------|-------------|
| ✅     | 1  | Daily streaks & achievements             | High   | Medium | No          |
| ✅     | 2  | Reading tags + advanced journal search   | High   | Medium | Partial     |
| ✅     | 3  | Compatibility / relationship readings    | High   | Medium | Yes         |
| ✅     | 4  | PWA + push notifications                 | High   | Medium | No          |
| ☐      | 5  | Public reading feed / community gallery  | Medium | Medium | No          |
| ☐      | 6  | Referral program                         | Medium | Low    | No          |
| ☐      | 7  | Weekly email digest                      | Medium | Low    | No          |
| ☐      | 8  | Personalized reader personas             | High   | Low    | Yes         |
| ☐      | 9  | Voice readings (TTS)                     | High   | Low    | Yes         |
| ☐      | 10 | Semantic journal search (embeddings)     | Medium | Medium | Yes         |
| ☐      | 11 | PDF export of readings                   | Medium | Low    | Partial     |
| ☐      | 12 | i18n (Vietnamese first)                  | Medium | Medium | No          |
| ☐      | 13 | Accessibility pass                       | Medium | Medium | No          |
| ☐      | 14 | Gift subscriptions / gift turns          | Medium | Low    | Yes         |
| ☐      | 15 | Tier-based rate limits                   | Low    | Low    | Yes         |

---

## 1. Daily streaks & achievements ✅ Shipped

**Why.** Drives retention via a daily habit loop. Pairs with the existing `ReadingReminder` model and journal.

**Backend**

- New model `UserAchievement(id, user_id, code, unlocked_at, progress_json)`
- New model `UserStreak(user_id, current_streak, longest_streak, last_active_date)`
- Celery Beat job at 00:05 UTC to reset broken streaks
- Achievement codes: `FIRST_READING`, `STREAK_7`, `STREAK_30`, `ALL_MAJOR_ARCANA_DRAWN`, `FIVE_SPREADS_USED`, `JOURNAL_50_ENTRIES`
- Hook into existing reading-completion paths in `routers/chat.py` and `routers/tarot.py` to update streak + check achievements

**Frontend**

- Streak badge in `EnhancedNavigation.tsx` (flame icon + number)
- `/profile` achievements grid with locked/unlocked states
- Toast on unlock via existing React Hot Toast

**Acceptance**

- Streak resets correctly across timezones (store user TZ on `User`)
- Achievements idempotent on retry
- Backfill migration for existing users

---

## 2. Reading tags + advanced journal search ✅ Shipped

**Why.** Journal grows unbounded; without filtering it loses value.

**Backend**

- New `UserReadingTag(id, user_id, name, color)` + join table `JournalEntryTag`
- Extend `routers/journal.py` `GET /journal` with query params: `tags[]`, `from`, `to`, `card_ids[]`, `spread_id`, `q` (full-text on `title`/`notes`)
- Use SQLAlchemy `or_` + ILIKE for SQLite, `to_tsvector` for Postgres (feature-flag the FTS path)

**Frontend**

- Tag chip editor on journal entry detail page
- Filter sidebar on `/journal` with multi-select tags, date range picker, card autocomplete
- Persist filter state in URL query string for shareability

---

## 3. Compatibility / relationship readings ✅ Shipped

**Why.** Highest-converting tarot vertical. Premium gating natural.

**Backend**

- New spread type `relationship_cross` in `seed_spreads.py` (You / Them / Connection / Challenge / Outcome)
- `POST /tarot/compatibility` accepting `{ person_a: {name, dob?}, person_b: {name, dob?}, question? }`
- New system prompt variant `system_prompt_compatibility.txt` that frames the AI as a relationship guide
- Counts as a "turn" but admin-configurable multiplier (e.g. 2x)

**Frontend**

- New page `/reading/compatibility`
- Two-person input form with optional birthdates
- Premium gate via existing `TurnCounter` / `SubscriptionModal`

---

## 4. PWA + push notifications ✅ Shipped

**Why.** Closes "no mobile app" gap without React Native investment.

**Backend**

- New `WebPushSubscription(user_id, endpoint, p256dh, auth)` model
- `pywebpush` Celery task that consumes `ReadingReminder` rows and pushes notifications
- VAPID keys via env vars; surface via `/api/web-push/vapid-public-key`

**Frontend**

- `next-pwa` integration, manifest, offline shell for `/journal` and last reading
- Permission prompt in onboarding flow + profile settings toggle
- Service worker handles "Daily card ready" notification → opens `/reading?source=push`

**Acceptance**

- Lighthouse PWA score ≥ 90
- Subscription teardown on logout

---

## 5. Public reading feed / community gallery

**Why.** Leverages existing `SharedReading` infra; turns sharing into discovery.

**Backend**

- Add `is_public_feed: bool` + `feed_approved_at` to `SharedReading`
- New `SharedReadingReaction(reading_uuid, user_id, kind)` with kinds: `resonates`, `insightful`, `hopeful`
- `GET /shared/feed?cursor=…&tag=…` paginated, only `is_public_feed=true AND feed_approved_at IS NOT NULL`
- Admin moderation queue extends existing shared-readings admin page

**Frontend**

- New `/community` page with infinite scroll
- Submission flow from `ShareReadingModal.tsx` with checkbox "Submit to community feed"

**Safety**

- Auto-flag PII patterns (emails, phone, last names) before queueing
- Rate limit submissions per user/day

---

## 6. Referral program

**Why.** Cheapest growth lever. Plugs into turn-based system.

**Backend**

- Add `referral_code` (unique) and `referred_by_user_id` to `User`
- New `ReferralEvent(referrer_id, referred_id, granted_turns_to_referrer, granted_turns_to_referee, created_at)`
- Hook into registration: if `?ref=` cookie present, set `referred_by_user_id`, grant turns on first reading completion (not signup, to avoid abuse)

**Frontend**

- "Invite friends" section in `/profile` with copyable link, share targets (X, Facebook, copy)
- Stats: invited / converted / turns earned

---

## 7. Weekly email digest

**Why.** Reactivation. Celery Beat already running.

**Backend**

- Celery Beat task Sunday 18:00 user-local (store TZ on `User`)
- Compose per-user digest: card frequencies, mood patterns, longest streak this week, suggested spread
- Templated via Jinja2; sent via existing email provider

**Frontend**

- Notification preferences page under `/profile/settings`: toggle digest, choose day-of-week

---

## 8. Personalized reader personas

**Why.** Tiny code change, big UX differentiation. Premium gate.

**Backend**

- Static persona registry in `tarot_reader.py`: `MYSTIC`, `BLUNT`, `THERAPIST`, `POETIC`, `ANALYTICAL`
- Each persona is a system-prompt prefix; user's selection stored on `User.reader_persona`
- Free users locked to `MYSTIC`

**Frontend**

- Persona picker in `/profile` and inline on `/reading`
- Preview snippet of each persona's voice

---

## 9. Voice readings (TTS)

**Why.** Premium-tier moat. OpenAI TTS endpoints are cheap and fast.

**Backend**

- `POST /chat/{session_id}/messages/{message_id}/tts` → streams audio via OpenAI TTS (`tts-1`, voice configurable)
- Cache rendered audio in Cloudflare R2 keyed by `(message_id, voice)` for replay without re-billing
- Counts against tokens budget (tie into the planned AI usage monitoring)

**Frontend**

- Play button on each AI message in `ChatSession`
- Voice selector in profile (Alloy, Onyx, Nova, Shimmer)

---

## 10. Semantic journal search

**Why.** "Show me readings about my job change" — the kind of recall users actually want.

**Backend**

- Add `pgvector` extension (Postgres only; gate by env)
- New `JournalEntryEmbedding(entry_id, embedding vector(1536))`
- Celery task embeds new/edited entries via `text-embedding-3-small`
- `GET /journal/search?q=…` → embed query, cosine-similarity top-N
- Fallback to ILIKE on SQLite or missing extension

**Frontend**

- Search bar on `/journal` with "smart search" toggle
- Highlight matched entries with similarity score

---

## 11. PDF export of readings

**Why.** Users keep asking. Useful for premium positioning.

**Backend**

- `GET /journal/{entry_id}/export.pdf` and `GET /chat/{session_id}/export.pdf`
- Render via WeasyPrint or ReportLab; template includes card images from R2

**Frontend**

- Export buttons on journal entry and chat session pages
- Premium gate optional (free: 1/month; premium: unlimited)

---

## 12. Internationalization (Vietnamese first)

**Why.** README lists i18n as planned; the project owner is Vietnamese.

**Frontend**

- `next-intl` integration; route segment `[locale]`
- Extract all hard-coded strings into `messages/en.json`, `messages/vi.json`
- Locale picker in nav and `/profile`

**Backend**

- Add `locale` to `User`
- Translate transactional emails and AI system prompt's framing (not card meanings — keep canonical English for accuracy, optionally translate output via a final pass)

**Acceptance**

- All public pages render in vi-VN
- Date/number formatting respects locale

---

## 13. Accessibility pass

**Why.** Low glamour, real reach. Currently no audit evidence.

**Scope**

- ARIA labels on `TarotCard`, `SpreadLayout`, `DeckSelector`
- Focus trap and keyboard nav in `SubscriptionModal`, `ShareReadingModal`, `SupportModal`
- Skip-to-content link
- Color contrast audit (mystical theme tends to fail WCAG AA)
- Screen reader pass on `/reading` flow
- Reduced-motion mode for Framer Motion animations

**Acceptance**

- axe-core CI check passes with zero serious/critical issues
- Manual NVDA + VoiceOver pass on golden path

---

## 14. Gift subscriptions / gift turns

**Why.** Holiday / event-driven revenue, social virality.

**Backend**

- Lemon Squeezy: new variant for "gift" SKU; webhook handler creates `GiftCode(code, granted_turns, granted_premium_days, redeemed_by, expires_at)`
- `POST /gifts/redeem` with code → applies to current user
- Admin can mint gifts manually (extends existing admin gifting)

**Frontend**

- `/gift` purchase page (enter recipient email; sends code via email)
- Redeem field in `/profile`

---

## 15. Tier-based rate limits

**Why.** SlowAPI is present but flat; differentiated limits nudge upgrades.

**Backend**

- Replace static decorators with a dynamic key function that reads `User.subscription_tier`
- Free: 30 req/min on chat, 5 readings/day
- Premium: 120 req/min on chat, unlimited readings
- Surface remaining quota in response headers (`X-RateLimit-*`)

**Frontend**

- Read headers, show subtle "X readings left today" indicator
- Upsell modal when free quota hit

---

## Suggested sequencing

**Sprint 1 (engagement core)** — #8 personas, #11 PDF export, #6 referrals
Small wins, premium signals, growth lever in one ship.

**Sprint 2 (retention loop)** — #1 streaks, #2 journal search, #7 weekly digest
Build the habit and the recall users want.

**Sprint 3 (premium expansion)** — #3 compatibility, #9 TTS, #14 gifts
Three monetizable premium features at once.

**Sprint 4 (platform maturity)** — #4 PWA, #12 i18n, #13 a11y
Once revenue is healthier, broaden reach.

**Later** — #5 community feed, #10 semantic search, #15 tier rate limits
These benefit from larger user base / Postgres consolidation.

---

## Cross-cutting considerations

- **AI cost discipline.** Tie #8, #9, #10 into the planned AI usage monitoring (`implementation-guide.md`) before shipping; without it, TTS and embeddings will inflate spend silently.
- **Privacy.** #5 (community feed) and #10 (embeddings) touch user content; coordinate with the planned message encryption at rest work — readings stored encrypted should not silently leak via feed or embedding indexes.
- **Migration safety.** Several features add columns to `User` (`referral_code`, `reader_persona`, `locale`, `timezone`). Batch these into one migration to minimize churn.
- **Testing.** Each new router needs unit tests in `backend/tests/`; new pages need Playwright happy-path coverage in the frontend.
