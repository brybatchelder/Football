import { describe, expect, it } from "vitest";
import {
  highestRole,
  resolveEffectiveRole,
  selectActiveFranchise,
} from "./authorization";

describe("authorization context", () => {
  it("uses the strongest scoped role", () => {
    expect(highestRole(["owner", "assistant_commissioner", "visitor"])).toBe(
      "assistant_commissioner",
    );
    expect(highestRole(["owner", "system_administrator", "commissioner"])).toBe(
      "system_administrator",
    );
  });

  it("selects an allowed requested franchise before the primary franchise", () => {
    const franchises = [
      { slug: "canton", isPrimary: true },
      { slug: "memphis", isPrimary: false },
    ];
    expect(selectActiveFranchise(franchises, "memphis")?.slug).toBe("memphis");
    expect(selectActiveFranchise(franchises, "not-owned")?.slug).toBe("canton");
  });

  it("does not treat a legacy platform commissioner as league authority", () => {
    expect(
      resolveEffectiveRole({
        platformRole: "commissioner",
        leagueRole: null,
        hasFranchiseMembership: false,
      }),
    ).toBe("visitor");
  });

  it("keeps system administration separate while honoring scoped authority", () => {
    expect(
      resolveEffectiveRole({
        platformRole: "system_administrator",
        leagueRole: null,
        hasFranchiseMembership: false,
      }),
    ).toBe("system_administrator");
    expect(
      resolveEffectiveRole({
        platformRole: "visitor",
        leagueRole: "assistant_commissioner",
        hasFranchiseMembership: true,
      }),
    ).toBe("assistant_commissioner");
    expect(
      resolveEffectiveRole({
        platformRole: "visitor",
        leagueRole: "system_administrator",
        hasFranchiseMembership: false,
      }),
    ).toBe("visitor");
  });
});
