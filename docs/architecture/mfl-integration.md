# MFL integration

`LeagueProvider`, `PlayerDataProvider`, and `ScoringDataProvider` keep consumers provider-neutral. `MflFixtureAdapter` accepts validated local JSON and produces import counts and reconciliation issues. XML normalization can be added behind the same contract.

Environment keys are `MFL_BASE_URL`, `MFL_LEAGUE_ID`, `MFL_SEASON`, `MFL_API_USERNAME`, and `MFL_API_PASSWORD`. Credentials are optional for public reads and must never cross a server response boundary.

Imports are idempotent by provider/external ID and season. Every run records dry-run state, counts, timestamps, raw records where helpful, human-readable issues, and a correlation ID. Invalid references are preserved as reconciliation issues instead of discarded. Apply mode must use a database transaction and write the audit log. There are no HTML scrapers or MFL write operations.
