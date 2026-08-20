import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { ViewerContext } from "@/auth/permissions";
import * as schema from "@/db/schema";

const databaseState = vi.hoisted(() => ({ db: undefined as unknown }));
vi.mock("server-only", () => ({}));
vi.mock("@/db/client", () => ({ getDb: () => databaseState.db }));

import { loadLeagueDirectory } from "@/data/league-directory";

describe.sequential("private league directory", () => {
  let pg: PGlite;
  const previousDatabaseUrl = process.env.DATABASE_URL;
  const leagueId = "00000000-0000-4000-8000-000000000101";
  const seasonId = "00000000-0000-4000-8000-000000000102";
  const franchiseId = "00000000-0000-4000-8000-000000000103";
  const primaryId = "00000000-0000-4000-8000-000000000104";
  const coOwnerId = "00000000-0000-4000-8000-000000000105";
  const commissionerId = "00000000-0000-4000-8000-000000000106";
  const viewer: ViewerContext = {
    authenticated: true,
    user: {
      id: primaryId,
      email: "primary@example.com",
      name: "Primary Owner",
    },
    role: "owner",
    league: {
      id: leagueId,
      slug: "directory-test",
      name: "Directory Test League",
      timezone: "America/Chicago",
    },
    season: { id: seasonId, year: 2026, status: "preseason" },
    franchises: [],
    activeFranchise: null,
    source: "better-auth",
  };

  beforeAll(async () => {
    process.env.DATABASE_URL = "postgres://embedded/directory";
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
      insert into users (id, email, name, email_verified)
      values
        ('${primaryId}', 'primary@example.com', 'Primary Owner', true),
        ('${coOwnerId}', 'coowner@example.com', 'Co Owner', true),
        ('${commissionerId}', 'commissioner@example.com', 'Commissioner', true),
        ('00000000-0000-4000-8000-000000000107', 'inactive@example.com', 'Inactive Owner', true),
        ('00000000-0000-4000-8000-000000000108', 'foreign@example.com', 'Foreign Owner', true);
      insert into leagues (id, name, slug, timezone)
      values
        ('${leagueId}', 'Directory Test League', 'directory-test', 'America/Chicago'),
        ('00000000-0000-4000-8000-000000000109', 'Foreign League', 'foreign-directory', 'America/Chicago');
      insert into league_seasons (id, league_id, year, status, salary_cap)
      values ('${seasonId}', '${leagueId}', 2026, 'preseason', 1000.00);
      insert into franchises (id, league_id, name, slug, abbreviation)
      values ('${franchiseId}', '${leagueId}', 'Directory Team', 'directory-team', 'DIR');
      insert into league_memberships (user_id, league_id, role, active)
      values
        ('${primaryId}', '${leagueId}', 'owner', true),
        ('${coOwnerId}', '${leagueId}', 'owner', true),
        ('${commissionerId}', '${leagueId}', 'commissioner', true),
        ('00000000-0000-4000-8000-000000000107', '${leagueId}', 'owner', false),
        ('00000000-0000-4000-8000-000000000108', '00000000-0000-4000-8000-000000000109', 'owner', true);
      insert into franchise_memberships (
        user_id, franchise_id, league_season_id, role, active, is_primary
      ) values
        ('${primaryId}', '${franchiseId}', '${seasonId}', 'owner', true, true),
        ('${coOwnerId}', '${franchiseId}', '${seasonId}', 'owner', true, false);
    `);
  }, 30_000);

  afterAll(async () => {
    if (previousDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previousDatabaseUrl;
    await pg.close();
  });

  it("returns active, league-scoped private contacts and current ownership", async () => {
    const directory = await loadLeagueDirectory(viewer);
    expect(directory).toMatchObject({
      leagueName: "Directory Test League",
      seasonYear: 2026,
      source: "database",
    });
    expect(directory.members).toHaveLength(3);
    expect(directory.members.map((member) => member.email)).toEqual([
      "coowner@example.com",
      "commissioner@example.com",
      "primary@example.com",
    ]);
    expect(
      directory.members.find((member) => member.userId === primaryId),
    ).toMatchObject({
      role: "owner",
      franchises: [
        {
          id: franchiseId,
          slug: "directory-team",
          isPrimary: true,
        },
      ],
    });
    expect(
      directory.members.find((member) => member.userId === commissionerId)
        ?.franchises,
    ).toEqual([]);
  });
});
