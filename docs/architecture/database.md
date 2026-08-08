# Database

The schema separates platform, league, season, franchise, ownership, canonical NFL players, player seasons, roster assignments, salaries, contracts, competition, transactions, rules, imports, and audit. UUID primary keys are internal; provider IDs live in dedicated columns/tables. Money and points use PostgreSQL `numeric` and decimal arithmetic in domain services.

Core rules are queryable versioned tables, not one opaque JSON settings document. JSON is limited to extensible statistics, raw import payloads, snapshots, and non-core preferences.

Generate and run migrations with `pnpm db:generate` and `pnpm db:migrate`. The seed is idempotent at league/season boundaries and rejects production mode. Multi-record mutations must run in a Drizzle transaction and append an audit row in the same transaction.

Dates use timezone-aware timestamps. Presentation uses `America/Chicago`; date-only contract boundaries use PostgreSQL dates.
