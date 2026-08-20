import type { NormalizedStats, ScoringRule, StatKey } from "./fantasy-stats";

export type ScoreBreakdownItem = {
  statKey: StatKey;
  quantity: number;
  points: number;
};
export type ScoredStats = { points: number; breakdown: ScoreBreakdownItem[] };

/** Scores normalized data only; no provider payload is allowed beyond this boundary. */
export function scoreStats(
  stats: NormalizedStats,
  rules: ScoringRule[],
): ScoredStats {
  const breakdown = rules.flatMap((rule) => {
    const quantity = stats[rule.statKey] ?? 0;
    if (!quantity) return [];
    const units = rule.threshold ? quantity / rule.threshold : quantity;
    const points = round(units * rule.points);
    return points ? [{ statKey: rule.statKey, quantity, points }] : [];
  });
  return {
    points: round(breakdown.reduce((total, item) => total + item.points, 0)),
    breakdown,
  };
}

export function scoreDelta(
  previous: NormalizedStats,
  current: NormalizedStats,
  rules: ScoringRule[],
) {
  return scoreStats(
    Object.fromEntries(
      Object.entries(current).map(([key, value]) => [
        key,
        value - (previous[key as StatKey] ?? 0),
      ]),
    ) as NormalizedStats,
    rules,
  );
}

function round(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
