import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  auditLogs,
  franchiseMemberships,
  franchises,
  leagueMemberships,
  leagueSeasons,
  leagues,
  ownerInvitations,
  users,
} from "@/db/schema";

export function createInvitationToken() {
  return randomBytes(32).toString("base64url");
}

export function hashInvitationToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function findValidInvitation(token: string, email?: string) {
  const conditions = [
    eq(ownerInvitations.tokenHash, hashInvitationToken(token)),
    isNull(ownerInvitations.acceptedAt),
    isNull(ownerInvitations.revokedAt),
    gt(ownerInvitations.expiresAt, new Date()),
  ];
  if (email) conditions.push(eq(ownerInvitations.email, normalizeEmail(email)));
  return getDb().query.ownerInvitations.findFirst({
    where: and(...conditions),
  });
}

export async function invitationDetails(token: string) {
  const invitation = await findValidInvitation(token);
  if (!invitation) return null;
  const db = getDb();
  const [league, franchise] = await Promise.all([
    db.query.leagues.findFirst({ where: eq(leagues.id, invitation.leagueId) }),
    invitation.franchiseId
      ? db.query.franchises.findFirst({
          where: eq(franchises.id, invitation.franchiseId),
        })
      : null,
  ]);
  if (!league) return null;
  return { invitation, league, franchise };
}

export async function acceptInvitation(invitationId: string, userId: string) {
  const db = getDb();
  return db.transaction(async (tx) => {
    await tx.execute(sql`
      select id from owner_invitations
      where id = ${invitationId}
      for update
    `);
    const invitation = await tx.query.ownerInvitations.findFirst({
      where: and(
        eq(ownerInvitations.id, invitationId),
        isNull(ownerInvitations.acceptedAt),
        isNull(ownerInvitations.revokedAt),
        gt(ownerInvitations.expiresAt, new Date()),
      ),
    });
    if (!invitation) throw new Error("Invitation is no longer available");
    const invitedUser = await tx.query.users.findFirst({
      where: eq(users.id, userId),
    });
    if (
      !invitedUser ||
      normalizeEmail(invitedUser.email) !== normalizeEmail(invitation.email)
    )
      throw new Error("Invitation email does not match the accepting account");

    const season = await tx.query.leagueSeasons.findFirst({
      where: and(
        eq(leagueSeasons.id, invitation.leagueSeasonId),
        eq(leagueSeasons.leagueId, invitation.leagueId),
      ),
    });
    if (!season)
      throw new Error("Invitation season does not belong to its league");
    if (invitation.franchiseId) {
      await tx.execute(sql`
        select id from franchises
        where id = ${invitation.franchiseId}
        for update
      `);
      const franchise = await tx.query.franchises.findFirst({
        where: and(
          eq(franchises.id, invitation.franchiseId),
          eq(franchises.leagueId, invitation.leagueId),
        ),
      });
      if (!franchise) {
        throw new Error("Invitation franchise does not belong to its league");
      }
    }

    await tx
      .insert(leagueMemberships)
      .values({
        userId,
        leagueId: invitation.leagueId,
        role: invitation.role,
        active: true,
      })
      .onConflictDoUpdate({
        target: [leagueMemberships.userId, leagueMemberships.leagueId],
        set: { role: invitation.role, active: true, updatedAt: new Date() },
      });
    if (invitation.franchiseId) {
      await tx
        .update(franchiseMemberships)
        .set({ isPrimary: false, updatedAt: new Date() })
        .where(
          and(
            eq(franchiseMemberships.franchiseId, invitation.franchiseId),
            eq(franchiseMemberships.leagueSeasonId, invitation.leagueSeasonId),
            eq(franchiseMemberships.isPrimary, true),
          ),
        );
      await tx
        .insert(franchiseMemberships)
        .values({
          userId,
          franchiseId: invitation.franchiseId,
          leagueSeasonId: invitation.leagueSeasonId,
          role: "owner",
          active: true,
          isPrimary: true,
        })
        .onConflictDoUpdate({
          target: [
            franchiseMemberships.userId,
            franchiseMemberships.franchiseId,
            franchiseMemberships.leagueSeasonId,
          ],
          set: {
            active: true,
            role: "owner",
            isPrimary: true,
            updatedAt: new Date(),
          },
        });
    }
    const acceptedAt = new Date();
    const [acceptedInvitation] = await tx
      .update(ownerInvitations)
      .set({ acceptedAt, acceptedByUserId: userId, updatedAt: acceptedAt })
      .where(
        and(
          eq(ownerInvitations.id, invitation.id),
          isNull(ownerInvitations.acceptedAt),
          isNull(ownerInvitations.revokedAt),
          gt(ownerInvitations.expiresAt, acceptedAt),
        ),
      )
      .returning({ id: ownerInvitations.id });
    if (!acceptedInvitation) {
      throw new Error("Invitation is no longer available");
    }
    await tx.insert(auditLogs).values({
      leagueId: invitation.leagueId,
      actorId: userId,
      action: "owner.invitation.accepted",
      entityType: invitation.franchiseId
        ? "franchise_membership"
        : "league_membership",
      entityId: invitation.franchiseId ?? invitation.leagueId,
      entityName: invitation.email,
      after: {
        email: invitation.email,
        role: invitation.role,
        leagueSeasonId: invitation.leagueSeasonId,
      },
      source: "football",
      correlationId: crypto.randomUUID(),
    });
    return invitation;
  });
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}
