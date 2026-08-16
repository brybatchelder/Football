import { describe, expect, it } from "vitest";
import { normalizeNflverseData, parseCsv, planPlayerSync } from "./nflverse-player-sync";

describe("nflverse player sync", () => {
  it("parses quoted CSV values", () => {
    expect(parseCsv('gsis_id,display_name,college_name\n00-1,"Smith, John","Miami, FL"\n')).toEqual([
      { gsis_id: "00-1", display_name: "Smith, John", college_name: "Miami, FL" },
    ]);
  });

  it("overlays current roster attributes by GSIS ID", () => {
    const players = parseCsv("gsis_id,display_name,position,rookie_year\n00-1,John Smith,WR,2026\n");
    const rosters = parseCsv("gsis_id,team,position,years_exp,status\n00-1,GB,WR,0,ACT\n");
    expect(normalizeNflverseData(players, rosters)[0]).toMatchObject({ gsisId: "00-1", nflTeam: "GB", yearsExperience: 0, isActive: true });
  });

  it("links one exact owned player but sends ambiguous matches to review", () => {
    const incoming = normalizeNflverseData(
      parseCsv("gsis_id,display_name,position\n00-1,John Smith,WR\n00-2,Alex Brown,RB\n"),
      parseCsv("gsis_id,team,position\n00-1,GB,WR\n00-2,DAL,RB\n"),
    );
    const plan = planPlayerSync(incoming, [
      { playerId: "one", gsisId: null, displayName: "John Smith", position: "WR", nflTeam: "GB", owned: true },
      { playerId: "two", gsisId: null, displayName: "Alex Brown", position: "RB", nflTeam: "DAL", owned: true },
      { playerId: "three", gsisId: null, displayName: "Alex Brown", position: "RB", nflTeam: "DAL", owned: true },
    ]);
    expect(plan.actions).toContainEqual(expect.objectContaining({ kind: "link_existing", playerId: "one" }));
    expect(plan.issues).toContainEqual(expect.objectContaining({ code: "ambiguous_match", candidatePlayerIds: ["two", "three"] }));
  });
});
