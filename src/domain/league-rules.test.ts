import { describe, expect, it } from "vitest";
import {
  hasPermission,
  rosterSummary,
  scoreStat,
  victoryPoints,
} from "./league-rules";
import type { RosterPlayer } from "./types";
const player = (overrides: Partial<RosterPlayer>): RosterPlayer => ({
  id: "p",
  franchiseId: "f",
  franchise: "F",
  name: "Player",
  team: "CHI",
  position: "RB",
  priorPoints: "0",
  bye: 7,
  salary: "100.10",
  contractYears: 2,
  status: "active",
  ...overrides,
});
describe("league rules", () => {
  it("calculates decimal-safe salary, effective cap, contracts, and roster counts", () => {
    const result = rosterSummary(
      [
        player({}),
        player({
          id: "ir",
          salary: "50.20",
          status: "injured_reserve",
          contractYears: 1,
        }),
        player({
          id: "taxi",
          salary: "10.10",
          status: "taxi",
          contractYears: 3,
        }),
      ],
      { cap: "1000", irPercent: "50", taxiPercent: "0", deadCap: "12.25" },
    );
    expect(result).toEqual({
      counts: { active: 1, injured_reserve: 1, taxi: 1 },
      salary: "160.40",
      effective: "137.45",
      available: "862.55",
      contractYears: 2,
    });
  });
  it("enforces permission ranks", () => {
    expect(hasPermission("owner", "manage_league")).toBe(false);
    expect(hasPermission("assistant_commissioner", "manage_league")).toBe(true);
    expect(hasPermission("assistant_commissioner", "manage_owners")).toBe(
      false,
    );
    expect(hasPermission("commissioner", "manage_owners")).toBe(true);
    expect(hasPermission("system_administrator", "manage_platform")).toBe(true);
  });
  it("calculates stable scoring and victory rank", () => {
    expect(scoreStat("17", "0.1")).toBe("1.70");
    expect(victoryPoints(["100", "90", "90", "80"], 1)).toBe("1.50");
  });
});
