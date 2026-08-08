# ADR 0004: Multi-league-capable schema

Accepted. Although the first deployment hosts one league, every seasonal/configuration record resolves through league and league season. External IDs are never primary keys. This avoids a disruptive future tenancy redesign.
