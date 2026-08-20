import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import * as schema from "@/db/schema";

const databaseState = vi.hoisted(() => ({ db: undefined as unknown }));
vi.mock("server-only", () => ({}));
vi.mock("@/db/client", () => ({
  checkDatabase: async () => ({ ok: true as const }),
  getDb: () => databaseState.db,
}));

import { checkApplicationDatabase } from "@/db/readiness";

describe.sequential("application database readiness", () => {
  let pg: PGlite;
  const leagueId = crypto.randomUUID();

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
    databaseState.db = drizzle(pg, { schema });
  }, 30_000);

  afterAll(async () => {
    await pg.close();
  });

  it("rejects a database that has not provisioned the configured league", async () => {
    await expect(checkApplicationDatabase("readiness-league")).resolves.toEqual(
      { ok: false, reason: "league_not_found" },
    );
  });

  it("rejects a configured season that has not been imported", async () => {
    await pg.exec(`
      insert into leagues (id, name, slug, timezone)
      values ('${leagueId}', 'Readiness League', 'readiness-league', 'America/Chicago')
    `);
    await expect(
      checkApplicationDatabase("readiness-league", 2026),
    ).resolves.toEqual({ ok: false, reason: "season_not_found" });
  });

  it("becomes ready only after the configured league season exists", async () => {
    await pg.exec(`
      insert into league_seasons (league_id, year, status, salary_cap)
      values ('${leagueId}', 2026, 'preseason', 1000.00)
    `);
    await expect(
      checkApplicationDatabase("readiness-league", 2026),
    ).resolves.toEqual({ ok: true });
  });
});
