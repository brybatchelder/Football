import { buildLineupSlots, defaultStarterCounts } from "./lineup-config";
import { lineupFormation } from "./lineup-formation";
import type { RosterPlayer } from "./types";

export type MatchupPhase = "upcoming" | "live" | "final";
export type MatchupStarter = { slot: string; player: RosterPlayer; projection: number; actual: number; status: "scheduled" | "live" | "final" | "out" };
export type MatchupTeam = { franchiseId: string; starters: MatchupStarter[]; projection: number; actual: number; remainingProjection: number; remainingPlayers: number; formation: ReturnType<typeof lineupFormation> };

const offense = new Set(["QB", "RB", "WR", "TE", "PK"]);

export function projectionFor(player: RosterPlayer) {
  return Number(Math.max(2.1, Number(player.priorPoints) / 17).toFixed(1));
}

export function buildMatchupTeam(franchiseId: string, players: RosterPlayer[], phase: MatchupPhase = "upcoming"): MatchupTeam {
  const available = players.filter((player) => player.franchiseId === franchiseId && player.status === "active").sort((a, b) => projectionFor(b) - projectionFor(a));
  const used = new Set<string>();
  const starters = buildLineupSlots(defaultStarterCounts).flatMap((slot) => {
    const player = available.find((candidate) => !used.has(candidate.id) && slot.eligible.includes(candidate.position));
    if (!player) return [];
    used.add(player.id);
    const projection = projectionFor(player);
    return [{ slot: slot.label, player, projection, actual: phase === "upcoming" ? 0 : projection, status: phase === "upcoming" ? "scheduled" : phase === "live" ? "live" : "final" } satisfies MatchupStarter];
  });
  const projection = Number(starters.reduce((total, starter) => total + starter.projection, 0).toFixed(1));
  const actual = Number(starters.reduce((total, starter) => total + starter.actual, 0).toFixed(1));
  const remaining = starters.filter((starter) => starter.status === "scheduled" || starter.status === "live");
  return { franchiseId, starters, projection, actual, remainingProjection: Number(remaining.reduce((total, starter) => total + starter.projection - starter.actual, 0).toFixed(1)), remainingPlayers: remaining.length, formation: lineupFormation(starters.map((starter) => ({ position: starter.player.position, slot: starter.slot }))) };
}

/** Versioned normal-distribution model based on remaining player projections and independent variance. */
export function matchupWinProbability(team: MatchupTeam, opponent: MatchupTeam) {
  if (team.starters.length === 0 || opponent.starters.length === 0) return 0.5;
  if (team.remainingPlayers === 0 && opponent.remainingPlayers === 0) return team.actual === opponent.actual ? 0.5 : team.actual > opponent.actual ? 1 : 0;
  const mean = team.actual + team.remainingProjection - opponent.actual - opponent.remainingProjection;
  const variance = [...team.starters, ...opponent.starters].filter((starter) => starter.status !== "final").reduce((total, starter) => total + Math.pow(Math.max(3, starter.projection * 0.55), 2), 0);
  return Number(normalCdf(mean / Math.sqrt(variance)).toFixed(3));
}

export function scoringSplit(team: MatchupTeam) {
  const split = team.starters.reduce((totals, starter) => {
    totals[offense.has(starter.player.position) ? "offense" : "defense"] += starter.actual;
    return totals;
  }, { offense: 0, defense: 0 });
  return { offense: Number(split.offense.toFixed(1)), defense: Number(split.defense.toFixed(1)) };
}

function normalCdf(value: number) {
  const t = 1 / (1 + 0.2316419 * Math.abs(value));
  const density = 0.3989423 * Math.exp((-value * value) / 2);
  const approximation = 1 - density * (((((1.330274 * t - 1.821256) * t + 1.781478) * t - 0.356564) * t + 0.3193815) * t);
  return value >= 0 ? approximation : 1 - approximation;
}
