# Claude Instructions

## Database security baseline

For all newly created Postgres tables, enable Row Level Security (RLS) by default in the same migration that creates the table.

- Always include `ALTER TABLE <schema>.<table> ENABLE ROW LEVEL SECURITY;` immediately after table creation.
- Do not leave newly created public tables with RLS disabled.
- Add or update policies in the same change when table access is required.
