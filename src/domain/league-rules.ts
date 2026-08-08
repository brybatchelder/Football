import Decimal from "decimal.js";
import type { AppRole, MoneyPolicy, RosterPlayer } from "./types";

export function rosterSummary(players: RosterPlayer[], policy: MoneyPolicy) {
  const counts = { active: 0, injured_reserve: 0, taxi: 0 };
  let salary = new Decimal(0),
    effective = new Decimal(0),
    contractYears = 0;
  for (const player of players) {
    counts[player.status]++;
    const amount = new Decimal(player.salary);
    salary = salary.plus(amount);
    const rate =
      player.status === "injured_reserve"
        ? policy.irPercent
        : player.status === "taxi"
          ? policy.taxiPercent
          : "100";
    effective = effective.plus(amount.times(rate).dividedBy(100));
    if (player.status === "active") contractYears += player.contractYears;
  }
  effective = effective.plus(policy.adjustment ?? 0).plus(policy.deadCap ?? 0);
  const cap = new Decimal(policy.cap);
  return {
    counts,
    salary: salary.toFixed(2),
    effective: effective.toFixed(2),
    available: cap.minus(effective).toFixed(2),
    contractYears,
  };
}

const rank: Record<AppRole, number> = {
  visitor: 0,
  owner: 1,
  assistant_commissioner: 2,
  commissioner: 3,
  system_administrator: 4,
};
export function hasPermission(
  role: AppRole,
  permission: "view" | "manage_roster" | "manage_league" | "manage_platform",
) {
  const required = {
    view: 0,
    manage_roster: 1,
    manage_league: 2,
    manage_platform: 4,
  }[permission];
  return rank[role] >= required;
}
export function victoryPoints(scores: string[], franchiseIndex: number) {
  const values = scores.map((score) => new Decimal(score));
  const mine = values[franchiseIndex];
  if (!mine) throw new Error("Unknown franchise score");
  let below = 0,
    tied = 0;
  values.forEach((value, index) => {
    if (index !== franchiseIndex) {
      if (mine.greaterThan(value)) below++;
      else if (mine.equals(value)) tied++;
    }
  });
  return new Decimal(below).plus(new Decimal(tied).times(0.5)).toFixed(2);
}
export function scoreStat(quantity: string, pointsPerUnit: string) {
  return new Decimal(quantity)
    .times(pointsPerUnit)
    .toDecimalPlaces(2)
    .toFixed(2);
}
