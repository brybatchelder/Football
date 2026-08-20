import "server-only";

import { and, desc, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  franchiseMemberships,
  franchiseBranding,
  franchises,
  leagueMemberships,
  ownerInvitations,
  users,
} from "@/db/schema";
import type { ViewerContext } from "@/auth/permissions";

export async function loadOwnerAdmin(viewer: ViewerContext) {
  if (!viewer.league || !viewer.season || !process.env.DATABASE_URL) {
    return {
      available: false as const,
      franchises: [],
      leagueMembers: [],
      invitations: [],
    };
  }
  const db = getDb();
  const [leagueFranchises, ownerRows, managerRows, invitations] =
    await Promise.all([
      db
        .select({
          id: franchises.id,
          name: franchises.name,
          slug: franchises.slug,
          abbreviation: franchises.abbreviation,
          primaryColor: franchiseBranding.primaryColor,
          secondaryColor: franchiseBranding.secondaryColor,
          logoUrl: franchiseBranding.logoUrl,
        })
        .from(franchises)
        .leftJoin(
          franchiseBranding,
          eq(franchiseBranding.franchiseId, franchises.id),
        )
        .where(eq(franchises.leagueId, viewer.league.id)),
      db
        .select({
          membershipId: franchiseMemberships.id,
          franchiseId: franchises.id,
          userId: users.id,
          name: users.name,
          email: users.email,
          role: franchiseMemberships.role,
          active: franchiseMemberships.active,
          isPrimary: franchiseMemberships.isPrimary,
        })
        .from(franchiseMemberships)
        .innerJoin(users, eq(users.id, franchiseMemberships.userId))
        .innerJoin(
          franchises,
          eq(franchises.id, franchiseMemberships.franchiseId),
        )
        .where(eq(franchiseMemberships.leagueSeasonId, viewer.season.id)),
      db
        .select({
          membershipId: leagueMemberships.id,
          userId: users.id,
          name: users.name,
          email: users.email,
          role: leagueMemberships.role,
          active: leagueMemberships.active,
        })
        .from(leagueMemberships)
        .innerJoin(users, eq(users.id, leagueMemberships.userId))
        .where(eq(leagueMemberships.leagueId, viewer.league.id)),
      db
        .select({
          id: ownerInvitations.id,
          email: ownerInvitations.email,
          role: ownerInvitations.role,
          franchiseId: ownerInvitations.franchiseId,
          expiresAt: ownerInvitations.expiresAt,
          createdAt: ownerInvitations.createdAt,
        })
        .from(ownerInvitations)
        .where(
          and(
            eq(ownerInvitations.leagueSeasonId, viewer.season.id),
            isNull(ownerInvitations.acceptedAt),
            isNull(ownerInvitations.revokedAt),
          ),
        )
        .orderBy(desc(ownerInvitations.createdAt)),
    ]);

  return {
    available: true as const,
    franchises: leagueFranchises.map((franchise) => ({
      ...franchise,
      owners: ownerRows.filter((owner) => owner.franchiseId === franchise.id),
    })),
    leagueMembers: managerRows,
    invitations,
  };
}
