# Database disaster recovery

FOFL's database is the system of record. Configure Railway volume backups on the PostgreSQL service at all three available cadences (daily, weekly, and monthly) and enable point-in-time recovery before production launch. Volume snapshots are the fast recovery path; point-in-time recovery is the preferred path for accidental writes because it creates a separate restored PostgreSQL service without modifying the source database.

## Restore drill

Run this drill before launch, quarterly, and after material database changes:

1. Record the source database, selected backup or recovery timestamp, operator, and drill start time. Never practice by restoring over the serving database.
2. Restore into a sibling PostgreSQL service. Keep the original service online and unchanged.
3. Give the restored service temporary external connectivity and copy its connection string into `RESTORE_DATABASE_URL`. Do not replace the application's `DATABASE_URL`.
4. Run `RESTORE_EXPECTED_LEAGUE_SLUG=fofl RESTORE_DATABASE_URL=... pnpm db:verify-restore` from a trusted workstation or one-off private Railway job. The command is read-only and refuses to run when the restore target resolves to the configured application database.
5. Confirm the report finds the league, seasons, franchises, users, an active commissioner, valid primary ownership, consistent league/franchise access, audit history counts, and stable MFL identity for every franchise.
6. Point a temporary staging web service at the restored database and run `STAGING_BASE_URL=https://... pnpm smoke:staging`. Exercise sign-in and inspect a known franchise roster.
7. Record recovery time, recovered timestamp, verification output, and any data gap. Remove public database connectivity and delete the temporary web/database services only after the drill record is retained.

## Incident cutover

During a real incident, stop or restrict writes before selecting a recovery point. Restore to a sibling service, run the verification and smoke gates, then change the web service's database reference in a reviewed Railway staged change. Keep the former database isolated and intact until reconciliation is complete. Rotate any credentials exposed during the incident, validate `/api/ready`, and record the cutover and rollback connection targets.

The verification command proves application-level structure and invariants; it does not prove that every expected transaction exists. Use the incident timeline, audit log, MFL source records, and commissioner-confirmed roster snapshots to reconcile the recovery point.
