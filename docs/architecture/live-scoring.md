# Live scoring and historical records

FOFL records provider observations as immutable normalized snapshots. The scoring engine consumes only normalized stat keys and versioned league scoring rules. A correction is a new observation followed by a recalculated score delta; it is never hidden or treated as a new NFL play.

The RedZone inference layer compares adjacent cumulative snapshots. It emits a touchdown only when the relevant touchdown counter changed by one; every other change is a grouped, explicitly non-play-by-play update. Future exact play data enriches the same event records rather than replacing this flow.

One server-side collector polls the provider. It does not poll while no games are active, uses a 30-second interval when no one is watching, and uses a configurable five-second interval while live viewers are connected. Browser clients consume the cached matchup/event state through a later SSE or WebSocket transport, never directly from the sports provider.

Historical identity is stable by internal player and franchise IDs. `provider_player_ids` maps providers to players; `franchise_aliases` tracks rebrands; franchise-season memberships preserve owner history. `season_results`, matchup records, championships, transactions, draft picks, salaries, and contracts provide the source records for league-memory queries and future aggregates.

Each submitted lineup also stores its derived formation snapshot. This preserves the formation actually deployed that week (for example, `Air Raid / No-Fly Zone`) even if roster data or scoring rules later change, and supports future GM-profile questions such as favorite positions, formation win rate, and rare-formation history.
