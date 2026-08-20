import { describe, expect, it } from "vitest";
import { matchupWinProbability } from "./matchup-model";

describe("matchup win probability", () => {
  it("favors the team with the higher expected final score", () => {
    const favored = {
      starters: [{ projection: 20, status: "scheduled" }],
      actual: 10,
      remainingProjection: 20,
      remainingPlayers: 1,
    } as never;
    const underdog = {
      starters: [{ projection: 20, status: "scheduled" }],
      actual: 0,
      remainingProjection: 20,
      remainingPlayers: 1,
    } as never;
    expect(matchupWinProbability(favored, underdog)).toBeGreaterThan(0.5);
  });

  it("returns a deterministic outcome once all players finish", () => {
    const winner = {
      starters: [{ projection: 10, status: "final" }],
      actual: 101,
      remainingProjection: 0,
      remainingPlayers: 0,
    } as never;
    const loser = {
      starters: [{ projection: 10, status: "final" }],
      actual: 100,
      remainingProjection: 0,
      remainingPlayers: 0,
    } as never;
    expect(matchupWinProbability(winner, loser)).toBe(1);
  });
});
