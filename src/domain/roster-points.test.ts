import { describe, expect, it } from "vitest";
import { rosterPointsSeason, rosterPointsValue } from "./roster-points";

describe("league roster points display", () => {
  it("shows the prior season before Week 1 begins", () => {
    expect(rosterPointsSeason(2026, 0)).toBe(2025);
    expect(
      rosterPointsValue({ priorPoints: "295.96", currentPoints: "0.00" }, 0),
    ).toBe("295.96");
  });

  it("rolls the label and values forward when Week 1 begins every season", () => {
    expect(rosterPointsSeason(2026, 1)).toBe(2026);
    expect(rosterPointsSeason(2027, 1)).toBe(2027);
    expect(
      rosterPointsValue({ priorPoints: "295.96", currentPoints: "18.42" }, 1),
    ).toBe("18.42");
  });

  it("uses zero until a current-season scoring import arrives", () => {
    expect(rosterPointsValue({ priorPoints: "295.96" }, 1)).toBe("0.00");
  });
});
