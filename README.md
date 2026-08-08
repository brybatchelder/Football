# Football

Private, contract-aware league operations for the **Front Office Football League**. This foundation is a modern owner portal and read-only 2026 MyFantasyLeague mirror; MFL remains the official platform during the 2026 season.

## Architecture

This is a modular single Next.js repository. The product is not yet large enough to justify monorepo release/versioning overhead, while `src/db`, `src/auth`, `src/domain`, and `src/mfl` preserve the boundaries that can later become packages. The PostgreSQL schema is multi-league and multi-season capable.

## Local development

Requirements: Node 20+, pnpm, and PostgreSQL 16+ for persistence. The UI can run without a database using deterministic demo data.

```bash
pnpm install
cp .env.example .env.local
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Open `http://localhost:3000`. Use `/sign-in` to select a development owner or commissioner. Development sign-in and seed accounts are disabled in production.

Useful commands:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm test:e2e
pnpm build
pnpm start
```

Health probes are `/api/health` (process) and `/api/ready` (database readiness). A missing database produces a deliberate degraded response instead of crashing the website.

## Railway

1. Create a Railway project and add a PostgreSQL service.
2. Add this repository as a web service. Railway supplies `DATABASE_URL` through a service reference.
3. Add the variables from `.env.example`; generate strong `BETTER_AUTH_SECRET` and `CRON_SECRET` values. MFL credentials are optional for public reads.
4. Set build command to `pnpm install --frozen-lockfile && pnpm build` and start command to `pnpm start`.
5. Run `pnpm db:migrate` and `NODE_ENV=development pnpm db:seed` once in a safe non-production demo environment. Never run the development seed against production.

See [deployment documentation](docs/architecture/deployment.md) for details.

## Current scope

Implemented: league dashboard, responsive full/grid roster reports and CSV export, franchise detail, commissioner setup and settings, fixture imports with reconciliation, audit view, role guards, comprehensive Drizzle model, health endpoints, domain tests, and route-specific milestone states.

Not active yet: live scoring, write transactions, auctions, drafts, lineup submissions, and community workflows. Their routes describe data dependencies and the 2026 source of truth.
