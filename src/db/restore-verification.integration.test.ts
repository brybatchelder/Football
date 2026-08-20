import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  verifyRestoredDatabase,
  sameDatabaseTarget,
  type RestoreVerificationDatabase,
} from "@/db/restore-verification";

describe("restore target guard", () => {
  it("recognizes equivalent PostgreSQL targets without comparing passwords", () => {
    expect(
      sameDatabaseTarget(
        "postgres://fofl:new-password@DB.EXAMPLE.com/league",
        "postgresql://fofl:old-password@db.example.com:5432/league",
      ),
    ).toBe(true);
    expect(
      sameDatabaseTarget(
        "postgres://fofl:password@db.example.com:5433/league",
        "postgres://fofl:password@db.example.com:5432/league",
      ),
    ).toBe(false);
  });
});

describe.sequential("restored database verification", () => {
  let pg: PGlite;
  let database: RestoreVerificationDatabase;

  beforeAll(async () => {
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
    database = drizzle(pg) as unknown as RestoreVerificationDatabase;
    await pg.exec(`
      insert into users (id, email, name, email_verified)
      values ('00000000-0000-4000-8000-000000000001', 'commissioner@example.com', 'Commissioner', true);
      insert into leagues (id, name, slug, timezone)
      values ('00000000-0000-4000-8000-000000000002', 'FOFL', 'fofl', 'America/Chicago');
      insert into league_seasons (id, league_id, year, status, salary_cap)
      values (
        '00000000-0000-4000-8000-000000000003',
        '00000000-0000-4000-8000-000000000002',
        2026,
        'preseason',
        1000.00
      );
      insert into franchises (id, league_id, name, slug, abbreviation)
      values (
        '00000000-0000-4000-8000-000000000004',
        '00000000-0000-4000-8000-000000000002',
        'Test Team',
        'test-team',
        'TST'
      );
      insert into league_memberships (user_id, league_id, role, active)
      values (
        '00000000-0000-4000-8000-000000000001',
        '00000000-0000-4000-8000-000000000002',
        'commissioner',
        true
      );
      insert into franchise_memberships (
        user_id, franchise_id, league_season_id, role, active, is_primary
      ) values (
        '00000000-0000-4000-8000-000000000001',
        '00000000-0000-4000-8000-000000000004',
        '00000000-0000-4000-8000-000000000003',
        'owner',
        true,
        true
      );
      insert into provider_franchise_ids (franchise_id, provider, external_id)
      values (
        '00000000-0000-4000-8000-000000000004',
        'mfl',
        '0001'
      );
    `);
  }, 30_000);

  afterAll(async () => {
    await pg.close();
  });

  it("reports a structurally valid restored league", async () => {
    await expect(verifyRestoredDatabase(database, "fofl")).resolves.toEqual({
      leagueSlug: "fofl",
      seasons: 1,
      franchises: 1,
      users: 1,
      activeCommissioners: 1,
      auditRecords: 0,
      checks: [
        "league_and_season_present",
        "commissioner_access_present",
        "cross_league_memberships_absent",
        "active_access_consistent",
        "primary_owner_invariant",
        "mfl_identity_complete",
      ],
    });
  });

  it("rejects a restore with missing provider identity", async () => {
    await pg.exec("delete from provider_franchise_ids;");
    await expect(verifyRestoredDatabase(database, "fofl")).rejects.toThrow(
      "lack stable MFL identity",
    );
  });
});
