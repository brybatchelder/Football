import { describe, expect, it } from "vitest";
import { scoreStats } from "./scoring-engine";

describe("scoreStats", () => {
  it("scores configurable passing, receiving, and defensive rules", () => {
    expect(scoreStats({ passing_yards: 250, receptions: 5, sacks: 2 }, [
      { statKey: "passing_yards", points: 1, threshold: 25 },
      { statKey: "receptions", points: 1 },
      { statKey: "sacks", points: 1 },
    ])).toMatchObject({ points: 17 });
  });
});
