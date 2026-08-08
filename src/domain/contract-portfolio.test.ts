import { describe, expect, it } from "vitest";
import { contractPortfolio, contractStatus } from "./contract-portfolio";
import type { RosterPlayer } from "./types";

const player = (overrides: Partial<RosterPlayer>): RosterPlayer => ({
  id: "p", franchiseId: "f", franchise: "F", name: "Player", team: "NFL", position: "WR", priorPoints: "0", bye: 1,
  salary: "10", contractYears: 1, status: "active", ...overrides,
});

describe("contract portfolio", () => {
  it("calculates cap, future commitments, expiring contracts, and position spend", () => {
    const portfolio = contractPortfolio([player({ salary: "10", contractYears: 1 }), player({ id: "q", position: "RB", salary: "30", contractYears: 3 })]);
    expect(portfolio).toMatchObject({ committed: "40.00", available: "960.00", contractYearsUsed: 4, contractYearsAvailable: 126 });
    expect(portfolio.future.map((year) => year.committed)).toEqual(["40.00", "30.00", "30.00"]);
    expect(portfolio.expirations[0]).toMatchObject({ year: 2026, players: 1, salary: "10.00" });
    expect(portfolio.positionSpend).toEqual(expect.arrayContaining([expect.objectContaining({ position: "RB", percent: 75 })]));
  });
  it("uses concise contract statuses", () => {
    expect(contractStatus(player({ contractYears: 1 }))).toBe("Expiring");
    expect(contractStatus(player({ contractYears: 2 }))).toBe("Multi-year");
  });
});
