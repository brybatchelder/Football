import { z } from "zod";

export interface LeagueProvider {
  preview(input: unknown): ImportPreview;
  import(input: unknown, options: { dryRun: boolean }): Promise<ImportPreview>;
}
export interface PlayerDataProvider {
  players(input: unknown): ProviderPlayer[];
}
export interface ScoringDataProvider {
  weeklyScores(season: number, week: number): Promise<unknown[]>;
}
export type ProviderPlayer = {
  externalId: string;
  name: string;
  franchiseExternalId?: string;
  salary?: string;
  contractYears?: number;
  status?: string;
};
export type ImportPreview = {
  imported: number;
  updated: number;
  skipped: number;
  errors: number;
  issues: { code: string; message: string; externalId?: string }[];
};
const fixtureSchema = z.object({
  league: z.object({
    id: z.string(),
    name: z.string(),
    season: z.coerce.number(),
  }),
  franchises: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      division: z.string().optional(),
    }),
  ),
  players: z.array(
    z.object({
      id: z.string(),
      name: z.string().min(1),
      franchiseId: z.string().optional(),
      salary: z.union([z.string(), z.number()]).optional(),
      contractYears: z.coerce.number().int().nonnegative().optional(),
      status: z.string().optional(),
    }),
  ),
});

export class MflFixtureAdapter implements LeagueProvider, PlayerDataProvider {
  private parse(input: unknown) {
    return fixtureSchema.parse(input);
  }
  players(input: unknown): ProviderPlayer[] {
    return this.parse(input).players.map((p) => ({
      externalId: p.id,
      name: p.name,
      franchiseExternalId: p.franchiseId,
      salary: p.salary?.toString(),
      contractYears: p.contractYears,
      status: p.status,
    }));
  }
  preview(input: unknown): ImportPreview {
    const parsed = this.parse(input);
    const franchiseIds = new Set(parsed.franchises.map((f) => f.id));
    const issues = parsed.players
      .filter((p) => p.franchiseId && !franchiseIds.has(p.franchiseId))
      .map((p) => ({
        code: "UNKNOWN_FRANCHISE",
        message: `${p.name} references missing franchise ${p.franchiseId}`,
        externalId: p.id,
      }));
    return {
      imported:
        parsed.franchises.length + parsed.players.length - issues.length,
      updated: 0,
      skipped: issues.length,
      errors: 0,
      issues,
    };
  }
  async import(input: unknown, options: { dryRun: boolean }) {
    void options;
    return this.preview(input);
  }
}
