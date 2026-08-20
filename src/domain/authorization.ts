import type { AppRole } from "@/domain/types";

const roleRank: Record<AppRole, number> = {
  visitor: 0,
  owner: 1,
  assistant_commissioner: 2,
  commissioner: 3,
  system_administrator: 4,
};

export function highestRole(roles: Array<AppRole | null | undefined>): AppRole {
  return roles.reduce<AppRole>(
    (highest, role) =>
      role && roleRank[role] > roleRank[highest] ? role : highest,
    "visitor",
  );
}

/**
 * Platform authority, league authority, and franchise ownership are separate
 * scopes. Legacy rows must never turn a platform-level commissioner value or a
 * franchise membership role into cross-league commissioner access.
 */
export function resolveEffectiveRole(input: {
  platformRole: AppRole | null | undefined;
  leagueRole: AppRole | null | undefined;
  hasFranchiseMembership: boolean;
}): AppRole {
  const platformRole =
    input.platformRole === "system_administrator"
      ? "system_administrator"
      : "visitor";
  const leagueRole = [
    "owner",
    "assistant_commissioner",
    "commissioner",
  ].includes(input.leagueRole ?? "")
    ? input.leagueRole
    : "visitor";
  return highestRole([
    platformRole,
    leagueRole,
    input.hasFranchiseMembership ? "owner" : "visitor",
  ]);
}

export function selectActiveFranchise<
  T extends { slug: string; isPrimary: boolean },
>(franchises: T[], requestedSlug?: string) {
  return (
    franchises.find((franchise) => franchise.slug === requestedSlug) ??
    franchises.find((franchise) => franchise.isPrimary) ??
    franchises[0] ??
    null
  );
}
