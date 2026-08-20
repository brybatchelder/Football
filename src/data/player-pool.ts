import "server-only";

import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  nflTeams,
  contracts,
  franchiseSeasons,
  franchises,
  leagueSeasons,
  players,
  playerPositionEligibility,
  playerSeasons,
  playerTags,
  rosterEntries,
  salaries,
} from "@/db/schema";
import { roster } from "@/data/demo";
import type { Position, RosterPlayer } from "@/domain/types";

export type PlayerPoolSource = "nflverse" | "fofl-only" | "database-empty";

export type PlayerPool = {
  players: RosterPlayer[];
  source: PlayerPoolSource;
};

const supportedPositions = new Set<Position>([
  "QB",
  "RB",
  "WR",
  "TE",
  "PK",
  "DL",
  "LB",
  "DB",
]);

function fantasyPosition(value: string | null): Position | null {
  if (!value) return null;
  const position = value.toUpperCase();
  if (supportedPositions.has(position as Position)) return position as Position;
  if (["K", "P", "LS"].includes(position))
    return position === "K" ? "PK" : null;
  if (["DE", "DT", "NT"].includes(position)) return "DL";
  if (["CB", "S", "FS", "SS"].includes(position)) return "DB";
  if (["OLB", "ILB", "MLB"].includes(position)) return "LB";
  return null;
}

function staticRoster() {
  return roster.map((player) => ({ ...player, isRostered: true }));
}

export async function loadPlayerPool(season: number): Promise<PlayerPool> {
  if (!process.env.DATABASE_URL) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "DATABASE_URL is required to load the production player pool.",
      );
    }
    return { players: staticRoster(), source: "fofl-only" };
  }

  try {
    const rows = await getDb()
      .select({
        id: players.id,
        playerSeasonId: playerSeasons.id,
        displayName: players.displayName,
        firstName: players.firstName,
        lastName: players.lastName,
        team: nflTeams.abbreviation,
        bye: nflTeams.byeWeek,
        position: playerPositionEligibility.position,
        priorPoints: playerSeasons.priorPoints,
        nflStatus: playerSeasons.nflStatus,
        yearsExperience: playerSeasons.yearsExperience,
      })
      .from(playerSeasons)
      .innerJoin(players, eq(players.id, playerSeasons.playerId))
      .leftJoin(nflTeams, eq(nflTeams.id, playerSeasons.nflTeamId))
      .leftJoin(
        playerPositionEligibility,
        and(
          eq(playerPositionEligibility.playerSeasonId, playerSeasons.id),
          eq(playerPositionEligibility.isPrimary, true),
        ),
      )
      .where(and(eq(playerSeasons.year, season), eq(players.active, true)));

    if (!rows.length) return { players: [], source: "database-empty" };

    const ownershipRows = await getDb()
      .select({
        playerSeasonId: rosterEntries.playerSeasonId,
        franchiseId: franchises.slug,
        franchise: franchises.name,
        status: rosterEntries.status,
        salary: salaries.amount,
        contractYears: contracts.totalYears,
        tag: playerTags.type,
      })
      .from(rosterEntries)
      .innerJoin(
        franchiseSeasons,
        eq(franchiseSeasons.id, rosterEntries.franchiseSeasonId),
      )
      .innerJoin(franchises, eq(franchises.id, franchiseSeasons.franchiseId))
      .innerJoin(
        leagueSeasons,
        eq(leagueSeasons.id, franchiseSeasons.leagueSeasonId),
      )
      .leftJoin(
        salaries,
        and(
          eq(salaries.rosterEntryId, rosterEntries.id),
          isNull(salaries.effectiveTo),
        ),
      )
      .leftJoin(
        contracts,
        and(
          eq(contracts.rosterEntryId, rosterEntries.id),
          eq(contracts.status, "active"),
        ),
      )
      .leftJoin(
        playerTags,
        and(
          eq(playerTags.rosterEntryId, rosterEntries.id),
          eq(playerTags.season, season),
        ),
      )
      .where(
        and(eq(leagueSeasons.year, season), isNull(rosterEntries.releasedAt)),
      );
    const ownershipByPlayerSeason = new Map(
      ownershipRows.map((ownership) => [ownership.playerSeasonId, ownership]),
    );
    const pool: RosterPlayer[] = [];

    for (const row of rows) {
      const position = fantasyPosition(row.position);
      if (!position) continue;
      const name =
        row.displayName?.trim() || `${row.firstName} ${row.lastName}`.trim();
      const databaseOwnership = ownershipByPlayerSeason.get(row.playerSeasonId);
      if (databaseOwnership) {
        pool.push({
          id: row.id,
          franchiseId: databaseOwnership.franchiseId,
          franchise: databaseOwnership.franchise,
          name,
          team: row.team ?? "FA",
          position,
          priorPoints: row.priorPoints ?? "0.00",
          currentPoints: "0.00",
          bye: row.bye ?? 0,
          salary: databaseOwnership.salary ?? "0.00",
          contractYears: databaseOwnership.contractYears ?? 0,
          status: databaseOwnership.status,
          tag: databaseOwnership.tag ?? undefined,
          nflStatus: row.nflStatus,
          yearsExperience: row.yearsExperience,
          isRostered: true,
        });
        continue;
      }
      pool.push({
        id: row.id,
        franchiseId: "free-agent",
        franchise: "Free Agent",
        name,
        team: row.team ?? "FA",
        position,
        priorPoints: row.priorPoints ?? "0.00",
        currentPoints: "0.00",
        bye: row.bye ?? 0,
        salary: "0.00",
        contractYears: 0,
        status: "active",
        isRostered: false,
        nflStatus: row.nflStatus,
        yearsExperience: row.yearsExperience,
      });
    }

    return { players: pool, source: "nflverse" };
  } catch (error) {
    console.error("Unable to load the database-backed player pool.", error);
    throw error;
  }
}
