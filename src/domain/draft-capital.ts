export type DraftPickAsset = {
  id: string;
  season: number;
  round: number;
  originalFranchiseId: string;
  currentFranchiseId: string;
  acquiredFromFranchiseId?: string;
  acquiredAt?: string;
  lineage?: string[];
  slot?: number;
};

const rookieSalaryBySlot = {
  1: [60, 55, 50, 45, 40, 38, 36, 34, 32, 30, 27, 24],
  2: [22, 21, 20, 19, 18, 17, 16, 15, 14, 13, 12, 11],
} as const;

const rookieSalaryByRound: Record<number, number> = { 3: 10, 4: 6, 5: 3, 6: 1 };

export function rookiePickSalary(round: number, slot?: number) {
  const slotScale =
    rookieSalaryBySlot[round as keyof typeof rookieSalaryBySlot];
  if (slotScale) {
    if (slot && slot >= 1 && slot <= slotScale.length) {
      const value = slotScale[slot - 1];
      return { min: value, max: value };
    }
    return { min: slotScale.at(-1) ?? 0, max: slotScale[0] ?? 0 };
  }
  const value = rookieSalaryByRound[round] ?? 0;
  return { min: value, max: value };
}

export function rookieDraftSalaryRange(
  picks: DraftPickAsset[],
  franchiseId: string,
  season: number,
) {
  const owned = picks.filter(
    (pick) => pick.currentFranchiseId === franchiseId && pick.season === season,
  );
  return owned.reduce(
    (total, pick) => {
      const salary = rookiePickSalary(pick.round, pick.slot);
      return {
        min: total.min + salary.min,
        max: total.max + salary.max,
        picks: total.picks + 1,
      };
    },
    { min: 0, max: 0, picks: 0 },
  );
}

export function draftCapital(
  picks: DraftPickAsset[],
  franchiseId: string,
  rounds = 5,
) {
  const owned = picks
    .filter((pick) => pick.currentFranchiseId === franchiseId)
    .sort(
      (left, right) =>
        left.season - right.season ||
        left.round - right.round ||
        left.originalFranchiseId.localeCompare(right.originalFranchiseId),
    );
  const tradedAway = picks.filter(
    (pick) =>
      pick.originalFranchiseId === franchiseId &&
      pick.currentFranchiseId !== franchiseId,
  );
  const years = [...new Set(picks.map((pick) => pick.season))].sort();
  const distribution = years.map((season) => ({
    season,
    rounds: Array.from(
      { length: rounds },
      (_, index) =>
        owned.filter(
          (pick) => pick.season === season && pick.round === index + 1,
        ).length,
    ),
    total: owned.filter((pick) => pick.season === season).length,
  }));
  const surplus = Array.from({ length: rounds }, (_, index) => {
    const round = index + 1;
    const expected = years.length;
    const count = owned.filter((pick) => pick.round === round).length;
    return { round, count, delta: count - expected };
  });
  return { owned, tradedAway, distribution, surplus };
}
