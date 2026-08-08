import { describe, expect, it } from "vitest";
import {
  buildLineupSlots,
  defaultStarterCounts,
  normalizeStarterCounts,
  movePlayerToBench,
  movePlayerToLineupSlot,
  totalStarters,
} from "@/domain/lineup-config";

describe("lineup configuration", () => {
  it("builds the league's 17 default starters", () => {
    const slots = buildLineupSlots(defaultStarterCounts);

    expect(totalStarters(defaultStarterCounts)).toBe(17);
    expect(slots.filter((slot) => slot.label === "FLEX")).toHaveLength(2);
    expect(slots.filter((slot) => slot.label === "DFLEX")).toHaveLength(2);
  });

  it("keeps quarterbacks out of offensive flex and all offense out of defensive flex", () => {
    const slots = buildLineupSlots(defaultStarterCounts);

    expect(slots.find((slot) => slot.label === "FLEX")?.eligible).toEqual([
      "RB",
      "WR",
      "TE",
    ]);
    expect(slots.find((slot) => slot.label === "DFLEX")?.eligible).toEqual([
      "DL",
      "LB",
      "DB",
    ]);
  });

  it("falls back invalid values while accepting adjustable counts", () => {
    const counts = normalizeStarterCounts({ QB: 2, RB: -1, WR: 4 });

    expect(counts.QB).toBe(2);
    expect(counts.RB).toBe(2);
    expect(counts.WR).toBe(4);
  });

  it("moves and swaps eligible players without duplicating them", () => {
    const slots = buildLineupSlots(defaultStarterCounts);
    const players = [
      { id: "rb-a", position: "RB" as const },
      { id: "rb-b", position: "RB" as const },
      { id: "wr-a", position: "WR" as const },
    ];
    const initial = { "rb-1": "rb-a", "rb-2": "rb-b", "wr-1": "wr-a" };

    const swapped = movePlayerToLineupSlot(
      initial,
      slots,
      players,
      "rb-a",
      "rb-2",
    );
    expect(swapped).toMatchObject({ "rb-1": "rb-b", "rb-2": "rb-a" });

    const unchanged = movePlayerToLineupSlot(
      swapped,
      slots,
      players,
      "wr-a",
      "rb-1",
    );
    expect(unchanged).toBe(swapped);

    expect(movePlayerToBench(swapped, "rb-a")["rb-2"]).toBe("");
  });
});
