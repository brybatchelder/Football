export type CsvRow = Record<string, string>;

export type NflversePlayer = {
  gsisId: string;
  displayName: string;
  firstName: string;
  lastName: string;
  position: string | null;
  nflTeam: string | null;
  birthDate: string | null;
  college: string | null;
  rookieYear: number | null;
  draftYear: number | null;
  draftRound: number | null;
  draftPick: number | null;
  yearsExperience: number | null;
  nflStatus: string | null;
  isActive: boolean;
};

export type ExistingOwnedPlayer = {
  playerId: string;
  gsisId: string | null;
  displayName: string;
  position: string | null;
  nflTeam: string | null;
  owned: boolean;
};

export type PlayerSyncIssue = {
  gsisId: string | null;
  displayName: string;
  code: "missing_stable_id" | "ambiguous_match" | "owned_player_unmatched";
  message: string;
  candidatePlayerIds: string[];
};

export type PlayerSyncAction = {
  kind: "create" | "update" | "link_existing";
  player: NflversePlayer;
  playerId?: string;
};

export type PlayerSyncPlan = {
  actions: PlayerSyncAction[];
  issues: PlayerSyncIssue[];
  playersSeen: number;
  playersCreated: number;
  playersUpdated: number;
  matchedAutomatically: number;
  unmatchedCount: number;
  reviewCount: number;
};

function cell(row: CsvRow, ...keys: string[]) {
  for (const key of keys) {
    const value = row[key]?.trim();
    if (value && value.toLowerCase() !== "na") return value;
  }
  return "";
}

function numberCell(row: CsvRow, ...keys: string[]) {
  const value = cell(row, ...keys);
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseCsv(input: string): CsvRow[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    if (character === '"') {
      if (quoted && input[index + 1] === '"') {
        value += '"';
        index += 1;
      } else quoted = !quoted;
    } else if (character === "," && !quoted) {
      row.push(value);
      value = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && input[index + 1] === "\n") index += 1;
      row.push(value);
      if (row.some(Boolean)) rows.push(row);
      row = [];
      value = "";
    } else value += character;
  }
  if (value || row.length) {
    row.push(value);
    rows.push(row);
  }
  const [headers, ...data] = rows;
  if (!headers) return [];
  return data.map((values) => Object.fromEntries(headers.map((header, index) => [header.replace(/^\uFEFF/, "").trim(), values[index] ?? ""])));
}

function splitName(displayName: string) {
  const pieces = displayName.trim().split(/\s+/);
  return { firstName: pieces[0] ?? "Unknown", lastName: pieces.slice(1).join(" ") || "Unknown" };
}

export function normalizeNflverseData(playerRows: CsvRow[], rosterRows: CsvRow[]): NflversePlayer[] {
  const rosters = new Map<string, CsvRow>();
  for (const row of rosterRows) {
    const id = cell(row, "gsis_id", "player_id");
    if (id) rosters.set(id, row);
  }
  return playerRows.map((row) => {
    const gsisId = cell(row, "gsis_id", "player_id");
    const roster = rosters.get(gsisId) ?? {};
    const displayName = cell(row, "display_name", "full_name", "football_name", "short_name") || cell(roster, "full_name", "player_name");
    const fallback = splitName(displayName);
    const nflStatus = cell(roster, "status", "roster_status") || cell(row, "status");
    return {
      gsisId,
      displayName: displayName || `${cell(row, "first_name") || "Unknown"} ${cell(row, "last_name") || "Unknown"}`,
      firstName: cell(row, "first_name", "common_first_name") || fallback.firstName,
      lastName: cell(row, "last_name") || fallback.lastName,
      position: cell(roster, "position", "position_group") || cell(row, "position", "position_group") || null,
      nflTeam: cell(roster, "team", "recent_team", "club_code") || null,
      birthDate: cell(row, "birth_date") || null,
      college: cell(row, "college_name", "college") || null,
      rookieYear: numberCell(row, "rookie_season", "rookie_year", "entry_year"),
      draftYear: numberCell(row, "draft_year"),
      draftRound: numberCell(row, "draft_round"),
      draftPick: numberCell(row, "draft_pick", "draft_number"),
      yearsExperience: numberCell(roster, "years_exp", "years_experience") ?? numberCell(row, "years_of_experience", "years_exp"),
      nflStatus: nflStatus || (rosters.has(gsisId) ? "active" : null),
      isActive: rosters.has(gsisId),
    };
  });
}

function matchKey(name: string, position: string | null, team: string | null) {
  return [name, position ?? "", team ?? ""].map((part) => part.toLowerCase().replace(/[^a-z0-9]/g, "")).join("|");
}

export function planPlayerSync(incoming: NflversePlayer[], owned: ExistingOwnedPlayer[]): PlayerSyncPlan {
  const issues: PlayerSyncIssue[] = [];
  const actions: PlayerSyncAction[] = [];
  const stable = new Map(owned.filter((player) => player.gsisId).map((player) => [player.gsisId!, player]));
  const exact = new Map<string, ExistingOwnedPlayer[]>();
  for (const player of owned.filter((item) => !item.gsisId)) {
    const key = matchKey(player.displayName, player.position, player.nflTeam);
    exact.set(key, [...(exact.get(key) ?? []), player]);
  }
  const matchedOwned = new Set<string>();
  for (const player of incoming) {
    if (!player.gsisId) {
      issues.push({ gsisId: null, displayName: player.displayName, code: "missing_stable_id", message: "nflverse row has no GSIS ID; it was not imported.", candidatePlayerIds: [] });
      continue;
    }
    const byId = stable.get(player.gsisId);
    if (byId) {
      matchedOwned.add(byId.playerId);
      actions.push({ kind: "update", player, playerId: byId.playerId });
      continue;
    }
    const candidates = exact.get(matchKey(player.displayName, player.position, player.nflTeam)) ?? [];
    if (candidates.length === 1) {
      matchedOwned.add(candidates[0].playerId);
      actions.push({ kind: "link_existing", player, playerId: candidates[0].playerId });
    } else if (candidates.length > 1) {
      issues.push({ gsisId: player.gsisId, displayName: player.displayName, code: "ambiguous_match", message: "Multiple owned FOFL players match name, position, and NFL team; manual review is required.", candidatePlayerIds: candidates.map((candidate) => candidate.playerId) });
    } else actions.push({ kind: "create", player });
  }
  for (const player of owned.filter((item) => item.owned)) {
    if (!matchedOwned.has(player.playerId)) issues.push({ gsisId: player.gsisId, displayName: player.displayName, code: "owned_player_unmatched", message: "Existing FOFL-owned player was not safely matched to nflverse.", candidatePlayerIds: [player.playerId] });
  }
  return {
    actions,
    issues,
    playersSeen: incoming.length,
    playersCreated: actions.filter((action) => action.kind === "create").length,
    playersUpdated: actions.filter((action) => action.kind === "update").length,
    matchedAutomatically: actions.filter((action) => action.kind === "link_existing").length,
    unmatchedCount: issues.filter((issue) => issue.code === "owned_player_unmatched").length,
    reviewCount: issues.filter((issue) => issue.code !== "owned_player_unmatched").length,
  };
}
