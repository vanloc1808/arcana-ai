# Changelog for ArcanaAI

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.0.30] - 2026-08-13

### Changed
- Refined the desktop navigation tab colors so inactive labels and icons better match the interface's neutral text hierarchy while preserving violet for active navigation.

## [0.0.29] - 2026-08-11

### Added
- Updated CI and deployment documentation for the renamed shared GitOps repository, `vanloc1808/platform-gitops`.
- Added a production configuration and secret-rotation guide covering SOPS editing, ConfigMap changes, validation, Git promotion, and manual Argo CD synchronization.
- Added a release-note blog post documenting the ArcanaAI GitOps migration, immutable CI/CD image promotion, staged K3s rollout, workload hardening, persistent avatars, Cloudflare-protected Argo CD, and rollback boundaries.
- Added a public date-organized blog index and release-note route at `/blog/2026/08/12/arcanaai-cicd-release-notes`.
- The public blog now reads the repository-level `blog/` tree directly, so each post has one source file instead of separate frontend and repository copies.
- Blog pages are public and no longer require an ArcanaAI session or authenticated navigation shell.

### Fixed
- Cookie-authenticated mutations now bootstrap the host-only CSRF token from the backend, allowing chat creation, streaming messages, support requests, token refresh, and other protected actions to work across the supported frontend/backend subdomains without weakening authentication-cookie isolation.

### Removed
- Removed the retired self-hosted Docker Compose deployment workflow so successful CI runs cannot restart the preserved legacy Docker stack or run database migrations outside the GitOps-controlled K3s delivery path.

## [0.0.28] - 2026-08-10

### Added
- Documented secure post-installation K3s administration from a trusted workstation using a dedicated kubeconfig and an SSH local-forward, without publicly exposing the Kubernetes API.
- Added a pinned, internal-only Argo CD installation phase with staging safety checks, server-side installation, rollout verification, exposure checks, and a stop point before private-repository and SOPS integration.
- Documented least-privilege access from Argo CD to the private deployment repository using a dedicated read-only GitHub deploy key and an encrypted-at-rest Kubernetes repository Secret.
- Added a pinned KSOPS sidecar integration procedure with isolated temporary storage, non-root execution, protected Age-key injection, encrypted Secret generation, server-side patch validation, and a staged stop before Application reconciliation.
- Documented observation-only Argo CD Application staging to verify private-repository access and decrypted KSOPS rendering while preventing premature synchronization of the incomplete production stack.
- Added a persistent Redis StatefulSet phase with pinned image, AOF durability, retained local-path storage, non-root execution, probes, resource limits, namespace-scoped network access, and render-only Argo CD verification.
- Added an observation-only Next.js frontend deployment phase with a non-root read-only container, isolated writable cache paths, probes, resource limits, internal Service, SHA-pinned image promotion, and rendered-image verification.
- Added a render-only Celery staging phase beginning with personal MacBook bootstrap instructions, a separate write-enabled repository deploy key, protected Age and kubeconfig transfer procedures, immutable backend-image contract checks, explicit migration-safety requirements, and cluster capacity gates before worker and Beat manifests are introduced.
- Added a dedicated database-migration staging phase beginning with clean-repository reconciliation, immutable image runtime and Alembic-head verification, non-disclosing encrypted database-key validation, and explicit safeguards against duplicate backend migrations or overlapping Celery Beat schedulers.
- Documented a two-gate database rollout that first creates an inert zero-replica Kubernetes baseline, then runs an explicitly authorized migration hook with bounded retries before separately activating application workloads and cutting over Celery Beat.
- Added exact Gate A manifest-authoring and non-secret render-validation instructions for direct Uvicorn startup, production zero-replica controls, and an intentionally unregistered migration hook.
- Added Gate A commit and Argo CD render-only verification instructions with revision polling, fail-closed condition and inventory checks, explicit migration-Job absence, and proof that synchronization and namespace creation remain disabled.
- Added a revision-pinned first Gate A synchronization procedure with preflight capacity and Docker checks, pruning disabled, bounded operation polling, zero-replica and no-Job assertions, Redis and retained-storage health verification, and a data-aware rollback boundary.
- Added Gate B recovery preflight instructions that classify the encrypted database provider without disclosure, require a verified Supabase recovery point, compare the read-only production Alembic revision with the pinned image head, and stop before registering or running the migration Job.
- Documented the narrowly scoped Supabase Free exception for an explicitly accepted no-backup migration-ownership transfer when production `current` already equals the pinned image head; any future revision gap still requires a recovery point.
- Added a registration-only Gate B phase that validates and commits the migration hook separately, proves immutable rendering and zero-replica gates offline, refreshes Argo CD without synchronization, and fails if any operation or live Job starts prematurely.
- Added the separately authorized Gate B execution procedure with an immediate no-op revision recheck, exact-revision sync guards, stale-operation protection, bounded hook polling, retained failure diagnostics, successful-hook cleanup checks, and before-and-after schema revision proof.
- Added a post-migration hook-retirement phase so subsequent application syncs cannot rerun Alembic, while retaining the validated Job template in Git and proving zero-replica workload gates remain intact before backend activation.
- Added a backend-only activation phase with host-only cookie and Prometheus configuration corrections, revision-pinned manual synchronization, direct-Uvicorn verification, internal application/database smoke tests, and explicit isolation from Docker production and public ingress.
- Added a frontend-only activation phase with immutable render and exposure checks, guarded manual synchronization, non-root read-only filesystem verification, local port-forward rendering tests, and continued worker/Beat and public-ingress isolation.
- Added a worker-only activation phase with isolated-broker reasoning, immutable queue/concurrency validation, guarded manual synchronization, Redis control-plane and registered-task checks without submitting work, internal metrics verification, and continued Beat/public-ingress isolation.
- Added an observation-only persistent-avatar inventory phase that resolves and validates the Docker bind mount, records aggregate file and database-reference counts without disclosing filenames, proves Kubernetes has no durable avatar mount, and preserves Docker as the sole writer before snapshot staging.
- Added staged persistent-avatar storage and seeding procedures with a pruning-protected dedicated claim, backend-only mount, private source backup, fail-closed empty-destination copy, content-set digest verification, controlled restart persistence proof, and an explicit final-delta boundary before public cutover.
- Added a post-persistence convergence and traffic-boundary inventory phase that removes controlled-restart drift through a guarded Argo CD sync, revalidates avatar integrity, and records Docker Traefik and Kubernetes topology without changing routing or listeners.

### Fixed
- Corrected the KSOPS Application example to preserve the required Argo CD `spec.project: default` field when adding the config-management plugin.
- Corrected the migration preflight namespace guard so a Kubernetes connection failure stops execution instead of being misreported as an absent namespace.
- Corrected Gate A rendering checks so a missing temporary directory or failed Kustomize build cannot continue into a misleading zero-resource validation result.
- Prevented Gate A validation failures from closing an interactive administration shell by containing failure handling inside a returning shell function.
- Moved the non-secret Gate A render workspace from `/tmp` to a protected user cache directory so confined Ubuntu Kustomize packages can access it.
- Updated Gate A validation to use Kustomize embedded in `kubectl`, avoiding dependency on an unavailable or separately confined standalone executable.
- Corrected first-sync health expectations for K3s `local-path`: the zero-replica Beat claim intentionally remains pending under `WaitForFirstConsumer`, while only Redis storage binds during Gate A.
- Corrected the frontend smoke test to accept the application's expected initial HTTP 307, inspect its redirect target, and require a successful final HTML response after following redirects.
- Made avatar-storage verification fail closed when the PVC or exact backend mount is absent, preventing the image's writable but ephemeral `/avatar` directory from being mistaken for persistent storage.
- Corrected avatar snapshot extraction to avoid restoring source ownership inside the capability-restricted backend container, while preserving the fail-closed rule against retrying or deleting partially extracted data.

### Security
- Added mandatory non-root UID/GID and writable-volume ownership remediation after the first Kubernetes Celery worker rollout exposed Celery's superuser warning, using the pinned image's resolvable `nobody:nogroup` identity until a dedicated application account is built into a future image.

## [0.0.27] - 2026-08-09

### Added
- The application is now served at the additional production domain `stacyn.io.vn` (frontend) and `backend.stacyn.io.vn` (backend), with matching CORS allowed origins for `https://stacyn.io.vn` and `https://www.stacyn.io.vn`.

### Fixed
- Authentication now works from both the `nguyenvanloc.com` and `stacyn.io.vn` frontends by selecting a same-site backend at runtime and issuing host-only cookies instead of restricting them to `.nguyenvanloc.com`.
- Post-login navigation and service-worker registration no longer get redirected to `/login`; route protection now verifies the host-only backend session in the frontend auth provider instead of expecting the API cookie on the frontend domain.

## [0.0.26] - 2026-07-23

### Added
- Request correlation IDs flow from API through Celery tasks into structured Loguru logs, with the `X-Correlation-ID` header echoed on every response for end-to-end tracing.
- Exponential backoff with jitter replaces fixed-interval retries on all Celery tasks, preventing thundering herds on transient failures.
- Redis-backed idempotency keys guard email, notification, and web push tasks against duplicate delivery from worker crashes or `acks_late` re-delivery.
- Dead-letter queue persists permanently failed tasks to a Redis list, with admin endpoints at `GET /api/tasks/dead-letter` and `POST /api/tasks/dead-letter/replay/{index}` for inspection and replay.
- AI reading prompts now request structured output (`## Overview`, `## Card-by-Card Analysis`, `## Synthesis`, `## Guidance`, `## Wellbeing Note`) and the LLM call retries on rate-limit and connection errors before giving up.
- A `prompt_version` label on all Prometheus OpenAI metrics enables tracking response quality across prompt iterations.
- Content safety screening detects crisis, medical, legal, and financial keywords in user messages, records triggers via `arcana_content_safety_triggers_total`, prepends crisis resources to the system prompt when needed, and appends a wellbeing disclaimer to every AI reading.
- Safety guidelines and structured output rules added to `system_prompt.txt`, and wellbeing disclaimers appended to non-streaming compatibility readings.

### Changed
- Celery worker commands now consume the `dead_letter` queue in addition to `email`, `notifications`, and `celery`.
- All existing Prometheus metrics continue flowing to the central monitoring stack; new `prompt_version` labels are additive and do not break existing dashboards.
- Celery task acknowledgements are now late (`acks_late=True`) for at-least-once delivery semantics with idempotency protection.
- The Loguru record patcher injects the active correlation ID into every log line automatically.

### Fixed
- Telegram 500-error alerts are now suppressed in `local` and `test` environments (`FASTAPI_ENV`), preventing alert noise from synthetic traffic cron jobs and intentional error-path test runs.
- The forgot-password endpoint no longer raises a 500 when the email dispatch to Celery fails; the failure is logged but the response remains `200 OK` to avoid leaking account existence.
- Authentication session expiration checks now use timezone-aware UTC timestamps, preventing 500 errors for authenticated requests.

## [0.0.25] - 2026-07-23

### Changed
- Browser authentication now uses Secure, HttpOnly access and refresh cookies while preserving the existing 14-day and 180-day token lifetimes.
- Refresh tokens are rotated and server-side sessions can be revoked, including automatic family revocation when a token is replayed.
- Added CSRF validation for cookie-authenticated state-changing requests, login lockout protection, and session invalidation after password reset.
- Existing browser sessions are migrated once through the legacy refresh token on the first frontend load after deployment.

## [0.0.24] - 2026-07-23

### Changed
- Standardized all versioned backend API routes under the `/api` prefix. Frontend clients, changelog proxy routes, and API tests now use the same convention.

## [0.0.23] - 2026-07-03

### Added
- New users now receive a welcome email upon registration, and users are notified by email whenever their password is changed via the reset-password flow. Both emails reuse the same styled HTML layout as the existing password reset email.
- Synthetic traffic can now create and use a dedicated local test account by email, then call the forgot-password API on a schedule to exercise Celery password reset email tasks.

### Changed
- Synthetic OpenAI message traffic now ensures the configured synthetic account exists before logging in, so local cron testing can run against an isolated account instead of a personal user.

## [0.0.22] - 2026-07-03

### Fixed
- Corrected the ArcanaAI monitoring guide so Celery and email PromQL examples query the `component="celery"` series exposed by Celery workers instead of the backend component.

## [0.0.21] - 2026-06-23

### Added
- Celery workers and beat now expose a dedicated Prometheus metrics endpoint on port `8001`, aggregating prefork task/email counters with `prometheus_client` multiprocess mode for central monitoring scrapes.
- Added a separate local-only synthetic traffic cron container that generates health dashboard data four times per day and sends two OpenAI-backed chat message requests every hour using credentials from an ignored local environment file.

### Changed
- Backend logging now uses Loguru with a shared configuration while preserving structured request metadata in log records.
- Monitoring documentation now lists separate scrape targets for the FastAPI backend (`tarot-backend:8000/metrics`) and Celery services (`tarot-celery-worker:8001/metrics`, `tarot-celery-beat:8001/metrics`).

### Fixed
- Fixed OpenAI-backed chat message streams failing when the model returns tool calls by logging tool-call payloads as structured metadata instead of interpolating raw dictionaries into Loguru messages.

## [0.0.20] - 2026-06-22

### Added
- Added a [Scalar](https://scalar.com/) API reference at `/scalar`, served alongside the existing Swagger UI (`/docs`) and ReDoc (`/redoc`). All three read from the same OpenAPI schema (`/openapi.json`) and remain available only in the local environment. The API root response (`GET /`) now includes a `scalar_url` field.

## [0.0.19] - 2026-06-20

### Changed
- Monitoring documentation now treats ArcanaAI as a client of the standalone `central-monitoring` stack and provides a reimplementation guide for future application metrics and dashboards.

### Removed
- Removed the in-repository Prometheus/Grafana monitoring compose stack and dashboard/rule provisioning files.
- Removed the backend Prometheus `/metrics` endpoint, custom metrics helper, tarot metric tracking calls, metrics tests, and Prometheus-related Python dependencies.

## [0.0.18] - 2026-05-25

### Added
- Chat completions can now receive a `rename_chat` tool call for brand-new sessions, allowing the model to assign a short descriptive conversation title instead of leaving every chat as "New Chat".
- Added a standardized timezone catalog endpoint (`GET /utilities/timezones`) so frontend timezone dropdowns can use one backend-defined IANA list across profile and notification settings; it now returns the full runtime `zoneinfo.available_timezones()` set.
- Admin Users now supports bulk user deletion with a Select mode, row-level multi-select checkboxes, page-level select-all, and a single "Delete selected" action for removing multiple users in one flow.
- Admin Users now includes a "No sessions" filter chip so administrators can quickly find accounts that have never started a chat session.
- Header navigation now includes a dedicated Sessions tab that links directly to `/session` for faster access to chat history.
- Admin Users now supports direct password resets from the user edit dialog, allowing administrators to set a new password for any account without email token flow.

### Changed
- The backend now conditionally includes the `rename_chat` tool only when a session still has its default title; once a title is set by either the user or assistant, subsequent model calls omit the rename tool.
- Enhance the homepage UI & chat session UI.
- Removed the unused "Save" action from the chat session reading header, leaving only the "New spread" button in that action row.

### Fixed
- Frontend responsive behavior has been restored across the refreshed experience on mobile widths, including the session detail flow and the redesigned home/dashboard surfaces: actions now wrap without clipping, reading/card/article typography scales correctly, and composer/CTA controls remain usable without horizontal overflow on small screens.
- Session detail pages now always render assistant replies that do not include drawn cards, instead of hiding the conversation until a card-bearing assistant message appears.
- Home page center "Card of the day" image now renders reliably for remote deck URLs by bypassing Next image optimization for that slot and falling back gracefully if the image fails to load.
- Admin user deletion now performs a dedicated soft delete by marking `is_deleted=true` (and deactivating the account) instead of hard-deleting the database row, preventing foreign-key conflicts when related checkout sessions exist while keeping deleted state distinct from inactive users.
- `/session` now shows recent readings in the left rail instead of visually collapsing the session list.
- Chat session spread cards now load card artwork with direct image rendering (instead of Next.js optimization) so Card of the Day deck URLs render reliably in-session without blank card faces.
- Homepage Quick Actions links now stack cleanly without visual overlap on narrow layouts, while still allowing each action label to stay on a single line.

## [0.0.17] - 2026-05-24

### Added
- "Continue where you left off" now includes a New chat button, a bottom-positioned All chats toggle, and a paginated load-more control so users can start fresh or expand the section beyond the four most recent sessions.
- Profile reading-language preferences now include Chinese (Simplified).

### Changed
- Redesigned the home/welcome experience (shown before a reading is opened) with a cosmic celestial theme: the static "Welcome to ArcanaAI" hero is replaced by a personalized, time-aware poetic greeting; a lunar/time strip shows the live moon phase and illumination; the center now follows a three-column rhythm (Continue where you left off · Card of the Day as the gold-accented centerpiece · Tonight's spread picker) over a twinkling starfield, followed by a "Shuffle the deck" ritual call-to-action and a nightly whisper. Continue-reading entries open the user's recent sessions and the Card of the Day uses the real daily card.
- Card of the Day now uses the same section title styling as the other home cards for a more consistent layout.

### Removed
- Removed the duplicate left-side chat history panel from the home chat shell; recent sessions remain available through "Continue where you left off".
- Removed the redundant reading-page title/actions panel and full turn entitlement panel so the tarot reading form starts without extra boxes.
- Removed the inline avatar upload format/size guidance from the profile identity card.

### Fixed
- Home chat error banners now use darker red text so failure messages remain readable against the light red alert background.
- Clicking the ArcanaAI logo while inside an active chat now returns to the homepage/history UI instead of leaving the current chat open.
- Chat session timestamps in "Continue where you left off" now treat timezone-less server timestamps as UTC before formatting them in the user's browser timezone.
- Profile history/subscription status now recognizes specialized premium and active subscription access instead of showing Unlimited Seer users as "Novice (Free)" when they have zero paid-turn balance.
- Profile reading-preference toggles now render as compact switches instead of oversized circular controls.
- Profile notification toggles now render as compact switches instead of oversized circular controls.
- Profile history now shows infinity for free and paid turn counts when the user has unlimited access.

## [0.0.16] - 2026-05-24

### Changed
- Profile editing now uses an explicit "Edit profile" button: fields are read-only by default and unlock for editing only after clicking Edit, which then shows Save/Cancel controls. This replaces the always-editable form so it's clear how to update profile information.

### Fixed
- Frontend production builds now succeed for `/admin/cards`: the page's `useSearchParams()` usage is wrapped in a Suspense boundary to satisfy Next.js prerender requirements in Docker/CI builds.

## [0.0.15] - 2026-05-24

### Added
- Profile page now lets users edit and save more of their information: bio, timezone, favorite deck, and reading preferences (lunar phase awareness, card animation style, reading language, and reversed cards), in addition to the existing full name. Username and email remain read-only.
- User profile now stores `bio`, `timezone`, `lunar_phase_awareness`, `card_animations`, `reading_language`, and `reversed_cards`, returned by `GET /auth/me` and updatable via `PUT /auth/me` (with validation for timezone, animation style, and reading language).

### Changed
- The profile "Account details" and "Reading preferences" sections are now a single editable form with Save/Discard controls and an unsaved-changes indicator, instead of static placeholder fields.

### Fixed
- Admin portal top-bar search is now actionable: clicking the search icon or pressing Enter runs an admin search, routes to Users/Cards/Chat Sessions, and pre-fills each destination page's local search filter with the query.


## [0.0.14] - 2026-05-24


### Changed
- Global frontend header navigation is now mounted from the root app layout, so authenticated users see a consistent ArcanaAI top header across frontend pages (instead of only on the home experience)
- Reading, compatibility reading, journal, and profile pages now include top spacing so the shared sticky header is fully visible and does not overlap page content
- Admin sidebar "Card of the day" is now dynamic, sourced from the daily card-of-the-day endpoint (matching the user-facing sidebar) instead of a hardcoded card
- Admin Users, Decks, and Cards rows/objects are now clickable to open the edit dialog, in addition to the existing Edit button
- Admin Chat Sessions page now shows engagement metrics (total sessions, total messages, average messages per session, active users, most active users, busiest session, empty sessions, and new-this-week counts)
- Admin Chat Sessions table now supports sorting by user, title, and message count (with ascending/descending order controls), backed by server-side sorting on the admin API
- Removed the decorative "ArcanaAI · Admin console" watermark text from admin pages for a cleaner workspace view

### Fixed
- Admin Chat Sessions page no longer shows an empty list and zeroed stats: it now calls the correct `/admin/chat-sessions` endpoint (previously requested a non-existent `/admin/chat_sessions` path)

## [0.0.13] - 2026-05-21

Covers commits from 2026-05-19 through 2026-05-21 (ISO week 2026-W21).

### Added
- Random card appearance on the homepage with a shuffle button
- ArcanaAI logo header on the profile page as a home link
- Card of the Day sourced from the user's favorite deck and shared between the hero and sidebar
- Reseed migration for databases stuck without the Thoth/Marseille decks, rerunning updates only for freshly-seeded decks
- `AGENTS.md` with an instruction to keep the changelog in sync with user-facing changes
- Daily activity streaks and achievements: per-user streak counter (flame badge in the navigation header) and unlockable achievements (first reading, first journal, streak milestones at 3/7/30/100 days, journal milestones, Major Arcana completion, card-of-the-day pulls). Streaks and earned achievements are backfilled from each user's existing journal entries, chat messages, turn-usage history, and card associations on first migration.
- `GET /api/streaks/me` and `POST /api/streaks/recompute` endpoints for client display and manual rebuild from history
- Journal advanced search: filter entries by card name, spread name, AND/OR tag-match mode in addition to the existing date, mood, notes, and favorites filters
- Journal filter UI now shows the user's previously-used tags as clickable chips with usage counts, and the spread filter populates from spreads the user has actually used
- `GET /api/journal/tags` and `GET /api/journal/spreads-used` endpoints powering the filter suggestions
- Compatibility (relationship) readings: new five-card Relationship Cross spread (You / Them / Connection / Challenge / Outcome) and a dedicated `/reading/compatibility` page that takes two names and optional birthdates plus an optional focus question, reachable from a homepage hero button and the readings page header
- `POST /tarot/compatibility` endpoint that draws the Relationship Cross spread with position labels personalized to the two people's names
- AI-written interpretation for compatibility readings via `POST /tarot/compatibility/interpret`, shown beneath the drawn cards (does not consume an extra turn)
- Animated card-draw reveal (staggered flip-in) when cards are dealt, on both the standard reading and compatibility pages, with a reduced-motion fallback
- Progressive Web App support: expanded web manifest with PWA shortcuts, a service worker, theme color, and Apple web-app metadata so ArcanaAI installs to home screens on supported browsers
- Web Push notifications: VAPID-based delivery infrastructure with `GET /api/web-push/vapid-public-key`, `POST /api/web-push/subscribe`, `POST /api/web-push/unsubscribe`, and `POST /api/web-push/test`; a new "Notifications" tab in the profile page lets the user enable/disable push and send a test notification to verify
- Celery Beat job `process_due_reading_reminders` runs hourly to deliver pushes for overdue `ReadingReminder` rows and prune dead subscriptions

### Changed
- Tarot deck seeding migration made PostgreSQL-compatible and restricted to the two new decks
- Admin portal redesigned for readability: replaced the low-contrast gold-on-black cosmic theme with a cool-slate console (Manrope/Cormorant Garamond/JetBrains Mono type, single violet accent, high-contrast text). All sections rebuilt — Overview (real stat cards, recent activity feed, cards-by-deck distribution, quick links), Users (searchable/filterable table with status & plan pills and pagination), Decks and Spreads as card grids, and redesigned Cards, Chat Sessions, and Shared Readings tables
- Admin portal gains an appearance switcher (gear icon, top-right): Dark / Light / High-contrast themes plus an accent color picker; the default follows the operating-system theme and the choice is remembered per browser

### Removed
- Header search icon button
- Changelog button from the navigation
- Legal links box from the bottom-left corner of the home page
- Morgan-Greer and Golden Dawn decks (rolled back after their initial addition)

### Fixed
- SQLite migration failure caused by an unnamed `UniqueConstraint` on `cards.name`
- Multiple Alembic heads after the tarot deck migrations
- Native date pickers (e.g. compatibility birthdates, journal filters) had an invisible calendar icon on the dark theme; they now use a dark color-scheme with a legible icon
- Compatibility reading interpretation is now rendered as formatted Markdown instead of raw text
- Card-draw reveal animation (a staggered 3D flip-in) now plays whenever cards are dealt — chat reading, the spread reading page, and compatibility readings. Reimplemented with framer-motion so it runs reliably on mount and is no longer silently suppressed by the OS "reduce motion" setting
- Chat readings now stream a `drawing` signal when the draw_cards tool fires, so the frontend plays a ~5-second card-shuffling suspense animation before revealing the drawn cards and the reading
- Compatibility readings play the same ~5-second card-shuffling animation after "Draw the Relationship Cross" is clicked, before the cards and interpretation are revealed
- Reading reminder push delivery no longer marks a reminder as sent when nothing was actually delivered: a reminder is finalized only when delivered, when the user has no push subscriptions, or after a bounded number of attempts; transient failures are retried on the next run. Reminders for the same user in one run are coalesced into a single notification

### Security
- Final pass on npm and Python dependency vulnerability remediation
- Frontend dependency bumps (3-package update group)

## [0.0.12] - 2026-05-17

Covers commits from 2026-05-13 through 2026-05-17 (ISO week 2026-W20).

### Changed
- Admin and sharing routes now use SQLAlchemy `is_` for boolean filters

### Fixed
- `FASTAPI_ENV` default regression and an unintended lockfile change
- Backend test expectations after dependency and path validation changes

### Security
- Required Grafana admin password via environment variable in monitoring compose
- Bumped vulnerable backend dependencies and regenerated the lockfile
- Frontend dependency bumps (24-package update group)

## [0.0.11] - 2026-04-25

Covers commits from 2026-04-22 through 2026-04-25 (ISO week 2026-W17).

### Added
- Thoth Tarot and Tarot de Marseille decks with real CDN image URLs and Thoth-conventional card names
- Tooling to convert Thoth WEBP images to JPG and upload them to R2
- Mystical tarot design applied across all admin portal pages
- Beautified changelog page rendering all versions without raw markdown
- Public access to the `/changelog` page

### Changed
- Marseille deck images updated
- Frontend dependencies bumped (`axios`, `flatted`)

### Fixed
- Clickability of the Terms of Service and Privacy Policy agreement checkbox
- Removed redundant on-page texts
- `fastapi-mail` compatibility by pinning `starlette<1.0`
- Celery Makefile targets to use `uv run`
- Database URL retrieval logic and package configuration

## [0.0.10] - 2026-04-05

Covers commits from 2026-04-04 through 2026-04-05 (ISO week 2026-W14).

### Changed
- Briefly migrated the chat model to Gemini, then reverted to the prior OpenAI-backed configuration (net no-op for users)

## [0.0.9] - 2026-03-03

Covers a commit on 2026-03-03 (ISO week 2026-W10).

### Changed
- Dockerfile updated

## [0.0.8] - 2026-02-13

Covers a commit on 2026-02-13 (ISO week 2026-W07).

### Changed
- Updated the assistant system prompt

## [0.0.7] - 2025-12-15

Covers commits on 2025-12-15 (ISO week 2025-W51).

### Changed
- CI migrated to a self-hosted runner
- Updated backend and frontend dependencies

### Fixed
- Linter warnings, unit tests, and build errors surfaced by the dependency bump

## [0.0.6] - 2025-12-08

Covers a commit on 2025-12-08 (ISO week 2025-W50).

### Security
- Frontend dependency bumps (32-package update group)

## [0.0.5] - 2025-09-05

Covers a commit on 2025-09-05 (ISO week 2025-W36).

### Added
- Backend unit test suite

## [0.0.4] - 2025-08-24

### Added
- N/A

### Changed
- Remove duplicate display of Tarot card after drawing

## [0.0.3] - 2025-08-24

### Added
- N/A

### Changed
- Add the limit of 2000 characters for concerns (message sent to the model)


## [0.0.2] - 2025-08-20

### Added
- N/A

### Changed
- Update username validation: only ASCII numbers, characters, underscores, and dots are allowed.

### Deprecated
- N/A

### Removed
- N/A

### Fixed
- N/A

### Security
- N/A

---

## [0.0.1] - 2025-08-18

### Added
- Initial release

### Changed
- N/A

### Deprecated
- N/A

### Removed
- N/A

### Fixed
- N/A

### Security
- N/A
