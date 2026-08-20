import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import * as schema from "@/db/schema";

const databaseState = vi.hoisted(() => ({ db: undefined as unknown }));
vi.mock("server-only", () => ({}));
vi.mock("@/db/client", () => ({ getDb: () => databaseState.db }));

import { cleanupExpiredAuthData } from "@/auth/retention";

describe.sequential("authentication data retention", () => {
  let pg: PGlite;
  const userId = crypto.randomUUID();
  const now = new Date("2026-08-20T03:00:00.000Z");

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
    await pg.exec(`
      insert into users (id, email, name)
      values ('${userId}', 'retention@example.com', 'Retention Owner');
      insert into sessions (user_id, token, expires_at)
      values
        ('${userId}', 'expired-session', '2026-08-19T03:00:00.000Z'),
        ('${userId}', 'active-session', '2026-08-21T03:00:00.000Z');
      insert into auth_verifications (identifier, value, expires_at)
      values
        ('expired@example.com', 'expired', '2026-08-19T03:00:00.000Z'),
        ('active@example.com', 'active', '2026-08-21T03:00:00.000Z');
      insert into auth_rate_limits (key, count, last_request)
      values
        ('expired-rate-limit', 1, ${now.getTime() - 25 * 60 * 60 * 1_000}),
        ('active-rate-limit', 1, ${now.getTime() - 60 * 60 * 1_000});
    `);
  }, 30_000);

  afterAll(async () => {
    await pg.close();
  });

  it("removes expired rows while retaining active credentials and limits", async () => {
    await expect(cleanupExpiredAuthData(now)).resolves.toEqual({
      sessions: 1,
      verifications: 1,
      rateLimits: 1,
    });
    const sessions = await pg.query<{ token: string }>(
      "select token from sessions order by token",
    );
    const verifications = await pg.query<{ value: string }>(
      "select value from auth_verifications order by value",
    );
    const rateLimits = await pg.query<{ key: string }>(
      "select key from auth_rate_limits order by key",
    );
    expect(sessions.rows).toEqual([{ token: "active-session" }]);
    expect(verifications.rows).toEqual([{ value: "active" }]);
    expect(rateLimits.rows).toEqual([{ key: "active-rate-limit" }]);
  });
});
