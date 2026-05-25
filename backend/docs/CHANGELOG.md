# Changelog for ArcanaAI

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.0.18] - 2026-05-25

### Added
- Chat completions can now receive a `rename_chat` tool call for brand-new sessions, allowing the model to assign a short descriptive conversation title instead of leaving every chat as "New Chat".
- Admin Users now supports bulk user deletion with a Select mode, row-level multi-select checkboxes, page-level select-all, and a single "Delete selected" action for removing multiple users in one flow.
- Admin Users now includes a "No sessions" filter chip so administrators can quickly find accounts that have never started a chat session.

### Changed
- The backend now conditionally includes the `rename_chat` tool only when a session still has its default title; once a title is set by either the user or assistant, subsequent model calls omit the rename tool.
- Enhance the homepage UI & chat session UI.

### Fixed
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
