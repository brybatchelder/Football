import { describe, expect, it } from "vitest";
import { irEligibility, taxiEligibility } from "./roster-moves";
describe("roster moves", () => {
  it("permanently blocks a previously activated Taxi player", () => expect(taxiEligibility({ nflExperience: 1, contractYears: 0, eligibilityBurned: true, taxiSlotsOpen: 1 }).allowed).toBe(false));
  it("requires an IR designation", () => expect(irEligibility({ nflDesignation: "OUT", irSlotsOpen: 1 }).allowed).toBe(false));
});
