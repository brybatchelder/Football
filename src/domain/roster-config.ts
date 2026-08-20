import type { Position } from "@/domain/types";

export const ROSTER_SETTINGS_STORAGE_KEY = "football.roster-limits.v1";

export const rosterPositions: Position[] = [
  "QB",
  "RB",
  "WR",
  "TE",
  "PK",
  "DL",
  "LB",
  "DB",
];

export type RosterLimits = {
  inSeasonActive: number;
  offseasonActive: number;
  taxi: number;
  injuredReserve: number | null;
  positionLimits: Record<Position, number | null>;
};

export const defaultRosterLimits: RosterLimits = {
  inSeasonActive: 50,
  offseasonActive: 60,
  taxi: 10,
  injuredReserve: null,
  positionLimits: {
    QB: null,
    RB: null,
    WR: null,
    TE: null,
    PK: null,
    DL: null,
    LB: null,
    DB: null,
  },
};

function normalizeRequiredLimit(value: unknown, fallback: number) {
  const count = Number(value);
  return Number.isInteger(count) && count >= 0 && count <= 200
    ? count
    : fallback;
}

function normalizeOptionalLimit(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const count = Number(value);
  return Number.isInteger(count) && count >= 0 && count <= 200 ? count : null;
}

export function normalizeRosterLimits(value: unknown): RosterLimits {
  const input =
    value && typeof value === "object"
      ? (value as Partial<RosterLimits>)
      : defaultRosterLimits;
  const positionLimits =
    input.positionLimits && typeof input.positionLimits === "object"
      ? input.positionLimits
      : defaultRosterLimits.positionLimits;

  return {
    inSeasonActive: normalizeRequiredLimit(
      input.inSeasonActive,
      defaultRosterLimits.inSeasonActive,
    ),
    offseasonActive: normalizeRequiredLimit(
      input.offseasonActive,
      defaultRosterLimits.offseasonActive,
    ),
    taxi: normalizeRequiredLimit(input.taxi, defaultRosterLimits.taxi),
    injuredReserve: normalizeOptionalLimit(input.injuredReserve),
    positionLimits: Object.fromEntries(
      rosterPositions.map((position) => [
        position,
        normalizeOptionalLimit(positionLimits[position]),
      ]),
    ) as Record<Position, number | null>,
  };
}
