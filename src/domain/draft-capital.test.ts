import { describe, expect, it } from "vitest";
import { draftCapital, rookieDraftSalaryRange, rookiePickSalary, type DraftPickAsset } from "./draft-capital";

const picks: DraftPickAsset[] = [
  { id: "a", season: 2027, round: 1, originalFranchiseId: "can", currentFranchiseId: "can" },
  { id: "b", season: 2027, round: 1, originalFranchiseId: "sea", currentFranchiseId: "can" },
  { id: "c", season: 2027, round: 2, originalFranchiseId: "can", currentFranchiseId: "det" },
];

describe("draft capital", () => {
  it("keeps original identity while deriving owned and traded-away picks", () => {
    const capital = draftCapital(picks, "can");
    expect(capital.owned.map((pick) => pick.id)).toEqual(["a", "b"]);
    expect(capital.tradedAway.map((pick) => pick.id)).toEqual(["c"]);
    expect(capital.distribution[0]).toMatchObject({ total: 2, rounds: [2, 0, 0, 0, 0] });
  });
});

describe("rookie pick salaries", () => {
  it("uses the exact league salary for known slots", () => {
    expect(rookiePickSalary(1, 1)).toEqual({ min: 60, max: 60 });
    expect(rookiePickSalary(2, 12)).toEqual({ min: 11, max: 11 });
    expect(rookiePickSalary(4)).toEqual({ min: 6, max: 6 });
  });

  it("returns the legal salary range while first-round slots are unknown", () => {
    const picks: DraftPickAsset[] = [
      { id: "a", season: 2027, round: 1, originalFranchiseId: "can", currentFranchiseId: "can" },
      { id: "b", season: 2027, round: 1, originalFranchiseId: "sea", currentFranchiseId: "can" },
      { id: "c", season: 2027, round: 3, originalFranchiseId: "can", currentFranchiseId: "can" },
      { id: "d", season: 2027, round: 3, originalFranchiseId: "hou", currentFranchiseId: "can" },
      { id: "e", season: 2027, round: 4, originalFranchiseId: "can", currentFranchiseId: "can" },
      { id: "f", season: 2027, round: 5, originalFranchiseId: "can", currentFranchiseId: "can" },
    ];
    expect(rookieDraftSalaryRange(picks, "can", 2027)).toEqual({ min: 77, max: 149, picks: 6 });
  });
});
