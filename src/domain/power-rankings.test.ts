import { describe, expect, it } from "vitest";
import { powerRankings } from "./power-rankings";

describe("power rankings", () => {
  it("ranks actual roster strength rather than record", () => {
    const rankings = powerRankings([
      {
        id: "strong-5-4",
        lineupStrength: 95,
        depthStrength: 80,
        offenseStrength: 90,
        defenseStrength: 80,
      },
      {
        id: "weak-7-2",
        lineupStrength: 45,
        depthStrength: 50,
        offenseStrength: 45,
        defenseStrength: 50,
      },
    ]);
    expect(rankings.map((team) => team.id)).toEqual(["strong-5-4", "weak-7-2"]);
  });
  it("weights lineup strength more heavily than depth", () => {
    const rankings = powerRankings([
      {
        id: "lineup",
        lineupStrength: 90,
        depthStrength: 40,
        offenseStrength: 80,
        defenseStrength: 70,
      },
      {
        id: "depth",
        lineupStrength: 50,
        depthStrength: 90,
        offenseStrength: 70,
        defenseStrength: 80,
      },
    ]);
    expect(rankings[0].id).toBe("lineup");
  });
});
