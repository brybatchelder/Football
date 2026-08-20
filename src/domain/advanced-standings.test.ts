import { describe, expect, it } from "vitest";
import {
  allPlayStandings,
  expectedWins,
  scheduleLuck,
} from "./advanced-standings";

describe("advanced standings", () => {
  const scores = [
    { teamId: "a", week: 1, score: 120 },
    { teamId: "b", week: 1, score: 110 },
    { teamId: "c", week: 1, score: 110 },
    { teamId: "a", week: 2, score: 90 },
    { teamId: "b", week: 2, score: 100 },
    { teamId: "c", week: 2, score: 80 },
  ];
  it("calculates all-play wins, losses, ties, and expected wins from weekly scores", () => {
    expect(allPlayStandings(scores).a).toMatchObject({
      wins: 3,
      losses: 1,
      ties: 0,
      games: 4,
    });
    expect(expectedWins(scores).a).toBe(1.5);
  });
  it("reports schedule luck as actual wins minus expected wins", () => {
    expect(scheduleLuck(3, 1.5)).toBe(1.5);
  });
});
