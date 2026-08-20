import "server-only";
import { and, eq } from "drizzle-orm";
import { checkDatabase, getDb } from "@/db/client";
import {
  authRateLimits,
  authVerifications,
  leagueMemberships,
  leagues,
  leagueSeasons,
  providerFranchiseIds,
  sessions,
  users,
} from "@/db/schema";

export type ApplicationDatabaseReadiness =
  | { ok: true }
  | {
      ok: false;
      reason:
        | "not_configured"
        | "configuration_invalid"
        | "unavailable"
        | "schema_unavailable"
        | "league_not_found"
        | "season_not_found";
    };

export async function checkApplicationDatabase(
  leagueSlug: string,
  configuredSeason?: number,
): Promise<ApplicationDatabaseReadiness> {
  const connectivity = await checkDatabase();
  if (!connectivity.ok) return connectivity;

  const db = getDb();
  try {
    // These cheap reads ensure the auth, authorization, and stable provider
    // identity migrations needed by this module have all been released.
    await db.select({ id: users.id }).from(users).limit(1);
    await db.select({ id: sessions.id }).from(sessions).limit(1);
    await db
      .select({ id: authVerifications.id })
      .from(authVerifications)
      .limit(1);
    await db.select({ key: authRateLimits.key }).from(authRateLimits).limit(1);
    await db
      .select({ id: leagueMemberships.id })
      .from(leagueMemberships)
      .limit(1);
    await db
      .select({ id: providerFranchiseIds.id })
      .from(providerFranchiseIds)
      .limit(1);
  } catch {
    return { ok: false, reason: "schema_unavailable" };
  }

  try {
    const [league] = await db
      .select({ id: leagues.id })
      .from(leagues)
      .where(eq(leagues.slug, leagueSlug))
      .limit(1);
    if (!league) return { ok: false, reason: "league_not_found" };

    const [season] = await db
      .select({ id: leagueSeasons.id })
      .from(leagueSeasons)
      .where(
        configuredSeason
          ? and(
              eq(leagueSeasons.leagueId, league.id),
              eq(leagueSeasons.year, configuredSeason),
            )
          : eq(leagueSeasons.leagueId, league.id),
      )
      .limit(1);
    if (!season) return { ok: false, reason: "season_not_found" };
    return { ok: true };
  } catch {
    return { ok: false, reason: "unavailable" };
  }
}
