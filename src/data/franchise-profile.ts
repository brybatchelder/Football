import "server-only";

import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  divisions,
  franchiseAliases,
  franchiseBranding,
  franchiseMemberships,
  franchiseSeasons,
  franchises,
  leagueSeasons,
  leagues,
  users,
} from "@/db/schema";
import { franchises as developmentFranchises } from "@/data/demo";

export type FranchiseProfile = {
  id: string;
  leagueId: string;
  leagueName: string;
  leagueSlug: string;
  seasonId: string;
  seasonYear: number;
  seasonStatus: string;
  salaryCap: string;
  name: string;
  slug: string;
  abbreviation: string;
  division: string | null;
  active: boolean;
  primaryColor: string | null;
  secondaryColor: string | null;
  logoUrl: string | null;
  owners: Array<{ name: string; isPrimary: boolean }>;
  aliases: Array<{
    name: string;
    abbreviation: string | null;
    effectiveFromSeason: number | null;
    effectiveToSeason: number | null;
  }>;
  source: "database" | "development";
};

export async function loadFranchiseProfile(
  slug: string,
): Promise<FranchiseProfile | null> {
  if (!process.env.DATABASE_URL) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "DATABASE_URL is required to load a production franchise.",
      );
    }
    return developmentProfile(slug);
  }

  const db = getDb();
  const leagueSlug = process.env.FOFL_LEAGUE_SLUG ?? "fofl";
  const league = await db.query.leagues.findFirst({
    where: eq(leagues.slug, leagueSlug),
  });
  if (!league) return null;

  const configuredSeason = configuredSeasonYear();
  const season = await db.query.leagueSeasons.findFirst({
    where: configuredSeason
      ? and(
          eq(leagueSeasons.leagueId, league.id),
          eq(leagueSeasons.year, configuredSeason),
        )
      : eq(leagueSeasons.leagueId, league.id),
    orderBy: configuredSeason ? undefined : desc(leagueSeasons.year),
  });
  if (!season) return null;

  const [identity] = await db
    .select({
      id: franchises.id,
      name: franchises.name,
      slug: franchises.slug,
      abbreviation: franchises.abbreviation,
      primaryColor: franchiseBranding.primaryColor,
      secondaryColor: franchiseBranding.secondaryColor,
      logoUrl: franchiseBranding.logoUrl,
      active: franchiseSeasons.active,
      division: divisions.name,
    })
    .from(franchises)
    .leftJoin(
      franchiseBranding,
      eq(franchiseBranding.franchiseId, franchises.id),
    )
    .leftJoin(
      franchiseSeasons,
      and(
        eq(franchiseSeasons.franchiseId, franchises.id),
        eq(franchiseSeasons.leagueSeasonId, season.id),
      ),
    )
    .leftJoin(divisions, eq(divisions.id, franchiseSeasons.divisionId))
    .where(and(eq(franchises.leagueId, league.id), eq(franchises.slug, slug)))
    .limit(1);
  if (!identity) return null;

  const [ownerRows, aliasRows] = await Promise.all([
    db
      .select({
        name: users.name,
        isPrimary: franchiseMemberships.isPrimary,
      })
      .from(franchiseMemberships)
      .innerJoin(users, eq(users.id, franchiseMemberships.userId))
      .where(
        and(
          eq(franchiseMemberships.franchiseId, identity.id),
          eq(franchiseMemberships.leagueSeasonId, season.id),
          eq(franchiseMemberships.active, true),
        ),
      )
      .orderBy(desc(franchiseMemberships.isPrimary), users.name),
    db
      .select({
        name: franchiseAliases.name,
        abbreviation: franchiseAliases.abbreviation,
        effectiveFromSeason: franchiseAliases.effectiveFromSeason,
        effectiveToSeason: franchiseAliases.effectiveToSeason,
      })
      .from(franchiseAliases)
      .where(eq(franchiseAliases.franchiseId, identity.id))
      .orderBy(desc(franchiseAliases.effectiveToSeason)),
  ]);

  return {
    ...identity,
    leagueId: league.id,
    leagueName: league.name,
    leagueSlug: league.slug,
    seasonId: season.id,
    seasonYear: season.year,
    seasonStatus: season.status,
    salaryCap: season.salaryCap,
    active: identity.active ?? false,
    owners: ownerRows,
    aliases: aliasRows,
    source: "database",
  };
}

function configuredSeasonYear() {
  const value = process.env.MFL_SEASON?.trim();
  if (!value) return null;
  const year = Number(value);
  return Number.isInteger(year) && year >= 2000 && year <= 2200 ? year : null;
}

function developmentProfile(slug: string): FranchiseProfile | null {
  const franchise = developmentFranchises.find((item) => item.id === slug);
  if (!franchise) return null;
  return {
    id: franchise.id,
    leagueId: "fofl",
    leagueName: "Front Office Football League",
    leagueSlug: "fofl",
    seasonId: "fofl-2026",
    seasonYear: 2026,
    seasonStatus: "preseason",
    salaryCap: "1000.00",
    name: franchise.name,
    slug: franchise.id,
    abbreviation: franchise.abbreviation,
    division: `${franchise.division} Division`,
    active: true,
    primaryColor: franchise.color,
    secondaryColor: "#0f172a",
    logoUrl: null,
    owners: [{ name: franchise.owner, isPrimary: true }],
    aliases: [],
    source: "development",
  };
}
