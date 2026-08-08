/** Provider-neutral cumulative NFL statistics used by the FOFL scoring engine. */
export type StatKey =
  | "passing_yards"
  | "passing_touchdowns"
  | "interceptions_thrown"
  | "passing_two_point_conversions"
  | "rushing_yards"
  | "rushing_touchdowns"
  | "rushing_two_point_conversions"
  | "receptions"
  | "receiving_yards"
  | "receiving_touchdowns"
  | "receiving_two_point_conversions"
  | "fumbles_lost"
  | "field_goals_made"
  | "extra_points_made"
  | "sacks"
  | "defensive_interceptions"
  | "forced_fumbles"
  | "fumble_recoveries"
  | "defensive_touchdowns"
  | "safeties";

export type NormalizedStats = Partial<Record<StatKey, number>>;

export type NormalizedPlayerSnapshot = {
  playerId: string;
  gameId: string;
  observedAt: Date;
  stats: NormalizedStats;
  source: string;
  sourceVersion?: string;
};

export type ScoringRule = {
  statKey: StatKey;
  points: number;
  /** Score one unit per threshold, e.g. 0.1 per passing yard. */
  threshold?: number;
};

export const statKeys: readonly StatKey[] = [
  "passing_yards", "passing_touchdowns", "interceptions_thrown", "passing_two_point_conversions",
  "rushing_yards", "rushing_touchdowns", "rushing_two_point_conversions",
  "receptions", "receiving_yards", "receiving_touchdowns", "receiving_two_point_conversions",
  "fumbles_lost", "field_goals_made", "extra_points_made", "sacks", "defensive_interceptions",
  "forced_fumbles", "fumble_recoveries", "defensive_touchdowns", "safeties",
];

export function statDelta(previous: NormalizedStats, current: NormalizedStats): NormalizedStats {
  return statKeys.reduce<NormalizedStats>((delta, key) => {
    const value = (current[key] ?? 0) - (previous[key] ?? 0);
    if (value !== 0) delta[key] = value;
    return delta;
  }, {});
}
