import Decimal from "decimal.js";
import type { Position, RosterPlayer } from "./types";

export type ContractPortfolio = {
  cap: string;
  committed: string;
  available: string;
  contractYearsUsed: number;
  contractYearsAvailable: number;
  playersUnderContract: number;
  future: Array<{ year: number; committed: string; available: string; players: number }>;
  expirations: Array<{ year: number; players: number; salary: string }>;
  positionSpend: Array<{ position: Position; salary: string; percent: number }>;
};

export function contractStatus(player: RosterPlayer) {
  if (player.tag?.toLowerCase().includes("franchise")) return "Franchise";
  if (player.tag?.toLowerCase().includes("transition")) return "Transition";
  if (player.contractYears <= 1) return "Expiring";
  return "Multi-year";
}

export function contractPortfolio(
  players: RosterPlayer[],
  { cap = "1000", contractYearLimit = 130, season = 2026 }: { cap?: string; contractYearLimit?: number; season?: number } = {},
): ContractPortfolio {
  const capValue = new Decimal(cap);
  const committed = players.reduce((total, player) => total.plus(player.salary), new Decimal(0));
  const contractYearsUsed = players.filter((player) => player.status === "active")
    .reduce((total, player) => total + player.contractYears, 0);
  const future = [0, 1, 2].map((offset) => {
    const activeContracts = offset === 0
      ? players
      : players.filter((player) => player.contractYears > offset);
    const amount = activeContracts.reduce((total, player) => total.plus(player.salary), new Decimal(0));
    return {
      year: season + offset,
      committed: amount.toFixed(2),
      available: capValue.minus(amount).toFixed(2),
      players: activeContracts.length,
    };
  });
  const expirations = [1, 2, 3].map((years) => {
    const expiring = players.filter((player) => player.contractYears === years);
    return {
      year: season + years - 1,
      players: expiring.length,
      salary: expiring.reduce((total, player) => total.plus(player.salary), new Decimal(0)).toFixed(2),
    };
  }).filter((expiration) => expiration.players > 0);
  const positions: Position[] = ["QB", "RB", "WR", "TE", "PK", "DL", "LB", "DB"];
  const positionSpend = positions.map((position) => {
    const amount = players.filter((player) => player.position === position)
      .reduce((total, player) => total.plus(player.salary), new Decimal(0));
    return {
      position,
      salary: amount.toFixed(2),
      percent: committed.isZero() ? 0 : amount.dividedBy(committed).times(100).toDecimalPlaces(0).toNumber(),
    };
  }).filter((entry) => entry.salary !== "0.00");
  return {
    cap: capValue.toFixed(2),
    committed: committed.toFixed(2),
    available: capValue.minus(committed).toFixed(2),
    contractYearsUsed,
    contractYearsAvailable: contractYearLimit - contractYearsUsed,
    playersUnderContract: players.length,
    future,
    expirations,
    positionSpend,
  };
}
