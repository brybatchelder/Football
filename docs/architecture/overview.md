# Architecture overview

Football uses Next.js App Router as the HTTP and UI boundary, PostgreSQL for durable state, Drizzle for typed data access, Better Auth as the production identity boundary, Zod for mutation validation, and domain services for money, roster, permission, scoring, and import rules.

The modular single-repository choice keeps deployment straightforward while preserving package boundaries:

- `src/domain`: decimal-safe, framework-independent league rules.
- `src/db`: schema, connection lifecycle, migration inputs, and seed.
- `src/auth`: league/platform role checks and validated authentication inputs.
- `src/mfl`: provider-neutral contracts and fixture adapter.
- `src/data`: explicitly labeled demo projections used when PostgreSQL is absent.
- `src/app`: thin route composition and HTTP handlers.
- `src/components`: reusable application shell and league presentation.

Provider imports flow through parse → preview → reconcile → transactional apply → audit. The 2026 product performs no MFL writes or HTML scraping.

## Error and loading policy

Server APIs return correlation IDs and safe messages. Database readiness degrades independently from process health. Client actions show local progress/result states. Production errors never serialize stack traces.
