import { describe, expect, it } from "vitest";
import { projectedBracket, seedPlayoffField } from "./playoff-race";

const teams = [
  { id: "east", division: "East", wins: 7, losses: 2, pointsFor: 1000 },
  { id: "central", division: "Central", wins: 6, losses: 3, pointsFor: 900 },
  { id: "west", division: "West", wins: 5, losses: 4, pointsFor: 800 },
  { id: "wild", division: "East", wins: 6, losses: 3, pointsFor: 850 },
  { id: "out", division: "Central", wins: 4, losses: 5, pointsFor: 990 },
];

describe("playoff race", () => {
  it("seeds division leaders before wild cards and identifies first out", () => {
    const race = seedPlayoffField(teams, { playoffTeams: 4, divisionWinners: 3, byeTeams: 2 });
    expect(race.field.map((team) => team.id)).toEqual(["east", "central", "west", "wild"]);
    expect(race.firstOut?.id).toBe("out");
  });
  it("creates byes and high-versus-low first-round pairings", () => {
    const race = seedPlayoffField(teams, { playoffTeams: 4, divisionWinners: 3, byeTeams: 2 });
    const bracket = projectedBracket(race.field, { playoffTeams: 4, divisionWinners: 3, byeTeams: 2 });
    expect(bracket.byes.map((team) => team.id)).toEqual(["east", "central"]);
    expect(bracket.matchups[0]).toMatchObject({ higherSeed: { id: "west" }, lowerSeed: { id: "wild" } });
  });
});
