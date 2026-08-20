# Database

The schema separates platform, authentication, league, season, franchise, ownership, invitations, canonical NFL players, player seasons, roster assignments, salaries, contracts, competition, transactions, rules, imports, and audit. UUID primary keys are internal; provider IDs live in dedicated columns/tables. Money and points use PostgreSQL `numeric` and decimal arithmetic in domain services.

Core rules are queryable versioned tables, not one opaque JSON settings document. JSON is limited to extensible statistics, raw import payloads, snapshots, and non-core preferences.

Generate and run migrations with `pnpm db:generate` and `pnpm db:migrate`. The seed is idempotent at league/season boundaries and rejects production mode. Multi-record mutations must run in a Drizzle transaction and append an audit row in the same transaction.

`pnpm test:db` applies every checked-in migration to a fresh PGlite PostgreSQL runtime, then exercises the partial unique indexes for pending invitations and primary ownership, league-scoped franchise abbreviation uniqueness, and stable external-franchise identity uniqueness. Hosted PostgreSQL migration testing is still required in staging before release.

Membership uniqueness is enforced per user/league and user/franchise/season, with a partial unique index allowing only one active primary owner per franchise/season. Invitations retain history, use only SHA-256 token hashes at rest, and are reusable only by issuing a new record after an earlier invitation is accepted or revoked.

`provider_franchise_ids` maps an MFL league/franchise identifier to one durable FOFL franchise. MFL or commissioner renames update the current identity while preserving the stable slug and writing the former name to `franchise_aliases`; a rebrand therefore cannot silently create a second franchise or split historical ownership. Production player and franchise loaders never substitute demo ownership when PostgreSQL is empty or unavailable. Deterministic roster fixtures are restricted to database-free local development.

Dates use timezone-aware timestamps. Presentation uses `America/Chicago`; date-only contract boundaries use PostgreSQL dates.
