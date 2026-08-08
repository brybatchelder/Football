import { describe, expect, it } from "vitest";
import { MflFixtureAdapter } from "./provider";
const fixture = {
  league: { id: "1", name: "Test", season: 2026 },
  franchises: [{ id: "f1", name: "One" }],
  players: [
    {
      id: "p1",
      name: "Player One",
      franchiseId: "f1",
      salary: "10.00",
      contractYears: 2,
    },
    { id: "p2", name: "Orphan", franchiseId: "missing" },
  ],
};
describe("MFL fixture adapter", () => {
  it("parses players and preserves external IDs", () => {
    expect(new MflFixtureAdapter().players(fixture)[0]).toMatchObject({
      externalId: "p1",
      salary: "10.00",
      contractYears: 2,
    });
  });
  it("reconciles unknown references without discarding silently", () => {
    const preview = new MflFixtureAdapter().preview(fixture);
    expect(preview).toMatchObject({ imported: 2, skipped: 1, errors: 0 });
    expect(preview.issues[0]?.code).toBe("UNKNOWN_FRANCHISE");
  });
  it("is deterministic for idempotent import planning", async () => {
    const adapter = new MflFixtureAdapter();
    expect(await adapter.import(fixture, { dryRun: true })).toEqual(
      await adapter.import(fixture, { dryRun: true }),
    );
  });
});
