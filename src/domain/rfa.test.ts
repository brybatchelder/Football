import { describe, expect, it } from "vitest";
import { finalizeTagAssignments, franchiseTagOutcomes, franchiseTagValues, resolveTagDeadline, rfaAuctionRelationship, rfaResultLabel, rfaRolloverCandidates, validateRfaBid } from "./rfa";
import type { RosterPlayer } from "./types";

const player = (id: string, salary: string): RosterPlayer => ({ id, franchiseId: "f", franchise: "F", name: id, team: "NFL", position: "RB", priorPoints: "0", bye: 1, salary, contractYears: 1, status: "active" });

describe("RFA rules", () => {
  it("rounds the top-three positional salary average up", () => expect(franchiseTagValues([player("a", "62"), player("b", "49"), player("c", "38"), player("d", "5")]).find((item) => item.position === "RB")).toMatchObject({ average: 49.67, value: 50 }));
  it("applies the final positional tag salary to franchise players", () => {
    const candidates = rfaRolloverCandidates([{ ...player("a", "38"), contractYears: 0 }], "f");
    expect(franchiseTagOutcomes(candidates, { a: "franchise" }, [{ position: "RB", salaries: [62, 49, 38], average: 49.67, value: 50 }])).toMatchObject([{ previousSalary: 38, newSalary: 50 }]);
  });
  it("blocks original-owner and consecutive bids", () => {
    expect(validateRfaBid({ bidderId: "a", originalOwnerId: "a", amount: 1, highBid: 0, committedCap: 0, cap: 1000, rosterCount: 40 }).valid).toBe(false);
    expect(validateRfaBid({ bidderId: "b", originalOwnerId: "a", previousBidderId: "b", amount: 2, highBid: 1, committedCap: 0, cap: 1000, rosterCount: 40 }).valid).toBe(false);
  });
  it("requires a $2 opening bid and $1 raises after bidding starts", () => {
    expect(validateRfaBid({ bidderId: "b", originalOwnerId: "a", amount: 1, highBid: 0, committedCap: 0, cap: 1000, rosterCount: 40 })).toMatchObject({ valid: false, reason: "Minimum valid bid is $2." });
    expect(validateRfaBid({ bidderId: "b", originalOwnerId: "a", amount: 2, highBid: 0, committedCap: 0, cap: 1000, rosterCount: 40 }).valid).toBe(true);
    expect(validateRfaBid({ bidderId: "c", originalOwnerId: "a", previousBidderId: "b", amount: 3, highBid: 2, committedCap: 0, cap: 1000, rosterCount: 40 }).valid).toBe(true);
  });
  it("derives personalized auction relationships", () => {
    expect(rfaAuctionRelationship({ currentUserId: "can", originalOwnerId: "can" })).toBe("your_rfa");
    expect(rfaAuctionRelationship({ currentUserId: "can", originalOwnerId: "dal", highBidderId: "can" })).toBe("winning");
    expect(rfaAuctionRelationship({ currentUserId: "can", originalOwnerId: "dal", highBidderId: "mem", userLastBid: 14 })).toBe("outbid");
  });
  it("uses permanent historical result terminology", () => {
    expect(rfaResultLabel("matched")).toBe("MATCHED");
    expect(rfaResultLabel("not_matched")).toBe("NOT MATCHED");
    expect(rfaResultLabel("no_bid")).toBe("RETAINED — NO BID");
  });
  it("selects true active 0-year players instead of 1-year contracts", () => {
    const zero = { ...player("zero", "20"), contractYears: 0 };
    expect(rfaRolloverCandidates([zero, player("one", "20")], "f").map((item) => item.id)).toEqual(["zero"]);
  });
  it("locks unselected players as unprotected at final confirmation or a tentative deadline", () => {
    const candidates = rfaRolloverCandidates([{ ...player("a", "20"), contractYears: 0 }, { ...player("b", "10"), contractYears: 0 }], "f");
    expect(finalizeTagAssignments(candidates, { a: "transition" })).toEqual({ a: "transition", b: "unprotected" });
    expect(resolveTagDeadline(candidates, { a: "franchise" }, "tentative")).toEqual({ a: "franchise", b: "unprotected" });
  });
});
