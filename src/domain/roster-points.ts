import type { RosterPlayer } from "./types";

export function rosterPointsSeason(season: number, currentWeek: number) {
  return currentWeek >= 1 ? season : season - 1;
}

export function rosterPointsValue(
  player: Pick<RosterPlayer, "priorPoints" | "currentPoints">,
  currentWeek: number,
) {
  return currentWeek >= 1
    ? (player.currentPoints ?? "0.00")
    : player.priorPoints;
}
