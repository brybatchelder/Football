import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import * as schema from "@/db/schema";

const databaseState = vi.hoisted(() => ({ db: undefined as unknown }));
vi.mock("server-only", () => ({}));
vi.mock("@/db/client", () => ({ getDb: () => databaseState.db }));

import { loadPlayerPool } from "@/data/player-pool";

describe.sequential("production player-pool integrity", () => {
  let pg: PGlite;
  const previousDatabaseUrl = process.env.DATABASE_URL;

  beforeAll(async () => {
    process.env.DATABASE_URL = "postgres://embedded/player-pool";
    pg = await PGlite.create();
    const migrationDirectory = path.resolve(process.cwd(), "drizzle");
    const migrationFiles = (await readdir(migrationDirectory))
      .filter((file) => /^\d{4}_.+\.sql$/.test(file))
      .sort();
    for (const migrationFile of migrationFiles) {
      await pg.exec(
        await readFile(path.join(migrationDirectory, migrationFile), "utf8"),
      );
    }
    databaseState.db = drizzle(pg, { schema });
  }, 30_000);

  afterAll(async () => {
    if (previousDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previousDatabaseUrl;
    await pg.close();
  });

  it("returns a truthful empty state instead of demo ownership when the database has no players", async () => {
    await expect(loadPlayerPool(2026)).resolves.toEqual({
      players: [],
      source: "database-empty",
    });
  });

  it("resolves roster ownership, salary, and contract data only from persisted records", async () => {
    const leagueId = crypto.randomUUID();
    const seasonId = crypto.randomUUID();
    const franchiseId = crypto.randomUUID();
    const franchiseSeasonId = crypto.randomUUID();
    const nflTeamId = crypto.randomUUID();
    const playerId = crypto.randomUUID();
    const playerSeasonId = crypto.randomUUID();
    const rosterEntryId = crypto.randomUUID();
    await pg.exec(`
      insert into leagues (id, name, slug, timezone)
      values ('${leagueId}', 'Player Pool League', 'player-pool', 'America/Chicago');
      insert into league_seasons (id, league_id, year, status, salary_cap)
      values ('${seasonId}', '${leagueId}', 2026, 'preseason', 1000.00);
      insert into franchises (id, league_id, name, slug, abbreviation)
      values ('${franchiseId}', '${leagueId}', 'Canton Legends', 'canton-legends', 'CAN');
      insert into franchise_seasons (id, franchise_id, league_season_id)
      values ('${franchiseSeasonId}', '${franchiseId}', '${seasonId}');
      insert into nfl_teams (id, abbreviation, city, name, bye_week)
      values ('${nflTeamId}', 'DET', 'Detroit', 'Lions', 8);
      insert into players (id, display_name, first_name, last_name)
      values ('${playerId}', 'Test Runner', 'Test', 'Runner');
      insert into player_seasons (
        id, player_id, nfl_team_id, year, years_experience, nfl_status, prior_points
      ) values (
        '${playerSeasonId}', '${playerId}', '${nflTeamId}', 2026, 3, 'ACT', 123.45
      );
      insert into player_position_eligibility (player_season_id, position, is_primary)
      values ('${playerSeasonId}', 'RB', true);
      insert into roster_entries (
        id, franchise_season_id, player_season_id, status
      ) values ('${rosterEntryId}', '${franchiseSeasonId}', '${playerSeasonId}', 'active');
      insert into salaries (roster_entry_id, amount, effective_from)
      values ('${rosterEntryId}', 25.50, '2026-01-01');
      insert into contracts (
        roster_entry_id, start_year, end_year, total_years, status
      ) values ('${rosterEntryId}', 2026, 2028, 3, 'active');
    `);

    const pool = await loadPlayerPool(2026);
    expect(pool.source).toBe("nflverse");
    expect(pool.players).toEqual([
      expect.objectContaining({
        id: playerId,
        name: "Test Runner",
        team: "DET",
        position: "RB",
        franchiseId: "canton-legends",
        franchise: "Canton Legends",
        salary: "25.50",
        contractYears: 3,
        isRostered: true,
      }),
    ]);
  });
});
