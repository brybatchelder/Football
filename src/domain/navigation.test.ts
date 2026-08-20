import { describe, expect, it } from "vitest";
import { mostSpecificNavigationItem, routeMatches } from "./navigation";

const items = [
  ["League HQ", "/league"],
  ["Rosters", "/league/rosters"],
  ["Lifecycle", "/league/lifecycle"],
] as const;

describe("navigation route matching", () => {
  it("matches exact routes and their nested detail pages", () => {
    expect(routeMatches("/league/rosters", "/league/rosters")).toBe(true);
    expect(routeMatches("/league/rosters/history", "/league/rosters")).toBe(
      true,
    );
    expect(routeMatches("/league/power-rankings", "/league/rosters")).toBe(
      false,
    );
  });

  it("selects only the most specific item when parent routes also match", () => {
    expect(mostSpecificNavigationItem("/league/lifecycle", items)?.[0]).toBe(
      "Lifecycle",
    );
    expect(
      mostSpecificNavigationItem("/league/rosters/history", items)?.[0],
    ).toBe("Rosters");
    expect(mostSpecificNavigationItem("/league", items)?.[0]).toBe("League HQ");
  });
});
