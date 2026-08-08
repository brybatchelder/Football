import { describe, expect, it } from "vitest";
import { favoritePositions, lineupFormation } from "./lineup-formation";

describe("lineupFormation", () => {
  it.each([
    [["RB", "RB"], "Ground & Pound"], [["RB", "WR"], "Balanced"], [["RB", "TE"], "Power-I"],
    [["WR", "WR"], "Air Raid"], [["WR", "TE"], "West Coast"], [["TE", "TE"], "Jumbo Package"],
  ] as const)("names the %s OFLEX build", (positions, name) => {
    expect(lineupFormation(positions.map((position) => ({ position, slot: "OFLEX" }))).offense.name).toBe(name);
  });
  it.each([
    [["DL", "DL"], "The Trenches"], [["DL", "LB"], "Heavy Front"], [["DL", "DB"], "Big Nickel"],
    [["LB", "LB"], "The Wolfpack"], [["LB", "DB"], "Swiss Army"], [["DB", "DB"], "No-Fly Zone"],
  ] as const)("names the %s DFLEX build", (positions, name) => {
    expect(lineupFormation(positions.map((position) => ({ position, slot: "DFLEX" }))).defense.name).toBe(name);
  });
  it("finds a lineup's elevated offensive and defensive positions", () => {
    expect(favoritePositions([
      { position: "RB", slot: "RB" }, { position: "RB", slot: "RB" }, { position: "RB", slot: "OFLEX" },
      { position: "WR", slot: "WR" }, { position: "TE", slot: "TE" }, { position: "DL", slot: "DL" },
      { position: "DL", slot: "DFLEX" }, { position: "LB", slot: "LB" }, { position: "DB", slot: "DB" },
    ])).toEqual({ offense: ["RB"], defense: ["DL"] });
  });
});
