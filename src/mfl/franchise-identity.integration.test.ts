import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import * as schema from "@/db/schema";

const databaseState = vi.hoisted(() => ({ db: undefined as unknown }));
vi.mock("server-only", () => ({}));
vi.mock("@/db/client", () => ({ getDb: () => databaseState.db }));

import { syncMflRoster } from "@/mfl/live-sync";

describe.sequential("MFL franchise identity continuity", () => {
  let pg: PGlite;
  let db: ReturnType<typeof drizzle<typeof schema>>;
  let currentFranchiseName = "Original Team";
  const originalFetch = globalThis.fetch;

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
    db = drizzle(pg, { schema });
    databaseState.db = db;
    vi.stubGlobal("fetch", async (input: string | URL | Request) => {
      const url = String(input);
      if (url.includes("TYPE=league")) {
        return jsonResponse({
          league: {
            id: "22632",
            name: "Front Office Football League",
            salaryCapAmount: "1000",
            divisions: { division: { id: "01", name: "Central Division" } },
            franchises: {
              franchise: {
                id: "0001",
                name: currentFranchiseName,
                division: "01",
              },
            },
          },
        });
      }
      if (url.includes("TYPE=rosters")) {
        return jsonResponse({ rosters: { franchise: [{ id: "0001" }] } });
      }
      if (url.includes("TYPE=players")) {
        return jsonResponse({ players: {} });
      }
      return new Response("gsis_id,display_name\n", { status: 200 });
    });
  }, 30_000);

  afterAll(async () => {
    vi.stubGlobal("fetch", originalFetch);
    await pg.close();
  });

  it("preserves the internal franchise and stable slug when MFL renames it", async () => {
    await syncMflRoster({
      dryRun: false,
      season: 2026,
      leagueId: "22632",
      baseUrl: "https://example.test",
    });
    const original = await db.query.franchises.findFirst();
    expect(original).toMatchObject({
      name: "Original Team",
      slug: "original-team",
    });

    currentFranchiseName = "Renamed Team";
    await syncMflRoster({
      dryRun: false,
      season: 2026,
      leagueId: "22632",
      baseUrl: "https://example.test",
    });

    const identities = await db.query.franchises.findMany();
    expect(identities).toHaveLength(1);
    expect(identities[0]).toMatchObject({
      id: original?.id,
      name: "Renamed Team",
      slug: "original-team",
    });
    await expect(db.query.providerFranchiseIds.findMany()).resolves.toEqual([
      expect.objectContaining({
        franchiseId: original?.id,
        provider: "mfl:22632",
        externalId: "0001",
      }),
    ]);
    await expect(db.query.franchiseAliases.findMany()).resolves.toEqual([
      expect.objectContaining({
        franchiseId: original?.id,
        name: "Original Team",
        effectiveToSeason: 2025,
        source: "mfl",
      }),
    ]);
  });
});

function jsonResponse(value: unknown) {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}
