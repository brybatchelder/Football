export type LivePollingConfig = { noActiveGamesMs: number; inactiveAudienceMs: number; activeAudienceMs: number };
export const defaultLivePollingConfig: LivePollingConfig = { noActiveGamesMs: 0, inactiveAudienceMs: 30_000, activeAudienceMs: 5_000 };
export function pollInterval(config: LivePollingConfig, activeGames: number, activeViewers: number) {
  if (!activeGames) return config.noActiveGamesMs;
  return activeViewers ? config.activeAudienceMs : config.inactiveAudienceMs;
}
