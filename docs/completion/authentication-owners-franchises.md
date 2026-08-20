# Authentication / Owners / Franchises completion audit

Audit date: August 19, 2026. Functional reference: the public 2026 FOFL MyFantasyLeague home, login, roster, and Franchise Information surfaces for league 22632.

## Implemented

- Better Auth email/password identity with verified email, password reset, session/device management, database rate limits, secure cookies, and invitation-only registration.
- Seven-day exact-email owner invitations, replay-safe acceptance, revocation, re-send, existing-account acceptance, and transactionally audited league/franchise grants.
- One-time first-commissioner bootstrap that automatically closes, serializes the grant, and can recover an account stranded between auth creation and league membership creation.
- League roles and permissions for owners, assistant commissioners, commissioners, and platform administrators, enforced on server pages, actions, and APIs.
- Current-season franchise memberships, co-owners, one active primary owner, active-franchise selection, cross-league isolation, and automatic primary-owner handoff.
- Commissioner owner administration for invitations, league roles/status, franchise status, and primary ownership with confirmations, visible outcomes, audit history, and last-commissioner protection.
- Durable franchise identity, MFL identity aliases, historical names, branding, owner-editable name/abbreviation/colors/HTTPS logo, current ownership, and database-backed franchise/roster pages.
- A private, authenticated franchise/member directory at `/league/teams`; email addresses are selected only after active league membership is established.
- Loading, empty, error, success, desktop, tablet, and phone behavior for the owner/franchise workflows.
- Production configuration/readiness checks, browser security headers, auth-data cleanup, retry-safe transactional email, deployment-as-code, CI, staging smoke, and restore verification.

## MFL parity

Covered from MFL's owner/franchise surfaces:

- League login, remembered sessions, logout, and account recovery.
- Franchise-to-owner assignment, primary/co-owner representation, franchise directory, private member contact information, and navigation to current rosters.
- Commissioner creation and owner-access administration.
- Franchise name, abbreviation, logo/branding, current division display, active status, and roster access.

MFL's Franchise Information report also links accounting, current/career records, schedules, transaction history, and year-to-date scoring. Those links depend on the later Accounting, Transaction Ledger, Schedule/Matchups, Scoring, and History modules and are not duplicated with placeholder data here.

## FOFL improvements

- Permissions are league- and season-scoped rather than tied to MFL's shared account/franchise model.
- Invitations and bootstrap grants are exact-email, single-use, audited, concurrency-safe, and recoverable.
- Stable FOFL franchise IDs remain independent of MFL IDs and preserve aliases across renames and seasons.
- Owners can maintain approved franchise branding directly while commissioners retain access control.
- Primary ownership and last-commissioner invariants are enforced during mutations instead of relying on manual commissioner cleanup.
- The directory exposes only active members of the selected league; public visitors, inactive members, and other-league accounts cannot retrieve contact data.

## Remaining gaps

- Provision the hosted staging PostgreSQL and Resend domain/API key.
- Apply migrations and run the real MFL sync against league 22632.
- Exercise verification, reset, invitation, existing-account acceptance, bootstrap recovery, owner deactivation, and multi-device revocation using real mail and sessions.
- Run the protected staging smoke workflow and a sibling-database restore drill.
- Confirm final desktop/mobile/accessibility behavior with the imported twelve franchises and real owner accounts.
- Later foundational modules must supply accounting, transaction history, schedules, records, scoring, and historical franchise summaries linked from the directory/profile.

## Tests

- PGlite integration coverage for migrations, Better Auth onboarding, invitation acceptance/replay, bootstrap recovery, owner mutations, cross-league access, primary ownership, franchise identity, private directory data, readiness, retention, and restore invariants.
- Unit coverage for authorization, configuration, security headers, email retries/idempotency, and staging smoke behavior.
- Chromium E2E coverage for permissions, commissioner navigation, owner directory/navigation, sign-out, security headers, bootstrap closure, and phone-width franchise/directory layouts.
- Release gates: lint, TypeScript, full Vitest suite, production build, and Playwright E2E.

## Production status

**FUNCTIONAL BUT INCOMPLETE**

All critical local workflows are implemented and verified. Production readiness remains unproven until the hosted database, real email delivery, imported FOFL data, and restore/staging exercises above pass. Do not advance to the League / Season / Stage Engine until this status is promoted to **PRODUCTION READY** or the staging dependency is explicitly accepted as an external release gate.
