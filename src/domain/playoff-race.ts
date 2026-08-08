export type PlayoffRaceTeam = {
  id: string;
  division: string;
  wins: number;
  losses: number;
  ties?: number;
  pointsFor: number;
};

export type PlayoffFormat = {
  playoffTeams: number;
  divisionWinners: number;
  byeTeams: number;
};

export const defaultPlayoffFormat: PlayoffFormat = {
  playoffTeams: 6,
  divisionWinners: 3,
  byeTeams: 2,
};

export type PlayoffStatus =
  | "division_leader"
  | "wild_card"
  | "first_out"
  | "in_the_hunt";

export type SeededTeam = PlayoffRaceTeam & {
  seed?: number;
  status: PlayoffStatus;
};

export function compareRaceTeams(left: PlayoffRaceTeam, right: PlayoffRaceTeam) {
  const leftRecord = left.wins * 2 + (left.ties ?? 0);
  const rightRecord = right.wins * 2 + (right.ties ?? 0);
  return rightRecord - leftRecord || right.pointsFor - left.pointsFor || left.id.localeCompare(right.id);
}

export function seedPlayoffField(
  teams: PlayoffRaceTeam[],
  format: PlayoffFormat = defaultPlayoffFormat,
) {
  const divisions = new Map<string, PlayoffRaceTeam[]>();
  teams.forEach((team) => divisions.set(team.division, [...(divisions.get(team.division) ?? []), team]));
  const leaders = [...divisions.values()]
    .map((group) => [...group].sort(compareRaceTeams)[0])
    .filter((team): team is PlayoffRaceTeam => Boolean(team))
    .sort(compareRaceTeams)
    .slice(0, format.divisionWinners);
  const leaderIds = new Set(leaders.map((team) => team.id));
  const wildCards = teams.filter((team) => !leaderIds.has(team.id)).sort(compareRaceTeams)
    .slice(0, Math.max(0, format.playoffTeams - leaders.length));
  const field = [...leaders, ...wildCards];
  const fieldIds = new Set(field.map((team) => team.id));
  const firstOut = teams.filter((team) => !fieldIds.has(team.id)).sort(compareRaceTeams)[0];
  return {
    field: field.map((team, index) => ({
      ...team,
      seed: index + 1,
      status: leaderIds.has(team.id) ? "division_leader" as const : "wild_card" as const,
    })),
    firstOut: firstOut ? { ...firstOut, status: "first_out" as const } : undefined,
    inTheHunt: teams.filter((team) => !fieldIds.has(team.id) && team.id !== firstOut?.id)
      .sort(compareRaceTeams).map((team) => ({ ...team, status: "in_the_hunt" as const })),
  };
}

export function projectedBracket(
  field: SeededTeam[],
  format: PlayoffFormat = defaultPlayoffFormat,
) {
  const byes = field.slice(0, format.byeTeams);
  const playable = field.slice(format.byeTeams);
  return {
    byes,
    matchups: Array.from({ length: Math.floor(playable.length / 2) }, (_, index) => ({
      higherSeed: playable[index],
      lowerSeed: playable[playable.length - index - 1],
    })),
  };
}

export type SimulatedSeason = {
  teams: PlayoffRaceTeam[];
  championId?: string;
};

export function simulatePlayoffOdds(
  initialTeams: PlayoffRaceTeam[],
  simulateSeason: (iteration: number) => SimulatedSeason,
  iterations = 1000,
  format: PlayoffFormat = defaultPlayoffFormat,
) {
  const totals = new Map(initialTeams.map((team) => [team.id, { playoff: 0, division: 0, bye: 0, championship: 0 }]));
  for (let iteration = 0; iteration < iterations; iteration += 1) {
    const season = simulateSeason(iteration);
    const result = seedPlayoffField(season.teams, format);
    result.field.forEach((team) => {
      const total = totals.get(team.id);
      if (!total) return;
      total.playoff += 1;
      if (team.status === "division_leader") total.division += 1;
      if ((team.seed ?? Infinity) <= format.byeTeams) total.bye += 1;
    });
    const championId = season.championId;
    if (championId) {
      const total = totals.get(championId);
      if (total) total.championship += 1;
    }
  }
  return Object.fromEntries([...totals].map(([id, total]) => [id, {
    playoff: total.playoff / iterations,
    division: total.division / iterations,
    bye: total.bye / iterations,
    championship: total.championship / iterations,
  }]));
}
