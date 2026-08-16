export type AppRole =
  | "visitor"
  | "owner"
  | "assistant_commissioner"
  | "commissioner"
  | "system_administrator";
export type RosterStatus = "active" | "injured_reserve" | "taxi";
export type Position = "QB" | "RB" | "WR" | "TE" | "PK" | "DL" | "LB" | "DB";
export type RosterPlayer = {
  id: string;
  franchiseId: string;
  franchise: string;
  name: string;
  team: string;
  position: Position;
  priorPoints: string;
  currentPoints?: string;
  bye: number;
  salary: string;
  contractYears: number;
  status: RosterStatus;
  tag?: string;
  isRostered?: boolean;
  nflStatus?: string | null;
  yearsExperience?: number | null;
};
export type MoneyPolicy = {
  cap: string;
  irPercent: string;
  taxiPercent: string;
  adjustment?: string;
  deadCap?: string;
};
