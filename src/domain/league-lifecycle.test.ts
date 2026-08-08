import { describe, expect, it } from "vitest";
import { leagueLifecycle, lifecycleStages, nextLifecycleStage } from "./league-lifecycle";

describe("league lifecycle", () => {
  it("keeps every stage in one deterministic order", () => {
    expect(lifecycleStages()).toHaveLength(11);
    expect(lifecycleStages()[0].id).toBe("rfa-tags");
    expect(lifecycleStages().at(-1)?.id).toBe("celebration-offseason");
  });

  it("transitions final preseason compliance into the regular season", () => {
    expect(nextLifecycleStage("final-compliance")?.id).toBe("regular-season");
    expect(leagueLifecycle.map((phase) => phase.id)).toEqual(["preseason", "regular-season", "postseason", "celebration"]);
  });
});
