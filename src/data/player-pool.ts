import "server-only";

import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  nflTeams,
  players,
  playerPositionEligibility,
  playerSeasons,
} from "@/db/schema";
import { roster } from "@/data/demo";
import type { Position, RosterPlayer } from "@/domain/types";

export type PlayerPoolSource = "nflverse" | "fofl-only";

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
  if (["K", "P", "LS"].includes(position)) return position === "K" ? "PK" : null;
  if (["DE", "DT", "NT"].includes(position)) return "DL";
  if (["CB", "S", "FS", "SS"].includes(position)) return "DB";
  if (["OLB", "ILB", "MLB"].includes(position)) return "LB";
  return null;
}

function identityKey(name: string, position: Position, team: string) {
  return `${name.toLowerCase().replace(/[^a-z0-9]/g, "")}|${position}|${team.toUpperCase()}`;
}

function staticRoster() {
  return roster.map((player) => ({ ...player, isRostered: true }));
}

export async function loadPlayerPool(season: number): Promise<PlayerPool> {
  if (!process.env.DATABASE_URL) return { players: staticRoster(), source: "fofl-only" };

  try {
    const rows = await getDb()
      .select({
        id: players.id,
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
      .where(eq(playerSeasons.year, season));

    if (!rows.length) return { players: staticRoster(), source: "fofl-only" };

    const ownedByIdentity = new Map(
      roster.map((player) => [
        identityKey(player.name, player.position, player.team),
        player,
      ]),
    );
    const ownedIds = new Set<string>();
    const pool: RosterPlayer[] = [];

    for (const row of rows) {
      const position = fantasyPosition(row.position);
      if (!position) continue;
      const name = row.displayName?.trim() || `${row.firstName} ${row.lastName}`.trim();
      const owned = ownedByIdentity.get(
        identityKey(name, position, row.team ?? "FA"),
      );
      if (owned) {
        ownedIds.add(owned.id);
        pool.push({
          ...owned,
          id: row.id,
          team: row.team ?? owned.team,
          bye: row.bye ?? owned.bye,
          priorPoints: row.priorPoints ?? owned.priorPoints,
          nflStatus: row.nflStatus,
          yearsExperience: row.yearsExperience,
          isRostered: true,
        });
      } else {
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
    }

    for (const owned of roster) {
      if (!ownedIds.has(owned.id)) pool.push({ ...owned, isRostered: true });
    }

    return { players: pool, source: "nflverse" };
  } catch (error) {
    console.error("Unable to load the nflverse player pool; using the FOFL roster fallback.", error);
    return { players: staticRoster(), source: "fofl-only" };
  }
}
