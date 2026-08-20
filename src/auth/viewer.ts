import "server-only";

import { cache } from "react";
import { and, desc, eq } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuth } from "@/auth/better-auth";
import { getDb } from "@/db/client";
import {
  franchiseMemberships,
  franchises,
  leagueMemberships,
  leagueSeasons,
  leagues,
  users,
} from "@/db/schema";
import {
  resolveEffectiveRole,
  selectActiveFranchise,
} from "@/domain/authorization";
import { hasPermission } from "@/domain/league-rules";
import type { AppRole } from "@/domain/types";

export type Permission = Parameters<typeof hasPermission>[1];

export type ViewerFranchise = {
  id: string;
  slug: string;
  name: string;
  abbreviation: string;
  role: AppRole;
  isPrimary: boolean;
};

export type ViewerContext = {
  authenticated: boolean;
  user: { id: string; email: string; name: string } | null;
  role: AppRole;
  league: { id: string; slug: string; name: string; timezone: string } | null;
  season: { id: string; year: number; status: string } | null;
  franchises: ViewerFranchise[];
  activeFranchise: ViewerFranchise | null;
  source: "better-auth" | "development" | "anonymous";
};

const anonymousViewer: ViewerContext = {
  authenticated: false,
  user: null,
  role: "visitor",
  league: null,
  season: null,
  franchises: [],
  activeFranchise: null,
  source: "anonymous",
};

export const currentViewer = cache(async (): Promise<ViewerContext> => {
  const cookieStore = await cookies();
  const developmentRole = cookieStore.get("football_dev_role")?.value as
    AppRole | undefined;

  if (
    process.env.NODE_ENV !== "production" &&
    isDevelopmentRole(developmentRole)
  ) {
    return developmentViewer(developmentRole);
  }

  if (!process.env.DATABASE_URL) return anonymousViewer;

  try {
    const session = await getAuth().api.getSession({
      headers: await headers(),
    });
    if (!session?.user?.id) return anonymousViewer;
    return await databaseViewer(
      session.user.id,
      cookieStore.get("football_franchise")?.value,
    );
  } catch (error) {
    console.error("Unable to resolve the authenticated FOFL viewer.", error);
    return anonymousViewer;
  }
});

export async function currentRole() {
  return (await currentViewer()).role;
}

export async function requirePermission(
  permission: Permission,
  returnTo?: string,
) {
  const viewer = await currentViewer();
  if (hasPermission(viewer.role, permission)) return viewer;
  const next =
    returnTo?.startsWith("/") && !returnTo.startsWith("//")
      ? `&next=${encodeURIComponent(returnTo)}`
      : "";
  redirect(
    viewer.authenticated
      ? `/sign-in?reason=permission${next}`
      : `/sign-in?reason=authentication${next}`,
  );
}

export async function requireLeagueMember(returnTo = "/league/teams") {
  const viewer = await currentViewer();
  if (
    viewer.authenticated &&
    viewer.user &&
    viewer.league &&
    viewer.role !== "visitor"
  ) {
    return viewer;
  }
  const next =
    returnTo.startsWith("/") && !returnTo.startsWith("//")
      ? `&next=${encodeURIComponent(returnTo)}`
      : "";
  redirect(
    viewer.authenticated
      ? `/sign-in?reason=permission${next}`
      : `/sign-in?reason=authentication${next}`,
  );
}

export class AuthorizationError extends Error {
  constructor(
    message: string,
    public readonly status: 401 | 403,
  ) {
    super(message);
    this.name = "AuthorizationError";
  }
}

export async function requireApiPermission(permission: Permission) {
  const viewer = await currentViewer();
  if (hasPermission(viewer.role, permission)) return viewer;
  throw new AuthorizationError(
    viewer.authenticated ? "Forbidden" : "Authentication required",
    viewer.authenticated ? 403 : 401,
  );
}

async function databaseViewer(
  userId: string,
  requestedFranchiseSlug?: string,
): Promise<ViewerContext> {
  const db = getDb();
  const leagueSlug = process.env.FOFL_LEAGUE_SLUG ?? "fofl";
  const configuredSeason = configuredSeasonYear();

  const [user, league] = await Promise.all([
    db.query.users.findFirst({ where: eq(users.id, userId) }),
    db.query.leagues.findFirst({ where: eq(leagues.slug, leagueSlug) }),
  ]);
  if (!user) return anonymousViewer;
  if (!league) {
    return {
      ...anonymousViewer,
      authenticated: true,
      user: { id: user.id, email: user.email, name: user.name },
      role: resolveEffectiveRole({
        platformRole: user.platformRole,
        leagueRole: null,
        hasFranchiseMembership: false,
      }),
      source: "better-auth",
    };
  }

  const season = await db.query.leagueSeasons.findFirst({
    where: configuredSeason
      ? and(
          eq(leagueSeasons.leagueId, league.id),
          eq(leagueSeasons.year, configuredSeason),
        )
      : eq(leagueSeasons.leagueId, league.id),
    orderBy: configuredSeason ? undefined : desc(leagueSeasons.year),
  });
  const leagueMembership = await db.query.leagueMemberships.findFirst({
    where: and(
      eq(leagueMemberships.userId, user.id),
      eq(leagueMemberships.leagueId, league.id),
      eq(leagueMemberships.active, true),
    ),
  });

  const membershipRows = season
    ? await db
        .select({
          id: franchises.id,
          slug: franchises.slug,
          name: franchises.name,
          abbreviation: franchises.abbreviation,
          role: franchiseMemberships.role,
          isPrimary: franchiseMemberships.isPrimary,
        })
        .from(franchiseMemberships)
        .innerJoin(
          franchises,
          eq(franchises.id, franchiseMemberships.franchiseId),
        )
        .where(
          and(
            eq(franchiseMemberships.userId, user.id),
            eq(franchiseMemberships.leagueSeasonId, season.id),
            eq(franchiseMemberships.active, true),
            eq(franchises.leagueId, league.id),
          ),
        )
    : [];
  const viewerFranchises: ViewerFranchise[] = membershipRows.map(
    (membership) => ({
      ...membership,
      role: "owner" as const,
    }),
  );
  const role = resolveEffectiveRole({
    platformRole: user.platformRole,
    leagueRole: leagueMembership?.role,
    hasFranchiseMembership: viewerFranchises.length > 0,
  });

  return {
    authenticated: true,
    user: { id: user.id, email: user.email, name: user.name },
    role,
    league: {
      id: league.id,
      slug: league.slug,
      name: league.name,
      timezone: league.timezone,
    },
    season: season
      ? { id: season.id, year: season.year, status: season.status }
      : null,
    franchises: viewerFranchises,
    activeFranchise: selectActiveFranchise(
      viewerFranchises,
      requestedFranchiseSlug,
    ),
    source: "better-auth",
  };
}

function developmentViewer(role: AppRole): ViewerContext {
  const ownsFranchise = role !== "visitor";
  const franchise: ViewerFranchise = {
    id: "canton-legends",
    slug: "canton-legends",
    name: "Canton Legends",
    abbreviation: "CAN",
    role: "owner",
    isPrimary: true,
  };
  return {
    authenticated: true,
    user: {
      id: "demo-current-user",
      email: "commissioner@football.local",
      name: role === "owner" ? "Development Owner" : "Development Commissioner",
    },
    role,
    league: {
      id: "fofl",
      slug: "fofl",
      name: "Front Office Football League",
      timezone: "America/Chicago",
    },
    season: { id: "fofl-2026", year: 2026, status: "preseason" },
    franchises: ownsFranchise ? [franchise] : [],
    activeFranchise: ownsFranchise ? franchise : null,
    source: "development",
  };
}

function isDevelopmentRole(role: AppRole | undefined): role is AppRole {
  return Boolean(
    role && ["owner", "assistant_commissioner", "commissioner"].includes(role),
  );
}

function configuredSeasonYear() {
  const value = process.env.MFL_SEASON?.trim();
  if (!value) return null;
  const year = Number(value);
  return Number.isInteger(year) && year >= 2000 && year <= 2200 ? year : null;
}
