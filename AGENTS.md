# Agent Instructions

## Changelog

When making user-facing changes, update `backend/docs/CHANGELOG.md` as part of the same change.

- Follow the existing [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) format and [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
- Add entries under the appropriate section: `Added`, `Changed`, `Deprecated`, `Removed`, `Fixed`, `Security`.
- Bump the version and date when cutting a release; otherwise append to the current unreleased/most recent version.
- Skip changelog updates only for changes with no user-visible impact (internal refactors, test-only changes, CI tweaks, dependency bumps without behavior changes).

## Pull request hygiene

When pushing a substantive change to an existing PR, update the PR title and description to reflect the new scope. Title should describe the dominant theme; description should list each feature/change shipped on the branch with a short summary. Stale titles like "feat: X" when the branch now ships X+Y+Z are confusing for reviewers.
