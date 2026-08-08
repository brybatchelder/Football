import type { Position } from "./types";

type FormationStarter = { position: Position; slot: string };
export type Formation = { name: string; personnel: string; incomplete: boolean };

const offenseNames: Record<string, string> = {
  "RB,RB": "Ground & Pound",
  "RB,WR": "Balanced",
  "RB,TE": "Power-I",
  "WR,WR": "Air Raid",
  "TE,WR": "West Coast",
  "TE,TE": "Jumbo Package",
};
const defenseNames: Record<string, string> = {
  "DL,DL": "The Trenches",
  "DL,LB": "Heavy Front",
  "DB,DL": "Big Nickel",
  "LB,LB": "The Wolfpack",
  "DB,LB": "Swiss Army",
  "DB,DB": "No-Fly Zone",
};

export function lineupFormation(starters: FormationStarter[]) {
  const offenseFlexes = starters.filter((starter) => starter.slot === "OFLEX").map((starter) => starter.position);
  const defenseFlexes = starters.filter((starter) => starter.slot === "DFLEX").map((starter) => starter.position);
  return {
    offense: formation(offenseFlexes, starters, ["RB", "WR", "TE"], offenseNames, ["RB", "WR", "TE"]),
    defense: formation(defenseFlexes, starters, ["DL", "LB", "DB"], defenseNames, ["DL", "LB", "DB"]),
  };
}

/** The positions elevated by flex use; useful now in UI and later in GM profiles. */
export function favoritePositions(starters: FormationStarter[]) {
  return {
    offense: favorite(starters, ["RB", "WR", "TE"]),
    defense: favorite(starters, ["DL", "LB", "DB"]),
  };
}

function formation(
  flexes: Position[],
  starters: FormationStarter[],
  eligible: Position[],
  names: Record<string, string>,
  displayOrder: Position[],
): Formation {
  const counts = Object.fromEntries(displayOrder.map((position) => [position, starters.filter((starter) => starter.position === position).length])) as Record<Position, number>;
  const personnel = displayOrder.map((position) => `${counts[position]}${position}`).join(" · ");
  const key = [...flexes].sort().join(",");
  const validFlexes = flexes.length === 2 && flexes.every((position) => eligible.includes(position));
  return { name: validFlexes ? names[key] : "Lineup in progress", personnel, incomplete: !validFlexes };
}

function favorite(starters: FormationStarter[], positions: Position[]) {
  const counts = positions.map((position) => ({ position, count: starters.filter((starter) => starter.position === position).length }));
  const high = Math.max(...counts.map((item) => item.count));
  return counts.filter((item) => item.count === high && high > 0).map((item) => item.position);
}
