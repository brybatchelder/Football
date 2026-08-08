export type PowerRankingInput = { id: string; lineupStrength: number; depthStrength: number; offenseStrength: number; defenseStrength: number };
export type PowerRankingWeights = { lineup: number; depth: number };
export const powerRankingModelV1: PowerRankingWeights = { lineup: 0.7, depth: 0.3 };

function normalize(inputs: PowerRankingInput[], key: keyof PowerRankingInput) {
  const values = inputs.map((input) => Number(input[key]));
  const min = Math.min(...values); const max = Math.max(...values);
  return new Map(inputs.map((input) => [input.id, max === min ? 50 : ((Number(input[key]) - min) / (max - min)) * 100]));
}

export function powerRankings(inputs: PowerRankingInput[], weights = powerRankingModelV1) {
  const lineup = normalize(inputs, "lineupStrength");
  const depth = normalize(inputs, "depthStrength");
  const offense = normalize(inputs, "offenseStrength");
  const defense = normalize(inputs, "defenseStrength");
  const totalWeight = weights.lineup + weights.depth;
  return inputs.map((input) => {
    const score = ((lineup.get(input.id) ?? 0) * weights.lineup + (depth.get(input.id) ?? 0) * weights.depth) / totalWeight;
    return { ...input, score: Number(score.toFixed(1)), components: { lineup: Number((lineup.get(input.id) ?? 0).toFixed(1)), depth: Number((depth.get(input.id) ?? 0).toFixed(1)), offense: Number((offense.get(input.id) ?? 0).toFixed(1)), defense: Number((defense.get(input.id) ?? 0).toFixed(1)) } };
  }).sort((left, right) => right.score - left.score || left.id.localeCompare(right.id)).map((team, index) => ({ ...team, rank: index + 1 }));
}

export function powerTier(score: number) {
  if (score >= 80) return "Elite";
  if (score >= 60) return "Contenders";
  if (score >= 40) return "Playoff Hunt";
  return "Building";
}
