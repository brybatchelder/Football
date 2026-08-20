import type { AppRole, Position } from "./types";

export type DraftStatus = "NOT_STARTED" | "LIVE" | "PAUSED" | "COMPLETE";
export type DraftPickStatus = "UPCOMING" | "ON_CLOCK" | "COMPLETED" | "SKIPPED";

export type DraftCandidate = {
  id: string;
  name: string;
  position: Position;
  nflTeam: string;
  age: number;
  rank: number;
  adp: number;
  projection: number;
  rookie: boolean;
};

export type DraftRoomPick = {
  id: string;
  round: number;
  slot: number;
  currentOwnerId: string;
  originalOwnerId: string;
  status: DraftPickStatus;
  playerId?: string;
  selectedAt?: number;
  commissionerNote?: string;
};

export function canDraftCurrentPick(
  role: AppRole,
  userFranchiseId: string,
  currentOwnerId: string,
) {
  if (
    role === "commissioner" ||
    role === "assistant_commissioner" ||
    role === "system_administrator"
  )
    return true;
  return role === "owner" && userFranchiseId === currentOwnerId;
}

export function pickLabel(pick: Pick<DraftRoomPick, "round" | "slot">) {
  return `${pick.round}.${String(pick.slot).padStart(2, "0")}`;
}

export function nextOwnedPick(
  picks: DraftRoomPick[],
  currentIndex: number,
  franchiseId: string,
) {
  const index = picks.findIndex(
    (pick, pickIndex) =>
      pickIndex >= currentIndex &&
      pick.currentOwnerId === franchiseId &&
      pick.status !== "COMPLETED" &&
      pick.status !== "SKIPPED",
  );
  return index < 0
    ? undefined
    : { pick: picks[index], picksAway: index - currentIndex };
}
