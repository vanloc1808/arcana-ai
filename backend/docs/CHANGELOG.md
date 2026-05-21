# Changelog for ArcanaAI

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.0.5] - 2026-05-21

### Added
- Adsterra ad-watching turn system to replace the credit card paid subscription flow (MetaMask USDT payments remain)
- Anti-adblock mechanism and improved ad banner/show logic
- Watch-ad setup guide in the documentation
- Random card appearance on the homepage with a shuffle button
- Card of the Day sourced from the user's favorite deck, shared between the hero and sidebar
- Thoth and Marseille tarot decks with real CDN image URLs and Thoth-conventional card names
- Tooling to convert Thoth WEBP images to JPG and upload them to R2
- ArcanaAI logo header on the profile page as a home link
- Mystical tarot design applied across all admin portal pages
- Beautified changelog page rendering all versions without raw markdown
- Public access to the `/changelog` page
- Backend unit test suite

### Changed
- Daily ad-watch turn limit raised from 5 to 20
- CI migrated to a self-hosted runner
- Tarot deck seeding migrations made PostgreSQL-compatible and limited to the two new decks
- Admin and sharing routes use SQLAlchemy `is_` for boolean filters
- Grafana monitoring compose now requires an admin password via environment variable
- Frontend dependencies bumped across multiple groups (including axios and flatted)

### Removed
- Header search icon button
- Changelog button from the navigation
- Legal links box from the bottom-left corner of the home page
- Morgan-Greer and Golden Dawn decks (rolled back after initial addition)
- Redundant on-page texts

### Fixed
- Clickability of the Terms of Service and Privacy Policy agreement checkbox
- Watch Ad countdown not starting when the dialog content mounted late
- Multi-interval race condition during ad initialization
- Adsterra script injection from a synchronous click handler using the full script URL
- Multiple Alembic heads by chaining the `ad_views` migration after the tarot deck migrations
- SQLite migration failure caused by an unnamed `UniqueConstraint` on `cards.name`
- Reseed migration for databases stuck without Thoth/Marseille decks, rerunning only for freshly-seeded decks
- `FASTAPI_ENV` default regression and an unintended lockfile change
- Backend test expectations after dependency and path validation changes
- `fastapi-mail` compatibility by pinning `starlette<1.0`
- Celery Makefile targets to use `uv run`

### Security
- Remediated npm and Python dependency vulnerabilities (initial pass plus follow-up)
- Bumped vulnerable backend dependencies and regenerated the lockfile
- Required Grafana admin password via environment variable in monitoring compose

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

