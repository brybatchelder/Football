import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import * as schema from "@/db/schema";

const databaseState = vi.hoisted(() => ({ db: undefined as unknown }));
vi.mock("server-only", () => ({}));
vi.mock("@/db/client", () => ({ getDb: () => databaseState.db }));

import {
  bootstrapAccountExists,
  grantBootstrapCommissioner,
} from "@/auth/bootstrap";

describe.sequential("commissioner bootstrap recovery", () => {
  let pg: PGlite;
  let db: ReturnType<typeof drizzle<typeof schema>>;
  const userId = "00000000-0000-4000-8000-000000000011";
  const leagueId = "00000000-0000-4000-8000-000000000012";
  const email = "recovery-commissioner@example.com";

  beforeAll(async () => {
    vi.stubEnv("AUTH_BOOTSTRAP_COMMISSIONER_EMAIL", email);
    vi.stubEnv("FOFL_LEAGUE_SLUG", "bootstrap-recovery");
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
    db = drizzle(pg, { schema });
    databaseState.db = db;
    await pg.exec(`
      insert into users (id, email, name, email_verified)
      values ('${userId}', '${email}', 'Recovery Commissioner', true);
      insert into leagues (id, name, slug, timezone)
      values ('${leagueId}', 'Bootstrap Recovery', 'bootstrap-recovery', 'America/Chicago');
    `);
  }, 30_000);

  afterAll(async () => {
    vi.unstubAllEnvs();
    await pg.close();
  });

  it("detects an account stranded before the league grant", async () => {
    await expect(bootstrapAccountExists(email)).resolves.toBe(true);
  });

  it("serializes and idempotently repairs the commissioner grant", async () => {
    await expect(
      Promise.all([
        grantBootstrapCommissioner(userId, email),
        grantBootstrapCommissioner(userId, email),
      ]),
    ).resolves.toEqual([true, true]);
    const memberships = await db.query.leagueMemberships.findMany({
      where: (table, { eq }) => eq(table.leagueId, leagueId),
    });
    const audits = await db.query.auditLogs.findMany({
      where: (table, { eq }) =>
        eq(table.action, "commissioner.bootstrap.created"),
    });
    expect(memberships).toHaveLength(1);
    expect(memberships[0]).toMatchObject({
      userId,
      role: "commissioner",
      active: true,
    });
    expect(audits).toHaveLength(1);
  });
});
