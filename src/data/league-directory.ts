import "server-only";

import { and, eq } from "drizzle-orm";
import type { ViewerContext } from "@/auth/permissions";
import { franchises as developmentFranchises } from "@/data/demo";
import { getDb } from "@/db/client";
import {
  franchiseMemberships,
  franchises,
  leagueMemberships,
  users,
} from "@/db/schema";
import type { AppRole } from "@/domain/types";

export type LeagueDirectoryMember = {
  userId: string;
  name: string;
  email: string | null;
  role: AppRole;
  franchises: Array<{
    id: string;
    name: string;
    slug: string;
    abbreviation: string;
    isPrimary: boolean;
  }>;
};

export type LeagueDirectory = {
  leagueName: string;
  seasonYear: number;
  members: LeagueDirectoryMember[];
  source: "database" | "development";
};

export async function loadLeagueDirectory(
  viewer: ViewerContext,
): Promise<LeagueDirectory> {
  if (!viewer.league || !viewer.season) {
    throw new Error(
      "An active league and season are required for the directory",
    );
  }
  if (!process.env.DATABASE_URL) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("DATABASE_URL is required for the production directory");
    }
    return developmentDirectory(viewer);
  }

  const db = getDb();
  const [memberRows, ownershipRows] = await Promise.all([
    db
      .select({
        userId: users.id,
        name: users.name,
        email: users.email,
        role: leagueMemberships.role,
      })
      .from(leagueMemberships)
      .innerJoin(users, eq(users.id, leagueMemberships.userId))
      .where(
        and(
          eq(leagueMemberships.leagueId, viewer.league.id),
          eq(leagueMemberships.active, true),
        ),
      )
      .orderBy(users.name),
    db
      .select({
        userId: franchiseMemberships.userId,
        id: franchises.id,
        name: franchises.name,
        slug: franchises.slug,
        abbreviation: franchises.abbreviation,
        isPrimary: franchiseMemberships.isPrimary,
      })
      .from(franchiseMemberships)
      .innerJoin(
        franchises,
        and(
          eq(franchises.id, franchiseMemberships.franchiseId),
          eq(franchises.leagueId, viewer.league.id),
        ),
      )
      .where(
        and(
          eq(franchiseMemberships.leagueSeasonId, viewer.season.id),
          eq(franchiseMemberships.active, true),
        ),
      )
      .orderBy(franchises.name),
  ]);
  const ownershipByUser = new Map<
    string,
    LeagueDirectoryMember["franchises"]
  >();
  for (const ownership of ownershipRows) {
    const memberships = ownershipByUser.get(ownership.userId) ?? [];
    memberships.push({
      id: ownership.id,
      name: ownership.name,
      slug: ownership.slug,
      abbreviation: ownership.abbreviation,
      isPrimary: ownership.isPrimary,
    });
    ownershipByUser.set(ownership.userId, memberships);
  }

  return {
    leagueName: viewer.league.name,
    seasonYear: viewer.season.year,
    members: memberRows.map((member) => ({
      ...member,
      franchises: ownershipByUser.get(member.userId) ?? [],
    })),
    source: "database",
  };
}

function developmentDirectory(viewer: ViewerContext): LeagueDirectory {
  return {
    leagueName: viewer.league?.name ?? "Front Office Football League",
    seasonYear: viewer.season?.year ?? 2026,
    members: developmentFranchises.map((franchise, index) => ({
      userId: `development-owner-${index + 1}`,
      name: franchise.owner,
      email: null,
      role: "owner",
      franchises: [
        {
          id: franchise.id,
          name: franchise.name,
          slug: franchise.id,
          abbreviation: franchise.abbreviation,
          isPrimary: true,
        },
      ],
    })),
    source: "development",
  };
}
