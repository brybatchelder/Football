import { describe, expect, it } from "vitest";
import { filterLeagueActivity, leagueActivity } from "./league-activity";

describe("league activity filters", () => {
  it("filters events by type and franchise", () => {
    expect(filterLeagueActivity(leagueActivity, { type: "trade", franchiseId: "canton-legends" })).toHaveLength(1);
    expect(filterLeagueActivity(leagueActivity, { type: "trade", franchiseId: "memphis-showboats" })).toHaveLength(0);
  });
});
