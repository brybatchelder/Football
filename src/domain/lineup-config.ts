import type { LineupSlot } from "@/components/ui";
import type { Position, RosterPlayer } from "@/domain/types";

export const LINEUP_SETTINGS_STORAGE_KEY = "football.lineup-starter-counts.v1";

export const starterRuleKeys = [
  "QB",
  "RB",
  "WR",
  "TE",
  "PK",
  "OFFENSIVE_FLEX",
  "DL",
  "LB",
  "DB",
  "DEFENSIVE_FLEX",
] as const;

export type StarterRuleKey = (typeof starterRuleKeys)[number];
export type StarterCounts = Record<StarterRuleKey, number>;

export const defaultStarterCounts: StarterCounts = {
  QB: 1,
  RB: 2,
  WR: 2,
  TE: 1,
  PK: 1,
  OFFENSIVE_FLEX: 2,
  DL: 2,
  LB: 2,
  DB: 2,
  DEFENSIVE_FLEX: 2,
};

export const starterRuleDetails: Record<
  StarterRuleKey,
  {
    label: string;
    eligibilityLabel: string;
    eligible: Position[];
    side: "Offense" | "Defense";
  }
> = {
  QB: {
    label: "Quarterback",
    eligibilityLabel: "QB",
    eligible: ["QB"],
    side: "Offense",
  },
  RB: {
    label: "Running back",
    eligibilityLabel: "RB",
    eligible: ["RB"],
    side: "Offense",
  },
  WR: {
    label: "Wide receiver",
    eligibilityLabel: "WR",
    eligible: ["WR"],
    side: "Offense",
  },
  TE: {
    label: "Tight end",
    eligibilityLabel: "TE",
    eligible: ["TE"],
    side: "Offense",
  },
  PK: {
    label: "Placekicker",
    eligibilityLabel: "PK",
    eligible: ["PK"],
    side: "Offense",
  },
  OFFENSIVE_FLEX: {
    label: "Offensive flex",
    eligibilityLabel: "RB / WR / TE",
    eligible: ["RB", "WR", "TE"],
    side: "Offense",
  },
  DL: {
    label: "Defensive line",
    eligibilityLabel: "DT / DE",
    eligible: ["DL"],
    side: "Defense",
  },
  LB: {
    label: "Linebacker",
    eligibilityLabel: "LB",
    eligible: ["LB"],
    side: "Defense",
  },
  DB: {
    label: "Defensive back",
    eligibilityLabel: "CB / S",
    eligible: ["DB"],
    side: "Defense",
  },
  DEFENSIVE_FLEX: {
    label: "Defensive flex",
    eligibilityLabel: "DT / DE / LB / CB / S",
    eligible: ["DL", "LB", "DB"],
    side: "Defense",
  },
};

export type LineupSlotDefinition = {
  key: string;
  label: LineupSlot;
  eligible: Position[];
  side: "Offense" | "Defense";
};

const slotLabels: Record<StarterRuleKey, LineupSlot> = {
  QB: "QB",
  RB: "RB",
  WR: "WR",
  TE: "TE",
  PK: "PK",
  OFFENSIVE_FLEX: "OFLEX",
  DL: "DL",
  LB: "LB",
  DB: "DB",
  DEFENSIVE_FLEX: "DFLEX",
};

export function normalizeStarterCounts(value: unknown): StarterCounts {
  const input = value && typeof value === "object" ? value : {};
  return Object.fromEntries(
    starterRuleKeys.map((key) => {
      const count = Number((input as Partial<StarterCounts>)[key]);
      return [
        key,
        Number.isInteger(count) && count >= 0 && count <= 10
          ? count
          : defaultStarterCounts[key],
      ];
    }),
  ) as StarterCounts;
}

export function buildLineupSlots(
  counts: StarterCounts,
): LineupSlotDefinition[] {
  return starterRuleKeys.flatMap((key) => {
    const details = starterRuleDetails[key];
    return Array.from({ length: counts[key] }, (_, index) => ({
      key: `${key.toLowerCase()}-${index + 1}`,
      label: slotLabels[key],
      eligible: details.eligible,
      side: details.side,
    }));
  });
}

export function totalStarters(counts: StarterCounts) {
  return starterRuleKeys.reduce((total, key) => total + counts[key], 0);
}

export function movePlayerToLineupSlot(
  assignments: Record<string, string>,
  slots: LineupSlotDefinition[],
  players: Pick<RosterPlayer, "id" | "position">[],
  playerId: string,
  targetSlotKey: string,
) {
  const targetSlot = slots.find((slot) => slot.key === targetSlotKey);
  const player = players.find((candidate) => candidate.id === playerId);
  if (!targetSlot || !player || !targetSlot.eligible.includes(player.position)) {
    return assignments;
  }

  const sourceSlotKey = Object.entries(assignments).find(
    ([, assignedPlayerId]) => assignedPlayerId === playerId,
  )?.[0];
  const displacedPlayerId = assignments[targetSlotKey];
  const next = { ...assignments, [targetSlotKey]: playerId };

  if (sourceSlotKey && sourceSlotKey !== targetSlotKey) {
    const sourceSlot = slots.find((slot) => slot.key === sourceSlotKey);
    const displacedPlayer = players.find(
      (candidate) => candidate.id === displacedPlayerId,
    );
    next[sourceSlotKey] =
      sourceSlot &&
      displacedPlayer &&
      sourceSlot.eligible.includes(displacedPlayer.position)
        ? displacedPlayerId
        : "";
  }

  return next;
}

export function movePlayerToBench(
  assignments: Record<string, string>,
  playerId: string,
) {
  return Object.fromEntries(
    Object.entries(assignments).map(([slotKey, assignedPlayerId]) => [
      slotKey,
      assignedPlayerId === playerId ? "" : assignedPlayerId,
    ]),
  );
}
