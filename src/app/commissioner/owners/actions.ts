"use server";

import { and, eq, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { currentViewer, requirePermission } from "@/auth/permissions";
import {
  createInvitationToken,
  hashInvitationToken,
  normalizeEmail,
} from "@/auth/invitations";
import { ownerInvitationEmail, sendAuthEmail } from "@/auth/email";
import { getDb } from "@/db/client";
import {
  auditLogs,
  franchiseAliases,
  franchiseBranding,
  franchiseMemberships,
  franchises,
  leagueMemberships,
  ownerInvitations,
} from "@/db/schema";
import { hasPermission } from "@/domain/league-rules";

export type InviteOwnerState =
  | { status: "idle" }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

export type FranchiseIdentityState = InviteOwnerState;
export type OwnerAdminActionState = InviteOwnerState;

const inviteSchema = z
  .object({
    email: z.string().email(),
    role: z.enum(["owner", "assistant_commissioner", "commissioner"]),
    franchiseId: z.string().uuid().optional().or(z.literal("")),
  })
  .superRefine((value, context) => {
    if (value.role === "owner" && !value.franchiseId) {
      context.addIssue({
        code: "custom",
        path: ["franchiseId"],
        message: "Choose the franchise this owner will manage.",
      });
    }
  });

export async function inviteOwner(
  _state: InviteOwnerState,
  formData: FormData,
): Promise<InviteOwnerState> {
  const viewer = await requirePermission("manage_owners");
  if (
    viewer.source !== "better-auth" ||
    !viewer.user ||
    !viewer.league ||
    !viewer.season ||
    !process.env.DATABASE_URL
  ) {
    return {
      status: "error",
      message:
        "Owner invitations require a connected production database session.",
    };
  }
  const parsed = inviteSchema.safeParse({
    email: formData.get("email"),
    role: formData.get("role"),
    franchiseId: formData.get("franchiseId"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message:
        parsed.error.issues[0]?.message ?? "Invitation details are invalid.",
    };
  }

  const db = getDb();
  const franchiseId = parsed.data.franchiseId || null;
  let franchiseName: string | null = null;
  if (franchiseId) {
    const franchise = await db.query.franchises.findFirst({
      where: and(
        eq(franchises.id, franchiseId),
        eq(franchises.leagueId, viewer.league.id),
      ),
    });
    if (!franchise) return { status: "error", message: "Unknown franchise." };
    franchiseName = franchise.name;
  }

  const email = normalizeEmail(parsed.data.email);
  const token = createInvitationToken();
  const tokenHash = hashInvitationToken(token);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  try {
    await db.transaction(async (tx) => {
      const existing = await tx.query.ownerInvitations.findFirst({
        where: and(
          eq(ownerInvitations.email, email),
          eq(ownerInvitations.leagueSeasonId, viewer.season!.id),
          franchiseId
            ? eq(ownerInvitations.franchiseId, franchiseId)
            : isNull(ownerInvitations.franchiseId),
          isNull(ownerInvitations.acceptedAt),
          isNull(ownerInvitations.revokedAt),
        ),
      });
      const [invitation] = existing
        ? await tx
            .update(ownerInvitations)
            .set({
              tokenHash,
              role: parsed.data.role,
              expiresAt,
              invitedByUserId: viewer.user!.id,
              updatedAt: new Date(),
            })
            .where(eq(ownerInvitations.id, existing.id))
            .returning()
        : await tx
            .insert(ownerInvitations)
            .values({
              leagueId: viewer.league!.id,
              leagueSeasonId: viewer.season!.id,
              franchiseId,
              email,
              role: parsed.data.role,
              tokenHash,
              expiresAt,
              invitedByUserId: viewer.user!.id,
            })
            .returning();
      if (!invitation) throw new Error("Invitation was not saved");
      await tx.insert(auditLogs).values({
        leagueId: viewer.league!.id,
        actorId: viewer.user!.id,
        action: existing
          ? "owner.invitation.resent"
          : "owner.invitation.created",
        entityType: "owner_invitation",
        entityId: invitation.id,
        entityName: email,
        after: { email, role: parsed.data.role, franchiseId, expiresAt },
        source: "football",
        correlationId: crypto.randomUUID(),
      });
    });
  } catch (error) {
    console.error("Owner invitation transaction failed.", error);
    return {
      status: "error",
      message:
        "The invitation could not be saved. Retry once; if it continues, review the server logs.",
    };
  }
  revalidatePath("/commissioner/owners");

  const baseUrl = process.env.BETTER_AUTH_URL;
  if (!baseUrl)
    return { status: "error", message: "BETTER_AUTH_URL is not configured." };
  const url = new URL("/accept-invitation", baseUrl);
  url.searchParams.set("token", token);
  try {
    await sendAuthEmail({
      to: email,
      ...ownerInvitationEmail({
        url: url.toString(),
        leagueName: viewer.league.name,
        franchiseName,
        expiresAt,
      }),
    });
  } catch {
    return {
      status: "error",
      message:
        "The invitation was saved, but email delivery failed. Re-send it after checking email configuration.",
    };
  }
  return {
    status: "success",
    message: `Invitation sent to ${email}. It expires in seven days.`,
  };
}

export async function setFranchiseMembershipStatus(
  formData: FormData,
): Promise<OwnerAdminActionState> {
  const viewer = await requirePermission("manage_owners");
  if (
    !viewer.user ||
    !viewer.league ||
    !viewer.season ||
    !process.env.DATABASE_URL
  ) {
    return ownerActionError("A production database session is required.");
  }
  const parsed = z
    .object({
      membershipId: z.string().uuid(),
      active: z.enum(["true", "false"]).transform((value) => value === "true"),
    })
    .safeParse({
      membershipId: formData.get("membershipId"),
      active: formData.get("active"),
    });
  if (!parsed.success) return ownerActionError("Invalid franchise membership.");
  const db = getDb();
  const [membership] = await db
    .select({
      id: franchiseMemberships.id,
      userId: franchiseMemberships.userId,
      active: franchiseMemberships.active,
      isPrimary: franchiseMemberships.isPrimary,
      franchiseId: franchises.id,
      franchiseName: franchises.name,
    })
    .from(franchiseMemberships)
    .innerJoin(franchises, eq(franchises.id, franchiseMemberships.franchiseId))
    .where(
      and(
        eq(franchiseMemberships.id, parsed.data.membershipId),
        eq(franchiseMemberships.leagueSeasonId, viewer.season.id),
        eq(franchises.leagueId, viewer.league.id),
      ),
    );
  if (!membership) return ownerActionError("Franchise membership not found.");
  try {
    const outcome = await db.transaction(async (tx) => {
      await lockFranchise(tx, membership.franchiseId);
      const currentMembership = await tx.query.franchiseMemberships.findFirst({
        where: and(
          eq(franchiseMemberships.id, membership.id),
          eq(franchiseMemberships.franchiseId, membership.franchiseId),
          eq(franchiseMemberships.leagueSeasonId, viewer.season!.id),
        ),
      });
      if (!currentMembership) {
        return ownerActionError("Franchise membership no longer exists.");
      }
      if (currentMembership.active === parsed.data.active) {
        return ownerActionSuccess(
          parsed.data.active
            ? `${membership.franchiseName} access is already active.`
            : `${membership.franchiseName} access is already inactive.`,
        );
      }

      let nextPrimary = false;
      if (parsed.data.active) {
        await tx
          .insert(leagueMemberships)
          .values({
            userId: membership.userId,
            leagueId: viewer.league!.id,
            role: "owner",
            active: true,
          })
          .onConflictDoUpdate({
            target: [leagueMemberships.userId, leagueMemberships.leagueId],
            set: { active: true, updatedAt: new Date() },
          });
        const existingPrimary = await tx.query.franchiseMemberships.findFirst({
          where: and(
            eq(franchiseMemberships.franchiseId, currentMembership.franchiseId),
            eq(
              franchiseMemberships.leagueSeasonId,
              currentMembership.leagueSeasonId,
            ),
            eq(franchiseMemberships.active, true),
            eq(franchiseMemberships.isPrimary, true),
          ),
        });
        nextPrimary = !existingPrimary;
      }
      await tx
        .update(franchiseMemberships)
        .set({
          active: parsed.data.active,
          isPrimary: nextPrimary,
          updatedAt: new Date(),
        })
        .where(eq(franchiseMemberships.id, currentMembership.id));
      let replacementPrimaryId: string | null = null;
      if (!parsed.data.active && currentMembership.isPrimary) {
        const replacement = await tx.query.franchiseMemberships.findFirst({
          where: and(
            eq(franchiseMemberships.franchiseId, currentMembership.franchiseId),
            eq(
              franchiseMemberships.leagueSeasonId,
              currentMembership.leagueSeasonId,
            ),
            eq(franchiseMemberships.active, true),
          ),
          orderBy: (table, { asc }) => asc(table.createdAt),
        });
        if (replacement) {
          replacementPrimaryId = replacement.id;
          await tx
            .update(franchiseMemberships)
            .set({ isPrimary: true, updatedAt: new Date() })
            .where(eq(franchiseMemberships.id, replacement.id));
        }
      }
      await tx.insert(auditLogs).values({
        leagueId: viewer.league!.id,
        actorId: viewer.user!.id,
        action: parsed.data.active
          ? "owner.membership.activated"
          : "owner.membership.deactivated",
        entityType: "franchise_membership",
        entityId: membership.id,
        entityName: membership.franchiseName,
        before: {
          active: currentMembership.active,
          isPrimary: currentMembership.isPrimary,
        },
        after: {
          active: parsed.data.active,
          isPrimary: nextPrimary,
          replacementPrimaryId,
        },
        source: "football",
        correlationId: crypto.randomUUID(),
      });
      return ownerActionSuccess(
        parsed.data.active
          ? `${membership.franchiseName} access restored.`
          : `${membership.franchiseName} access removed.`,
      );
    });
    if (outcome.status === "success") {
      revalidatePath("/commissioner/owners");
    }
    return outcome;
  } catch (error) {
    console.error("Franchise membership update failed.", error);
    return ownerActionError("Franchise access could not be updated. Retry.");
  }
}

export async function setPrimaryFranchiseOwner(
  formData: FormData,
): Promise<OwnerAdminActionState> {
  const viewer = await requirePermission("manage_owners");
  if (
    !viewer.user ||
    !viewer.league ||
    !viewer.season ||
    !process.env.DATABASE_URL
  ) {
    return ownerActionError("A production database session is required.");
  }
  const membershipId = z
    .string()
    .uuid()
    .safeParse(formData.get("membershipId"));
  if (!membershipId.success)
    return ownerActionError("Invalid owner membership.");
  const db = getDb();
  const [membership] = await db
    .select({
      id: franchiseMemberships.id,
      franchiseId: franchiseMemberships.franchiseId,
      franchiseName: franchises.name,
      active: franchiseMemberships.active,
    })
    .from(franchiseMemberships)
    .innerJoin(franchises, eq(franchises.id, franchiseMemberships.franchiseId))
    .where(
      and(
        eq(franchiseMemberships.id, membershipId.data),
        eq(franchiseMemberships.leagueSeasonId, viewer.season.id),
        eq(franchiseMemberships.active, true),
        eq(franchises.leagueId, viewer.league.id),
      ),
    );
  if (!membership)
    return ownerActionError("Only an active franchise owner can be primary.");
  try {
    const outcome = await db.transaction(async (tx) => {
      await lockFranchise(tx, membership.franchiseId);
      const currentMembership = await tx.query.franchiseMemberships.findFirst({
        where: and(
          eq(franchiseMemberships.id, membership.id),
          eq(franchiseMemberships.franchiseId, membership.franchiseId),
          eq(franchiseMemberships.leagueSeasonId, viewer.season!.id),
          eq(franchiseMemberships.active, true),
        ),
      });
      if (!currentMembership) {
        return ownerActionError(
          "This owner is no longer active for the franchise.",
        );
      }
      if (currentMembership.isPrimary) {
        return ownerActionSuccess(
          `${membership.franchiseName} already has this primary owner.`,
        );
      }
      await tx
        .update(franchiseMemberships)
        .set({ isPrimary: false, updatedAt: new Date() })
        .where(
          and(
            eq(franchiseMemberships.franchiseId, membership.franchiseId),
            eq(franchiseMemberships.leagueSeasonId, viewer.season!.id),
          ),
        );
      await tx
        .update(franchiseMemberships)
        .set({ isPrimary: true, updatedAt: new Date() })
        .where(
          and(
            eq(franchiseMemberships.id, currentMembership.id),
            eq(franchiseMemberships.active, true),
          ),
        );
      await tx.insert(auditLogs).values({
        leagueId: viewer.league!.id,
        actorId: viewer.user!.id,
        action: "owner.membership.primary_changed",
        entityType: "franchise_membership",
        entityId: currentMembership.id,
        entityName: membership.franchiseName,
        after: { isPrimary: true, leagueSeasonId: viewer.season!.id },
        source: "football",
        correlationId: crypto.randomUUID(),
      });
      return ownerActionSuccess(
        `Primary owner updated for ${membership.franchiseName}.`,
      );
    });
    if (outcome.status === "success") {
      revalidatePath("/commissioner/owners");
    }
    return outcome;
  } catch (error) {
    console.error("Primary franchise owner update failed.", error);
    return ownerActionError("Primary owner could not be updated. Retry.");
  }
}

export async function setLeagueMembershipStatus(
  formData: FormData,
): Promise<OwnerAdminActionState> {
  const viewer = await requirePermission("manage_owners");
  if (
    !viewer.user ||
    !viewer.league ||
    !viewer.season ||
    !process.env.DATABASE_URL
  ) {
    return ownerActionError("A production database session is required.");
  }
  const parsed = z
    .object({
      membershipId: z.string().uuid(),
      active: z.enum(["true", "false"]).transform((value) => value === "true"),
    })
    .safeParse({
      membershipId: formData.get("membershipId"),
      active: formData.get("active"),
    });
  if (!parsed.success) return ownerActionError("Invalid league membership.");
  const db = getDb();
  try {
    const outcome = await db.transaction(async (tx) => {
      await lockLeagueMemberships(tx, viewer.league!.id);
      const membership = await tx.query.leagueMemberships.findFirst({
        where: and(
          eq(leagueMemberships.id, parsed.data.membershipId),
          eq(leagueMemberships.leagueId, viewer.league!.id),
        ),
      });
      if (!membership) return ownerActionError("League membership not found.");
      if (membership.role === "system_administrator") {
        return ownerActionError(
          "System administrator access is managed at the platform level.",
        );
      }
      if (!parsed.data.active && membership.userId === viewer.user!.id) {
        return ownerActionError("You cannot remove your own league access.");
      }
      if (membership.active === parsed.data.active) {
        return ownerActionSuccess(
          parsed.data.active
            ? "League access is already active."
            : "League access is already inactive.",
        );
      }
      if (
        !parsed.data.active &&
        membership.role === "commissioner" &&
        membership.active &&
        (await countActiveCommissioners(tx, viewer.league!.id)) <= 1
      ) {
        return ownerActionError(
          "Promote another commissioner before removing the last commissioner.",
        );
      }

      await tx
        .update(leagueMemberships)
        .set({ active: parsed.data.active, updatedAt: new Date() })
        .where(eq(leagueMemberships.id, membership.id));
      const replacementPrimaryIds: string[] = [];
      if (!parsed.data.active) {
        await tx.execute(sql`
          select franchises.id
          from franchises
          inner join franchise_memberships
            on franchise_memberships.franchise_id = franchises.id
          where franchise_memberships.user_id = ${membership.userId}
            and franchise_memberships.league_season_id = ${viewer.season!.id}
          order by franchises.id
          for update of franchises
        `);
        const ownedMemberships = await tx.query.franchiseMemberships.findMany({
          where: and(
            eq(franchiseMemberships.userId, membership.userId),
            eq(franchiseMemberships.leagueSeasonId, viewer.season!.id),
            eq(franchiseMemberships.active, true),
          ),
        });
        await tx
          .update(franchiseMemberships)
          .set({ active: false, isPrimary: false, updatedAt: new Date() })
          .where(
            and(
              eq(franchiseMemberships.userId, membership.userId),
              eq(franchiseMemberships.leagueSeasonId, viewer.season!.id),
            ),
          );
        for (const ownedMembership of ownedMemberships) {
          if (!ownedMembership.isPrimary) continue;
          const replacement = await tx.query.franchiseMemberships.findFirst({
            where: and(
              eq(franchiseMemberships.franchiseId, ownedMembership.franchiseId),
              eq(franchiseMemberships.leagueSeasonId, viewer.season!.id),
              eq(franchiseMemberships.active, true),
            ),
            orderBy: (table, { asc }) => asc(table.createdAt),
          });
          if (!replacement) continue;
          replacementPrimaryIds.push(replacement.id);
          await tx
            .update(franchiseMemberships)
            .set({ isPrimary: true, updatedAt: new Date() })
            .where(eq(franchiseMemberships.id, replacement.id));
        }
      }
      await tx.insert(auditLogs).values({
        leagueId: viewer.league!.id,
        actorId: viewer.user!.id,
        action: parsed.data.active
          ? "league.membership.activated"
          : "league.membership.deactivated",
        entityType: "league_membership",
        entityId: membership.id,
        entityName: membership.userId,
        before: { active: membership.active, role: membership.role },
        after: {
          active: parsed.data.active,
          role: membership.role,
          replacementPrimaryIds,
        },
        source: "football",
        correlationId: crypto.randomUUID(),
      });
      return ownerActionSuccess(
        parsed.data.active
          ? "League access restored."
          : "League and current-season franchise access removed.",
      );
    });
    if (outcome.status === "success") {
      revalidatePath("/commissioner/owners");
    }
    return outcome;
  } catch (error) {
    console.error("League membership status update failed.", error);
    return ownerActionError("League access could not be updated. Retry.");
  }
}

export async function setLeagueMembershipRole(
  formData: FormData,
): Promise<OwnerAdminActionState> {
  const viewer = await requirePermission("manage_owners");
  if (!viewer.user || !viewer.league || !process.env.DATABASE_URL) {
    return ownerActionError("A production database session is required.");
  }
  const parsed = z
    .object({
      membershipId: z.string().uuid(),
      role: z.enum(["owner", "assistant_commissioner", "commissioner"]),
    })
    .safeParse({
      membershipId: formData.get("membershipId"),
      role: formData.get("role"),
    });
  if (!parsed.success) return ownerActionError("Invalid league role.");
  const db = getDb();
  try {
    const outcome = await db.transaction(async (tx) => {
      await lockLeagueMemberships(tx, viewer.league!.id);
      const membership = await tx.query.leagueMemberships.findFirst({
        where: and(
          eq(leagueMemberships.id, parsed.data.membershipId),
          eq(leagueMemberships.leagueId, viewer.league!.id),
        ),
      });
      if (!membership) return ownerActionError("League membership not found.");
      if (membership.userId === viewer.user!.id) {
        return ownerActionError(
          "Another commissioner must change your league role.",
        );
      }
      if (membership.role === "system_administrator") {
        return ownerActionError(
          "System administrator roles are managed at the platform level.",
        );
      }
      if (membership.role === parsed.data.role) {
        return ownerActionSuccess(
          "The selected league role is already active.",
        );
      }
      if (
        membership.role === "commissioner" &&
        membership.active &&
        (await countActiveCommissioners(tx, viewer.league!.id)) <= 1
      ) {
        return ownerActionError(
          "Promote another commissioner before changing the last commissioner's role.",
        );
      }

      await tx
        .update(leagueMemberships)
        .set({ role: parsed.data.role, updatedAt: new Date() })
        .where(eq(leagueMemberships.id, membership.id));
      await tx.insert(auditLogs).values({
        leagueId: viewer.league!.id,
        actorId: viewer.user!.id,
        action: "league.membership.role_changed",
        entityType: "league_membership",
        entityId: membership.id,
        entityName: membership.userId,
        before: { role: membership.role, active: membership.active },
        after: { role: parsed.data.role, active: membership.active },
        source: "football",
        correlationId: crypto.randomUUID(),
      });
      return ownerActionSuccess(
        `League role changed to ${parsed.data.role.replaceAll("_", " ")}.`,
      );
    });
    if (outcome.status === "success") {
      revalidatePath("/commissioner/owners");
    }
    return outcome;
  } catch (error) {
    console.error("League membership role update failed.", error);
    return ownerActionError("League role could not be updated. Retry.");
  }
}

const franchiseIdentitySchema = z.object({
  franchiseId: z.string().uuid(),
  name: z.string().trim().min(2).max(80),
  abbreviation: z
    .string()
    .trim()
    .min(2)
    .max(6)
    .regex(
      /^[A-Za-z0-9]+$/,
      "Use only letters and numbers in the abbreviation.",
    ),
  primaryColor: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, "Primary color must be a six-digit hex color."),
  secondaryColor: z
    .string()
    .trim()
    .regex(
      /^#[0-9a-fA-F]{6}$/,
      "Secondary color must be a six-digit hex color.",
    ),
  logoUrl: z
    .string()
    .trim()
    .max(2048, "Logo URL is too long.")
    .url("Logo must be a valid URL.")
    .refine((value) => {
      try {
        const url = new URL(value);
        return url.protocol === "https:" && !url.username && !url.password;
      } catch {
        return false;
      }
    }, "Logo URL must use HTTPS without embedded credentials.")
    .or(z.literal("")),
});

export async function updateFranchiseIdentity(
  _state: FranchiseIdentityState,
  formData: FormData,
): Promise<FranchiseIdentityState> {
  const viewer = await currentViewer();
  if (
    !viewer.user ||
    !viewer.league ||
    !viewer.season ||
    !process.env.DATABASE_URL
  ) {
    return {
      status: "error",
      message: "A production database session is required.",
    };
  }
  const parsed = franchiseIdentitySchema.safeParse({
    franchiseId: formData.get("franchiseId"),
    name: formData.get("name"),
    abbreviation: formData.get("abbreviation"),
    primaryColor: formData.get("primaryColor"),
    secondaryColor: formData.get("secondaryColor"),
    logoUrl: formData.get("logoUrl"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message:
        parsed.error.issues[0]?.message ?? "Franchise details are invalid.",
    };
  }
  const managesLeague = hasPermission(viewer.role, "manage_owners");
  const ownsFranchise = viewer.franchises.some(
    (franchise) => franchise.id === parsed.data.franchiseId,
  );
  if (!managesLeague && !ownsFranchise) {
    return {
      status: "error",
      message: "You do not have access to update this franchise.",
    };
  }
  const db = getDb();
  const existing = await db.query.franchises.findFirst({
    where: and(
      eq(franchises.id, parsed.data.franchiseId),
      eq(franchises.leagueId, viewer.league.id),
    ),
  });
  if (!existing) return { status: "error", message: "Unknown franchise." };

  const now = new Date();
  const abbreviation = parsed.data.abbreviation.toUpperCase();
  const [duplicateAbbreviation, existingBranding] = await Promise.all([
    db.query.franchises.findFirst({
      where: and(
        eq(franchises.leagueId, viewer.league.id),
        eq(franchises.abbreviation, abbreviation),
      ),
    }),
    db.query.franchiseBranding.findFirst({
      where: eq(franchiseBranding.franchiseId, existing.id),
    }),
  ]);
  if (duplicateAbbreviation && duplicateAbbreviation.id !== existing.id) {
    return {
      status: "error",
      message: `${abbreviation} is already used by ${duplicateAbbreviation.name}.`,
    };
  }
  try {
    await db.transaction(async (tx) => {
      if (existing.name !== parsed.data.name) {
        const existingAlias = await tx.query.franchiseAliases.findFirst({
          where: and(
            eq(franchiseAliases.franchiseId, existing.id),
            eq(franchiseAliases.name, existing.name),
            eq(franchiseAliases.effectiveToSeason, viewer.season!.year - 1),
          ),
        });
        if (!existingAlias) {
          await tx.insert(franchiseAliases).values({
            franchiseId: existing.id,
            name: existing.name,
            abbreviation: existing.abbreviation,
            effectiveToSeason: viewer.season!.year - 1,
            source: managesLeague ? "commissioner" : "owner",
          });
        }
      }
      await tx
        .update(franchises)
        .set({ name: parsed.data.name, abbreviation, updatedAt: now })
        .where(eq(franchises.id, existing.id));
      await tx
        .insert(franchiseBranding)
        .values({
          franchiseId: existing.id,
          primaryColor: parsed.data.primaryColor,
          secondaryColor: parsed.data.secondaryColor,
          logoUrl: parsed.data.logoUrl || null,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: franchiseBranding.franchiseId,
          set: {
            primaryColor: parsed.data.primaryColor,
            secondaryColor: parsed.data.secondaryColor,
            logoUrl: parsed.data.logoUrl || null,
            updatedAt: now,
          },
        });
      await tx.insert(auditLogs).values({
        leagueId: viewer.league!.id,
        actorId: viewer.user!.id,
        action: "franchise.identity.updated",
        entityType: "franchise",
        entityId: existing.id,
        entityName: parsed.data.name,
        before: {
          name: existing.name,
          abbreviation: existing.abbreviation,
          primaryColor: existingBranding?.primaryColor ?? null,
          secondaryColor: existingBranding?.secondaryColor ?? null,
          logoUrl: existingBranding?.logoUrl ?? null,
        },
        after: {
          name: parsed.data.name,
          abbreviation,
          primaryColor: parsed.data.primaryColor,
          secondaryColor: parsed.data.secondaryColor,
          logoUrl: parsed.data.logoUrl || null,
          updatedBy: managesLeague ? "commissioner" : "owner",
        },
        source: "football",
        correlationId: crypto.randomUUID(),
      });
    });
  } catch (error) {
    console.error("Franchise identity update failed.", error);
    return {
      status: "error",
      message:
        "Franchise identity could not be saved. Review duplicate values and retry.",
    };
  }
  revalidatePath("/commissioner/owners");
  revalidatePath(`/franchises/${existing.slug}`);
  revalidatePath(`/franchises/${existing.slug}/settings`);
  return { status: "success", message: `${parsed.data.name} was updated.` };
}

export async function revokeOwnerInvitation(
  formData: FormData,
): Promise<OwnerAdminActionState> {
  const viewer = await requirePermission("manage_owners");
  if (!viewer.user || !viewer.league || !process.env.DATABASE_URL) {
    return ownerActionError("A production database session is required.");
  }
  const parsed = z.string().uuid().safeParse(formData.get("invitationId"));
  if (!parsed.success) return ownerActionError("Invalid owner invitation.");
  const db = getDb();
  const invitation = await db.query.ownerInvitations.findFirst({
    where: and(
      eq(ownerInvitations.id, parsed.data),
      eq(ownerInvitations.leagueId, viewer.league.id),
      isNull(ownerInvitations.acceptedAt),
      isNull(ownerInvitations.revokedAt),
    ),
  });
  if (!invitation) {
    return ownerActionError(
      "This invitation was already accepted, revoked, or removed.",
    );
  }
  const revokedAt = new Date();
  try {
    const revoked = await db.transaction(async (tx) => {
      const [updated] = await tx
        .update(ownerInvitations)
        .set({ revokedAt, updatedAt: revokedAt })
        .where(
          and(
            eq(ownerInvitations.id, invitation.id),
            isNull(ownerInvitations.acceptedAt),
            isNull(ownerInvitations.revokedAt),
          ),
        )
        .returning({ id: ownerInvitations.id });
      if (!updated) return false;
      await tx.insert(auditLogs).values({
        leagueId: viewer.league!.id,
        actorId: viewer.user!.id,
        action: "owner.invitation.revoked",
        entityType: "owner_invitation",
        entityId: invitation.id,
        entityName: invitation.email,
        before: { revokedAt: null },
        after: { revokedAt },
        source: "football",
        correlationId: crypto.randomUUID(),
      });
      return true;
    });
    if (!revoked) {
      return ownerActionError(
        "This invitation changed before it could be revoked. Refresh and retry.",
      );
    }
  } catch (error) {
    console.error("Owner invitation revocation failed.", error);
    return ownerActionError("Invitation could not be revoked. Retry.");
  }
  revalidatePath("/commissioner/owners");
  return ownerActionSuccess(`Invitation for ${invitation.email} revoked.`);
}

type OwnerTransaction = Parameters<
  Parameters<ReturnType<typeof getDb>["transaction"]>[0]
>[0];

async function lockLeagueMemberships(tx: OwnerTransaction, leagueId: string) {
  await tx.execute(sql`
    select id from league_memberships
    where league_id = ${leagueId}
    for update
  `);
}

async function lockFranchise(tx: OwnerTransaction, franchiseId: string) {
  await tx.execute(sql`
    select id from franchises
    where id = ${franchiseId}
    for update
  `);
}

async function countActiveCommissioners(
  tx: OwnerTransaction,
  leagueId: string,
) {
  const [result] = await tx
    .select({ count: sql<number>`count(*)::int` })
    .from(leagueMemberships)
    .where(
      and(
        eq(leagueMemberships.leagueId, leagueId),
        eq(leagueMemberships.role, "commissioner"),
        eq(leagueMemberships.active, true),
      ),
    );
  return result?.count ?? 0;
}

function ownerActionError(message: string): OwnerAdminActionState {
  return { status: "error", message };
}

function ownerActionSuccess(message: string): OwnerAdminActionState {
  return { status: "success", message };
}
