import { describe, expect, it } from "vitest";
import {
  defaultRosterLimits,
  normalizeRosterLimits,
} from "@/domain/roster-config";

describe("roster configuration", () => {
  it("uses the league's regular-season, offseason, and taxi defaults", () => {
    expect(defaultRosterLimits.inSeasonActive).toBe(50);
    expect(defaultRosterLimits.offseasonActive).toBe(60);
    expect(defaultRosterLimits.taxi).toBe(10);
  });

  it("supports optional IR and per-position caps", () => {
    const limits = normalizeRosterLimits({
      inSeasonActive: 52,
      offseasonActive: 65,
      taxi: 12,
      injuredReserve: 8,
      positionLimits: { QB: 6 },
    });

    expect(limits.injuredReserve).toBe(8);
    expect(limits.positionLimits.QB).toBe(6);
    expect(limits.positionLimits.RB).toBeNull();
  });
});
