import { and, desc, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  nflTeams,
  players,
  playerPositionEligibility,
  playerSeasons,
  playerSyncIssues,
  playerSyncRuns,
  providerPlayerIds,
  rosterEntries,
} from "@/db/schema";
import {
  normalizeNflverseData,
  parseCsv,
  planPlayerSync,
  type ExistingOwnedPlayer,
  type NflversePlayer,
} from "@/domain/nflverse-player-sync";

const PLAYERS_URL = "https://github.com/nflverse/nflverse-data/releases/download/players/players.csv";
const ROSTERS_URL = (season: number) => `https://github.com/nflverse/nflverse-data/releases/download/rosters/roster_${season}.csv`;

export type PlayerSyncResult = {
  runId: string;
  dryRun: boolean;
  sourceSeason: number;
  playersSeen: number;
  playersCreated: number;
  playersUpdated: number;
  rosterAttributesUpdated: number;
  matchedAutomatically: number;
  unmatchedCount: number;
  reviewCount: number;
  ownershipRecordsModified: 0;
};

export async function getPlayerSyncHistory() {
  return getDb().select({
    id: playerSyncRuns.id,
    status: playerSyncRuns.status,
    dryRun: playerSyncRuns.dryRun,
    sourceSeason: playerSyncRuns.sourceSeason,
    playersSeen: playerSyncRuns.playersSeen,
    playersCreated: playerSyncRuns.playersCreated,
    playersUpdated: playerSyncRuns.playersUpdated,
    reviewCount: playerSyncRuns.reviewCount,
    unmatchedCount: playerSyncRuns.unmatchedCount,
    ownershipRecordsModified: playerSyncRuns.ownershipRecordsModified,
    startedAt: playerSyncRuns.startedAt,
    completedAt: playerSyncRuns.completedAt,
    errorMessage: playerSyncRuns.errorMessage,
  }).from(playerSyncRuns).orderBy(desc(playerSyncRuns.startedAt)).limit(8);
}

async function downloadCsv(url: string) {
  const response = await fetch(url, { cache: "no-store", headers: { "user-agent": "FOFL-player-sync/1.0" } });
  if (!response.ok) throw new Error(`nflverse returned ${response.status} for ${new URL(url).pathname}`);
  const text = await response.text();
  if (!text.includes("gsis_id")) throw new Error(`nflverse source failed validation: ${new URL(url).pathname}`);
  return text;
}

function playerValues(player: NflversePlayer) {
  return {
    displayName: player.displayName,
    firstName: player.firstName,
    lastName: player.lastName,
    birthDate: player.birthDate,
    college: player.college,
    rookieYear: player.rookieYear,
    draftYear: player.draftYear,
    draftRound: player.draftRound,
    draftPick: player.draftPick,
    active: player.isActive,
    sourceUpdatedAt: new Date(),
    updatedAt: new Date(),
  };
}

export async function syncNflversePlayers({ dryRun, season }: { dryRun: boolean; season: number }): Promise<PlayerSyncResult> {
  const db = getDb();
  const [run] = await db.insert(playerSyncRuns).values({ status: "running", dryRun, sourceSeason: season }).returning({ id: playerSyncRuns.id });
  try {
    const [playerCsv, rosterCsv] = await Promise.all([downloadCsv(PLAYERS_URL), downloadCsv(ROSTERS_URL(season))]);
    const incoming = normalizeNflverseData(parseCsv(playerCsv), parseCsv(rosterCsv));
    if (incoming.length < 1_000) throw new Error(`nflverse source failed validation: only ${incoming.length} player rows`);

    const existingRows = await db
      .select({
        playerId: players.id,
        gsisId: providerPlayerIds.externalId,
        displayName: players.displayName,
        firstName: players.firstName,
        lastName: players.lastName,
        position: playerPositionEligibility.position,
        nflTeam: nflTeams.abbreviation,
        rosterEntryId: rosterEntries.id,
      })
      .from(players)
      .leftJoin(providerPlayerIds, and(eq(providerPlayerIds.playerId, players.id), eq(providerPlayerIds.provider, "nflverse")))
      .leftJoin(playerSeasons, and(eq(playerSeasons.playerId, players.id), eq(playerSeasons.year, season)))
      .leftJoin(nflTeams, eq(nflTeams.id, playerSeasons.nflTeamId))
      .leftJoin(playerPositionEligibility, and(eq(playerPositionEligibility.playerSeasonId, playerSeasons.id), eq(playerPositionEligibility.isPrimary, true)))
      .leftJoin(rosterEntries, and(eq(rosterEntries.playerSeasonId, playerSeasons.id), isNull(rosterEntries.releasedAt)));
    const existing = new Map<string, ExistingOwnedPlayer>();
    for (const row of existingRows) {
      const prior = existing.get(row.playerId);
      existing.set(row.playerId, {
        playerId: row.playerId,
        gsisId: row.gsisId ?? prior?.gsisId ?? null,
        displayName: row.displayName ?? `${row.firstName} ${row.lastName}`,
        position: row.position ?? prior?.position ?? null,
        nflTeam: row.nflTeam ?? prior?.nflTeam ?? null,
        owned: Boolean(row.rosterEntryId) || Boolean(prior?.owned),
      });
    }
    const plan = planPlayerSync(incoming, [...existing.values()]);

    if (!dryRun) {
      await db.transaction(async (tx) => {
        const teamIds = new Map<string, string>();
        for (const abbreviation of new Set(plan.actions.flatMap((action) => action.player.nflTeam ? [action.player.nflTeam] : []))) {
          const [team] = await tx.insert(nflTeams).values({ abbreviation, city: abbreviation, name: abbreviation }).onConflictDoUpdate({ target: nflTeams.abbreviation, set: { abbreviation } }).returning({ id: nflTeams.id });
          teamIds.set(abbreviation, team.id);
        }
        for (const action of plan.actions) {
          let playerId = action.playerId;
          if (action.kind === "create") {
            const [created] = await tx.insert(players).values(playerValues(action.player)).returning({ id: players.id });
            playerId = created.id;
          } else if (playerId) {
            await tx.update(players).set(playerValues(action.player)).where(eq(players.id, playerId));
          }
          if (!playerId) continue;
          await tx.insert(providerPlayerIds).values({ playerId, provider: "nflverse", externalId: action.player.gsisId }).onConflictDoNothing();
          if (action.player.nflTeam || action.player.position || action.player.nflStatus) {
            const [playerSeason] = await tx.insert(playerSeasons).values({
              playerId,
              year: season,
              nflTeamId: action.player.nflTeam ? teamIds.get(action.player.nflTeam) : null,
              yearsExperience: action.player.yearsExperience,
              nflStatus: action.player.nflStatus,
            }).onConflictDoUpdate({
              target: [playerSeasons.playerId, playerSeasons.year],
              set: {
                nflTeamId: action.player.nflTeam ? teamIds.get(action.player.nflTeam) : null,
                yearsExperience: action.player.yearsExperience,
                nflStatus: action.player.nflStatus,
                updatedAt: new Date(),
              },
            }).returning({ id: playerSeasons.id });
            if (action.player.position) {
              await tx.delete(playerPositionEligibility).where(and(eq(playerPositionEligibility.playerSeasonId, playerSeason.id), eq(playerPositionEligibility.isPrimary, true)));
              await tx.insert(playerPositionEligibility).values({ playerSeasonId: playerSeason.id, position: action.player.position, isPrimary: true }).onConflictDoNothing();
            }
          }
        }
      });
    }

    if (plan.issues.length) await db.insert(playerSyncIssues).values(plan.issues.map((issue) => ({ playerSyncRunId: run.id, ...issue })));
    const rosterAttributesUpdated = plan.actions.filter((action) => action.player.nflTeam || action.player.position || action.player.nflStatus).length;
    const result: PlayerSyncResult = { runId: run.id, dryRun, sourceSeason: season, playersSeen: plan.playersSeen, playersCreated: plan.playersCreated, playersUpdated: plan.playersUpdated, rosterAttributesUpdated, matchedAutomatically: plan.matchedAutomatically, unmatchedCount: plan.unmatchedCount, reviewCount: plan.reviewCount, ownershipRecordsModified: 0 };
    await db.update(playerSyncRuns).set({
      status: "succeeded",
      completedAt: new Date(),
      playersSeen: result.playersSeen,
      playersCreated: result.playersCreated,
      playersUpdated: result.playersUpdated,
      rosterAttributesUpdated: result.rosterAttributesUpdated,
      matchedAutomatically: result.matchedAutomatically,
      unmatchedCount: result.unmatchedCount,
      reviewCount: result.reviewCount,
      ownershipRecordsModified: 0,
    }).where(eq(playerSyncRuns.id, run.id));
    return result;
  } catch (error) {
    await db.update(playerSyncRuns).set({ status: "failed", completedAt: new Date(), errorMessage: error instanceof Error ? error.message : "Unknown sync error" }).where(eq(playerSyncRuns.id, run.id));
    throw error;
  }
}
