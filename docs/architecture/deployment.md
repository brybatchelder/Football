# Railway deployment

Create a Railway project, add PostgreSQL, then add the repository as the web service. Reference the database service's `DATABASE_URL`. The application listens through Next's Railway-compatible `PORT` handling.

Required production variables: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `LEAGUE_TIMEZONE=America/Chicago`. Configure `MFL_BASE_URL`, `MFL_LEAGUE_ID`, and `MFL_SEASON` for imports. MFL username/password are optional and server-only. Add `CRON_SECRET` before scheduled imports.

Build: `pnpm install --frozen-lockfile && pnpm build`. Start: `pnpm start`. Release migration: `pnpm db:migrate`. Probe `/api/health` for liveness and `/api/ready` for readiness.

The future worker service should share domain/database modules and claim durable `scheduled_jobs`. Redis is not required today; introduce it behind a queue interface when retryable imports, scoring fan-out, or notifications justify it.
