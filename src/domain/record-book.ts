export type RecordCandidate = { entityId: string; value: number; season?: number; week?: number; scope?: "regular" | "playoffs" };
export type RecordDefinition = { key: string; name: string; direction: "max" | "min"; scope: "all" | "regular" | "playoffs"; minimumSample?: number };

export function recordLeaders(definition: RecordDefinition, candidates: RecordCandidate[], limit = 5) {
  const scoped = candidates.filter((candidate) => definition.scope === "all" || candidate.scope === definition.scope);
  const sorted = [...scoped].sort((left, right) => definition.direction === "max" ? right.value - left.value : left.value - right.value);
  let previousValue: number | undefined;
  let previousRank = 0;
  return sorted.slice(0, limit).map((candidate, index) => {
    const rank = candidate.value === previousValue ? previousRank : index + 1;
    previousValue = candidate.value;
    previousRank = rank;
    return { ...candidate, rank };
  });
}

export function recordLineage(definition: RecordDefinition, candidates: RecordCandidate[]) {
  const ordered = [...candidates].sort((left, right) => (left.season ?? 0) - (right.season ?? 0) || (left.week ?? 0) - (right.week ?? 0));
  let best: number | undefined;
  return ordered.filter((candidate) => {
    const breaksRecord = best === undefined || (definition.direction === "max" ? candidate.value > best : candidate.value < best);
    if (breaksRecord) best = candidate.value;
    return breaksRecord;
  });
}
