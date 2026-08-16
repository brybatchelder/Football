import { describe, expect, it } from "vitest";
import { canDraftCurrentPick, nextOwnedPick, pickLabel, type DraftRoomPick } from "./draft-room";

const picks: DraftRoomPick[] = [
  { id: "5.11", round: 5, slot: 11, currentOwnerId: "detroit", originalOwnerId: "detroit", status: "ON_CLOCK" },
  { id: "5.12", round: 5, slot: 12, currentOwnerId: "canton", originalOwnerId: "seattle", status: "UPCOMING" },
];

describe("draft room rules", () => {
  it("uses current ownership for draft permission", () => {
    expect(canDraftCurrentPick("owner", "canton", "detroit")).toBe(false);
    expect(canDraftCurrentPick("owner", "canton", "canton")).toBe(true);
    expect(canDraftCurrentPick("commissioner", "canton", "detroit")).toBe(true);
  });

  it("finds the next currently owned pick and formats its label", () => {
    const next = nextOwnedPick(picks, 0, "canton");
    expect(next?.picksAway).toBe(1);
    expect(pickLabel(next!.pick)).toBe("5.12");
  });
});
