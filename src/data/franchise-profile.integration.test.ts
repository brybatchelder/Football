import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import * as schema from "@/db/schema";

const databaseState = vi.hoisted(() => ({ db: undefined as unknown }));
vi.mock("server-only", () => ({}));
vi.mock("@/db/client", () => ({ getDb: () => databaseState.db }));

import { loadFranchiseProfile } from "@/data/franchise-profile";

describe.sequential("database-backed franchise profiles", () => {
  let pg: PGlite;
  const leagueId = crypto.randomUUID();
  const olderSeasonId = crypto.randomUUID();
  const currentSeasonId = crypto.randomUUID();
  const divisionId = crypto.randomUUID();
  const franchiseId = crypto.randomUUID();
  const primaryOwnerId = crypto.randomUUID();
  const coOwnerId = crypto.randomUUID();
  const previousDatabaseUrl = process.env.DATABASE_URL;
  const previousLeagueSlug = process.env.FOFL_LEAGUE_SLUG;
  const previousMflSeason = process.env.MFL_SEASON;

  beforeAll(async () => {
    process.env.DATABASE_URL = "postgres://embedded/franchise-profile";
    process.env.FOFL_LEAGUE_SLUG = "profile-league";
    delete process.env.MFL_SEASON;
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
    await pg.exec(`
      insert into leagues (id, name, slug, timezone)
      values ('${leagueId}', 'Profile League', 'profile-league', 'America/Chicago');
      insert into league_seasons (id, league_id, year, status, salary_cap)
      values
        ('${olderSeasonId}', '${leagueId}', 2025, 'complete', 950.00),
        ('${currentSeasonId}', '${leagueId}', 2026, 'preseason', 1000.00);
      insert into divisions (id, league_season_id, name, sort_order)
      values ('${divisionId}', '${currentSeasonId}', 'Central Division', 1);
      insert into franchises (id, league_id, name, slug, abbreviation)
      values ('${franchiseId}', '${leagueId}', 'Canton Legends', 'canton-legends', 'CAN');
      insert into franchise_seasons (franchise_id, league_season_id, division_id)
      values ('${franchiseId}', '${currentSeasonId}', '${divisionId}');
      insert into franchise_branding (
        franchise_id, primary_color, secondary_color, logo_url
      ) values ('${franchiseId}', '#7f1d1d', '#0f172a', 'https://example.com/canton.png');
      insert into users (id, email, name)
      values
        ('${primaryOwnerId}', 'primary@example.com', 'Primary Owner'),
        ('${coOwnerId}', 'coowner@example.com', 'Co Owner');
      insert into franchise_memberships (
        user_id, franchise_id, league_season_id, role, active, is_primary
      ) values
        ('${primaryOwnerId}', '${franchiseId}', '${currentSeasonId}', 'owner', true, true),
        ('${coOwnerId}', '${franchiseId}', '${currentSeasonId}', 'owner', true, false);
      insert into franchise_aliases (
        franchise_id, name, abbreviation, effective_from_season,
        effective_to_season, source
      ) values (
        '${franchiseId}', 'Canton Bulldogs', 'CBD', 2019, 2022, 'historical-import'
      );
    `);
  }, 30_000);

  afterAll(async () => {
    if (previousDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previousDatabaseUrl;
    if (previousLeagueSlug === undefined) delete process.env.FOFL_LEAGUE_SLUG;
    else process.env.FOFL_LEAGUE_SLUG = previousLeagueSlug;
    if (previousMflSeason === undefined) delete process.env.MFL_SEASON;
    else process.env.MFL_SEASON = previousMflSeason;
    await pg.close();
  });

  it("loads the latest season with scoped ownership, branding, and identity history", async () => {
    const profile = await loadFranchiseProfile("canton-legends");
    expect(profile).toMatchObject({
      id: franchiseId,
      leagueId,
      seasonId: currentSeasonId,
      seasonYear: 2026,
      salaryCap: "1000.00",
      division: "Central Division",
      primaryColor: "#7f1d1d",
      source: "database",
    });
    expect(profile?.owners).toEqual([
      { name: "Primary Owner", isPrimary: true },
      { name: "Co Owner", isPrimary: false },
    ]);
    expect(profile?.aliases).toEqual([
      {
        name: "Canton Bulldogs",
        abbreviation: "CBD",
        effectiveFromSeason: 2019,
        effectiveToSeason: 2022,
      },
    ]);
  });

  it("honors an explicitly configured historical season without mixing current memberships", async () => {
    process.env.MFL_SEASON = "2025";
    const profile = await loadFranchiseProfile("canton-legends");
    expect(profile).toMatchObject({
      seasonId: olderSeasonId,
      seasonYear: 2025,
      salaryCap: "950.00",
      active: false,
      division: null,
      owners: [],
    });
    delete process.env.MFL_SEASON;
  });

  it("returns no profile for unknown franchise slugs", async () => {
    await expect(loadFranchiseProfile("unknown-team")).resolves.toBeNull();
  });
});
