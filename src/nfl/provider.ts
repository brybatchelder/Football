import type { NormalizedPlayerSnapshot } from "@/domain/fantasy-stats";

export type NflGame = { id: string; status: "scheduled" | "in_progress" | "final"; kickoffAt: Date };
export type NflDataProvider = {
  readonly name: string;
  activeGames(at: Date): Promise<NflGame[]>;
  playerStatSnapshots(gameIds: string[], observedAt: Date): Promise<NormalizedPlayerSnapshot[]>;
};

/**
 * Transport boundary for BALLDONTLIE. Payload decoding stays injected because
 * providers evolve their field names; neither the scoring engine nor UI sees it.
 */
export class BalldontlieNflProvider implements NflDataProvider {
  readonly name = "balldontlie-nfl";
  constructor(
    private readonly apiKey: string,
    private readonly baseUrl: string,
    private readonly decodeGames: (payload: unknown) => NflGame[],
    private readonly decodeSnapshots: (payload: unknown, observedAt: Date) => NormalizedPlayerSnapshot[],
  ) {}

  async activeGames(at: Date) {
    const payload = await this.get(`/games?dates[]=${at.toISOString().slice(0, 10)}`);
    return this.decodeGames(payload);
  }
  async playerStatSnapshots(gameIds: string[], observedAt: Date) {
    if (!gameIds.length) return [];
    const query = gameIds.map((id) => `game_ids[]=${encodeURIComponent(id)}`).join("&");
    return this.decodeSnapshots(await this.get(`/stats?${query}`), observedAt);
  }
  private async get(path: string) {
    const response = await fetch(`${this.baseUrl.replace(/\/$/, "")}${path}`, {
      headers: { Authorization: this.apiKey },
      next: { revalidate: 0 },
    });
    if (!response.ok) throw new Error(`BALLDONTLIE request failed (${response.status})`);
    return response.json() as Promise<unknown>;
  }
}
