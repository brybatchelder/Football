export type WeeklyTeamScore = {
  teamId: string;
  week: number;
  score: number;
  opponentId?: string;
  won?: boolean;
};

export function allPlayStandings(scores: WeeklyTeamScore[]) {
  const totals = new Map<
    string,
    { wins: number; losses: number; ties: number; games: number }
  >();
  const byWeek = new Map<number, WeeklyTeamScore[]>();
  scores.forEach((entry) =>
    byWeek.set(entry.week, [...(byWeek.get(entry.week) ?? []), entry]),
  );
  byWeek.forEach((week) =>
    week.forEach((team) => {
      const total = totals.get(team.teamId) ?? {
        wins: 0,
        losses: 0,
        ties: 0,
        games: 0,
      };
      week
        .filter((opponent) => opponent.teamId !== team.teamId)
        .forEach((opponent) => {
          if (team.score > opponent.score) total.wins += 1;
          else if (team.score < opponent.score) total.losses += 1;
          else total.ties += 1;
          total.games += 1;
        });
      totals.set(team.teamId, total);
    }),
  );
  return Object.fromEntries(
    [...totals].map(([id, total]) => [
      id,
      {
        ...total,
        winPct: total.games ? (total.wins + total.ties * 0.5) / total.games : 0,
      },
    ]),
  );
}

export function expectedWins(scores: WeeklyTeamScore[]) {
  const allPlay = allPlayStandings(scores);
  const weeks = new Map<string, Set<number>>();
  scores.forEach((entry) =>
    weeks.set(
      entry.teamId,
      new Set([...(weeks.get(entry.teamId) ?? []), entry.week]),
    ),
  );
  return Object.fromEntries(
    Object.entries(allPlay).map(([id, result]) => [
      id,
      result.winPct * (weeks.get(id)?.size ?? 0),
    ]),
  );
}

export function scheduleLuck(actualWins: number, expected: number) {
  return actualWins - expected;
}
