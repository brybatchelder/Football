import { scoreDelta } from "./scoring-engine";
import { statDelta, type NormalizedPlayerSnapshot, type NormalizedStats, type ScoringRule } from "./fantasy-stats";

export type EventConfidence = "high" | "medium" | "grouped" | "correction";
export type InferredEvent = {
  eventType: "receiving_touchdown" | "rushing_touchdown" | "passing_touchdown" | "stat_change" | "stat_correction";
  playerId: string;
  gameId: string;
  occurredAt: Date;
  stats: NormalizedStats;
  fantasyPointDelta: number;
  confidence: EventConfidence;
  summary: string;
};

/**
 * Converts two cumulative snapshots into conservative FOFL events. It never
 * invents a play: unprovable changes remain grouped; negative deltas are corrections.
 */
export function inferEvents(previous: NormalizedPlayerSnapshot, current: NormalizedPlayerSnapshot, rules: ScoringRule[]): InferredEvent[] {
  if (previous.playerId !== current.playerId || previous.gameId !== current.gameId) throw new Error("Snapshots must describe the same player and game");
  const delta = statDelta(previous.stats, current.stats);
  if (!Object.keys(delta).length) return [];
  const scored = scoreDelta(previous.stats, current.stats, rules);
  const hasCorrection = Object.values(delta).some((value) => value < 0);
  if (hasCorrection) return [event(current, "stat_correction", delta, scored.points, "correction", "Stat correction from upstream provider")];
  const touchdown = (key: keyof NormalizedStats, type: InferredEvent["eventType"]) => {
    if ((delta[key] ?? 0) !== 1) return undefined;
    return event(current, type, delta, scored.points, "high", labelFor(type, delta));
  };
  const touchdownEvents = [
    touchdown("receiving_touchdowns", "receiving_touchdown"),
    touchdown("rushing_touchdowns", "rushing_touchdown"),
    touchdown("passing_touchdowns", "passing_touchdown"),
  ].filter((value): value is InferredEvent => Boolean(value));
  return touchdownEvents.length
    ? touchdownEvents
    : [event(current, "stat_change", delta, scored.points, "grouped", groupedLabel(delta))];
}

function event(snapshot: NormalizedPlayerSnapshot, eventType: InferredEvent["eventType"], stats: NormalizedStats, fantasyPointDelta: number, confidence: EventConfidence, summary: string): InferredEvent {
  return { eventType, playerId: snapshot.playerId, gameId: snapshot.gameId, occurredAt: snapshot.observedAt, stats, fantasyPointDelta, confidence, summary };
}
function labelFor(type: InferredEvent["eventType"], delta: NormalizedStats) {
  const yards = type === "receiving_touchdown" ? delta.receiving_yards : type === "rushing_touchdown" ? delta.rushing_yards : delta.passing_yards;
  return `${yards ? `${yards}-yard ` : ""}${type.replace("_", " ")}`;
}
function groupedLabel(delta: NormalizedStats) {
  return Object.entries(delta).map(([key, value]) => `${value} ${key.replaceAll("_", " ")}`).join(", ") + " since last update";
}
