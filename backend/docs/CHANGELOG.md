# Changelog for ArcanaAI

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.0.13] - 2026-05-21

Covers commits from 2026-05-19 through 2026-05-21 (ISO week 2026-W21).

### Added
- Random card appearance on the homepage with a shuffle button
- ArcanaAI logo header on the profile page as a home link
- Card of the Day sourced from the user's favorite deck and shared between the hero and sidebar
- Reseed migration for databases stuck without the Thoth/Marseille decks, rerunning updates only for freshly-seeded decks
- `AGENTS.md` with an instruction to keep the changelog in sync with user-facing changes

### Changed
- Tarot deck seeding migration made PostgreSQL-compatible and restricted to the two new decks

### Removed
- Header search icon button
- Changelog button from the navigation
- Legal links box from the bottom-left corner of the home page
- Morgan-Greer and Golden Dawn decks (rolled back after their initial addition)

### Fixed
- SQLite migration failure caused by an unnamed `UniqueConstraint` on `cards.name`
- Multiple Alembic heads after the tarot deck migrations

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
