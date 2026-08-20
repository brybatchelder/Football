import type { Position, RosterPlayer } from "./types";

export type RfaTagChoice = "franchise" | "transition" | "unprotected";
export type RfaTagConfirmation = "editing" | "tentative" | "final";
export type RfaCandidate = RosterPlayer & {
  previousSalary: number;
  rolloverSalary: 1;
  rolloverYears: 0;
};
export type FranchiseTagValue = {
  position: Position;
  salaries: number[];
  average: number;
  value: number;
};
export type FranchiseTagOutcome = {
  player: RfaCandidate;
  previousSalary: number;
  newSalary: number;
};
export type RfaMarketState =
  "awaiting_bid" | "live" | "awaiting_match" | "resolved";
export type RfaResultStatus = "matched" | "not_matched" | "no_bid";
export type RfaEventType =
  | "bidding_opened"
  | "first_bid"
  | "outbid"
  | "auction_hour_remaining"
  | "auction_won"
  | "match_required"
  | "match_six_hours"
  | "match_hour_remaining"
  | "matched"
  | "awarded"
  | "market_closing";

export const RFA_MARKET_RULES = {
  auctionHours: 24,
  matchHours: 24,
  minimumBid: 2,
  bidIncrement: 1,
  withdrawalsAllowed: false,
  matchDeadlineDefault: "decline" as const,
  timestampAuthority: "server" as const,
};

export const offensiveRfaPositions: Position[] = ["QB", "RB", "WR", "TE", "PK"];
export const defensiveRfaPositions: Position[] = ["DL", "LB", "DB"];

export function rfaRolloverCandidates(
  players: RosterPlayer[],
  franchiseId: string,
): RfaCandidate[] {
  return players
    .filter(
      (player) =>
        player.franchiseId === franchiseId &&
        player.status === "active" &&
        player.contractYears === 0,
    )
    .map((player) => ({
      ...player,
      previousSalary: Number(player.salary),
      rolloverSalary: 1,
      rolloverYears: 0,
    }));
}

export function franchiseTagValues(
  players: RosterPlayer[],
): FranchiseTagValue[] {
  return [...offensiveRfaPositions, ...defensiveRfaPositions].map(
    (position) => {
      const salaries = players
        .filter((player) => player.position === position)
        .map((player) => Number(player.salary))
        .sort((a, b) => b - a)
        .slice(0, 3);
      const average = salaries.length
        ? salaries.reduce((total, salary) => total + salary, 0) /
          salaries.length
        : 0;
      return {
        position,
        salaries,
        average: Number(average.toFixed(2)),
        value: Math.ceil(average),
      };
    },
  );
}

export function validateTagAssignments(
  candidates: RfaCandidate[],
  assignments: Record<string, RfaTagChoice>,
) {
  const franchisePlayers = candidates.filter(
    (player) => assignments[player.id] === "franchise",
  );
  const offense = franchisePlayers.filter((player) =>
    offensiveRfaPositions.includes(player.position),
  ).length;
  const defense = franchisePlayers.filter((player) =>
    defensiveRfaPositions.includes(player.position),
  ).length;
  const transition = candidates.filter(
    (player) => assignments[player.id] === "transition",
  ).length;
  return {
    valid: offense <= 1 && defense <= 1 && transition <= 3,
    offense,
    defense,
    transition,
    undecided: candidates.filter((player) => !assignments[player.id]).length,
  };
}

export function finalizeTagAssignments(
  candidates: RfaCandidate[],
  assignments: Record<string, RfaTagChoice>,
) {
  return Object.fromEntries(
    candidates.map((player) => [
      player.id,
      assignments[player.id] ?? "unprotected",
    ]),
  ) as Record<string, RfaTagChoice>;
}

export function franchiseTagOutcomes(
  candidates: RfaCandidate[],
  assignments: Record<string, RfaTagChoice>,
  values: FranchiseTagValue[],
): FranchiseTagOutcome[] {
  return candidates
    .filter((player) => assignments[player.id] === "franchise")
    .map((player) => ({
      player,
      previousSalary: player.previousSalary,
      newSalary:
        values.find((value) => value.position === player.position)?.value ?? 1,
    }));
}

export function resolveTagDeadline(
  candidates: RfaCandidate[],
  assignments: Record<string, RfaTagChoice>,
  confirmation: RfaTagConfirmation,
) {
  return confirmation === "tentative" || confirmation === "final"
    ? finalizeTagAssignments(candidates, assignments)
    : Object.fromEntries(
        candidates.map((player) => [player.id, "unprotected" as const]),
      );
}

export function validateRfaBid(input: {
  bidderId: string;
  originalOwnerId: string;
  previousBidderId?: string;
  amount: number;
  highBid: number;
  committedCap: number;
  cap: number;
  rosterCount: number;
}) {
  const minimum = Math.max(
    RFA_MARKET_RULES.minimumBid,
    input.highBid + RFA_MARKET_RULES.bidIncrement,
  );
  if (input.bidderId === input.originalOwnerId)
    return {
      valid: false,
      reason: "Original owners cannot bid on their own Transition player.",
    };
  if (input.previousBidderId === input.bidderId)
    return {
      valid: false,
      reason:
        "You placed the most recent valid bid. Another franchise must bid before you may bid again.",
    };
  if (!Number.isInteger(input.amount) || input.amount < minimum)
    return { valid: false, reason: `Minimum valid bid is $${minimum}.` };
  if (input.committedCap + input.amount > input.cap)
    return {
      valid: false,
      reason:
        "This bid would exceed the salary cap after committed RFA exposure.",
    };
  if (input.rosterCount + 1 > 60)
    return {
      valid: false,
      reason: "This bid would exceed the 60-player offseason roster limit.",
    };
  return {
    valid: true,
    reason: "Bid is legal and will start or reset the 24-hour auction timer.",
  };
}

export function rfaAuctionRelationship(input: {
  currentUserId: string;
  originalOwnerId: string;
  highBidderId?: string;
  userLastBid?: number;
  watching?: boolean;
}) {
  if (input.currentUserId === input.originalOwnerId) return "your_rfa" as const;
  if (input.currentUserId === input.highBidderId) return "winning" as const;
  if (input.userLastBid) return "outbid" as const;
  if (input.watching) return "watching" as const;
  return "can_bid" as const;
}

export function rfaResultLabel(status: RfaResultStatus) {
  return status === "matched"
    ? "MATCHED"
    : status === "not_matched"
      ? "NOT MATCHED"
      : "RETAINED — NO BID";
}
