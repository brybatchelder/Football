import { describe, expect, it } from "vitest";
import { inferEvents } from "./redzone";

const rules = [
  { statKey: "receptions" as const, points: 1 },
  { statKey: "receiving_yards" as const, points: 0.1 },
  { statKey: "receiving_touchdowns" as const, points: 6 },
];
const initial = {
  playerId: "jj",
  gameId: "game",
  observedAt: new Date("2026-09-13T18:00:00Z"),
  source: "test",
  stats: { receptions: 6, receiving_yards: 82, receiving_touchdowns: 0 },
};

describe("inferEvents", () => {
  it("identifies a supported touchdown without inventing a play", () => {
    const events = inferEvents(
      initial,
      {
        ...initial,
        observedAt: new Date("2026-09-13T18:00:05Z"),
        stats: { receptions: 7, receiving_yards: 132, receiving_touchdowns: 1 },
      },
      rules,
    );
    expect(events[0]).toMatchObject({
      eventType: "receiving_touchdown",
      confidence: "high",
      fantasyPointDelta: 12,
    });
  });
  it("keeps ambiguous stat changes grouped", () => {
    const events = inferEvents(
      initial,
      {
        ...initial,
        stats: { receptions: 8, receiving_yards: 113, receiving_touchdowns: 0 },
      },
      rules,
    );
    expect(events[0]).toMatchObject({
      eventType: "stat_change",
      confidence: "grouped",
    });
  });
  it("handles corrections explicitly", () => {
    const events = inferEvents(
      initial,
      {
        ...initial,
        stats: { receptions: 5, receiving_yards: 82, receiving_touchdowns: 0 },
      },
      rules,
    );
    expect(events[0]).toMatchObject({
      eventType: "stat_correction",
      confidence: "correction",
      fantasyPointDelta: -1,
    });
  });
});
