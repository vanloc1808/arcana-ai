# Agent Instructions

## Database security baseline

For all newly created Postgres tables, enable Row Level Security (RLS) by default in the same migration that creates the table.

- Always include `ALTER TABLE <schema>.<table> ENABLE ROW LEVEL SECURITY;` immediately after table creation.
- Do not leave newly created public tables with RLS disabled.
- Add or update policies in the same change when table access is required.

## Changelog

When making user-facing changes, update `backend/docs/CHANGELOG.md` as part of the same change.

- Follow the existing [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) format and [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
- Add entries under the appropriate section: `Added`, `Changed`, `Deprecated`, `Removed`, `Fixed`, `Security`.
- Create the changelog when a new pull request is opened, and update it as the PR evolves. Don't wait until the end to write the changelog entry. Each pull request should be attached with a changelog entry (version) from the moment it's opened, even if it's a draft. This ensures that the changelog is always up to date and reflects the current state of the codebase.
- Skip changelog updates only for changes with no user-visible impact (internal refactors, test-only changes, CI tweaks, dependency bumps without behavior changes).

## Pull request hygiene

When pushing a substantive change to an existing PR, update the PR title and description to reflect the new scope. Title should describe the dominant theme; description should list each feature/change shipped on the branch with a short summary. Stale titles like "feat: X" when the branch now ships X+Y+Z are confusing for reviewers.

## Roadmap tracking

When shipping a feature from `plans/feature-recommendations.md`, mark it as done in the same commit: flip the row's status in the priority matrix from `☐` to `✅` and append `✅ Shipped` to the feature's section heading. Keeps the doc honest about what's actually done.
