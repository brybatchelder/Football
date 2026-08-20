import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import * as schema from "@/db/schema";

const databaseState = vi.hoisted(() => ({ db: undefined as unknown }));
vi.mock("server-only", () => ({}));
vi.mock("@/db/client", () => ({ getDb: () => databaseState.db }));

import { acceptInvitation } from "@/auth/invitations";

describe.sequential("owner invitation acceptance", () => {
  let pg: PGlite;
  let db: ReturnType<typeof drizzle<typeof schema>>;

  beforeAll(async () => {
    pg = await PGlite.create();
    const migrationDirectory = path.resolve(process.cwd(), "drizzle");
    const migrationFiles = (await readdir(migrationDirectory))
      .filter((file) => /^\d{4}_.+\.sql$/.test(file))
      .sort();
    for (const migrationFile of migrationFiles) {
      await pg.exec(
        await readFile(path.join(migrationDirectory, migrationFile), "utf8"),
      );
    }
    db = drizzle(pg, { schema });
    databaseState.db = db;
  }, 30_000);

  afterAll(async () => {
    await pg.close();
  });

  it("atomically accepts membership and transfers primary ownership", async () => {
    const context = await seedInvitationContext(pg, "accepted");
    await pg.exec(`
      insert into franchise_memberships (
        user_id, franchise_id, league_season_id, role, active, is_primary
      ) values (
        '${context.existingOwnerId}', '${context.franchiseId}', '${context.seasonId}',
        'owner', true, true
      );
    `);

    await acceptInvitation(context.invitationId, context.invitedUserId);

    const invitation = await db.query.ownerInvitations.findFirst({
      where: (table, { eq }) => eq(table.id, context.invitationId),
    });
    const membership = await db.query.franchiseMemberships.findFirst({
      where: (table, { and, eq }) =>
        and(
          eq(table.userId, context.invitedUserId),
          eq(table.franchiseId, context.franchiseId),
          eq(table.leagueSeasonId, context.seasonId),
        ),
    });
    const priorMembership = await db.query.franchiseMemberships.findFirst({
      where: (table, { and, eq }) =>
        and(
          eq(table.userId, context.existingOwnerId),
          eq(table.franchiseId, context.franchiseId),
          eq(table.leagueSeasonId, context.seasonId),
        ),
    });
    const audit = await db.query.auditLogs.findFirst({
      where: (table, { and, eq }) =>
        and(
          eq(table.action, "owner.invitation.accepted"),
          eq(table.actorId, context.invitedUserId),
        ),
    });

    expect(invitation?.acceptedByUserId).toBe(context.invitedUserId);
    expect(invitation?.acceptedAt).toBeInstanceOf(Date);
    expect(membership).toMatchObject({ active: true, isPrimary: true });
    expect(priorMembership).toMatchObject({ active: true, isPrimary: false });
    expect(audit?.leagueId).toBe(context.leagueId);
  });

  it("rejects an accepting account whose email does not match", async () => {
    const context = await seedInvitationContext(pg, "wrong-email");
    await expect(
      acceptInvitation(context.invitationId, context.existingOwnerId),
    ).rejects.toThrow("does not match");

    const invitation = await db.query.ownerInvitations.findFirst({
      where: (table, { eq }) => eq(table.id, context.invitationId),
    });
    expect(invitation?.acceptedAt).toBeNull();
  });

  it("allows only one winner when acceptance is replayed concurrently", async () => {
    const context = await seedInvitationContext(pg, "concurrent");
    const outcomes = await Promise.allSettled([
      acceptInvitation(context.invitationId, context.invitedUserId),
      acceptInvitation(context.invitationId, context.invitedUserId),
    ]);

    expect(
      outcomes.filter((outcome) => outcome.status === "fulfilled"),
    ).toHaveLength(1);
    expect(
      outcomes.filter((outcome) => outcome.status === "rejected"),
    ).toHaveLength(1);
    const audits = await db.query.auditLogs.findMany({
      where: (table, { and, eq }) =>
        and(
          eq(table.action, "owner.invitation.accepted"),
          eq(table.entityId, context.franchiseId),
        ),
    });
    expect(audits).toHaveLength(1);
  });

  it("rejects a franchise that belongs to another league", async () => {
    const context = await seedInvitationContext(pg, "cross-league");
    const otherLeagueId = crypto.randomUUID();
    const otherFranchiseId = crypto.randomUUID();
    await pg.exec(`
      insert into leagues (id, name, slug, timezone)
      values ('${otherLeagueId}', 'Other League', 'other-${context.slug}', 'America/Chicago');
      insert into franchises (id, league_id, name, slug, abbreviation)
      values ('${otherFranchiseId}', '${otherLeagueId}', 'Foreign Team', 'foreign-${context.slug}', 'X${context.slug.slice(0, 3)}');
      update owner_invitations
      set franchise_id = '${otherFranchiseId}'
      where id = '${context.invitationId}';
    `);

    await expect(
      acceptInvitation(context.invitationId, context.invitedUserId),
    ).rejects.toThrow("does not belong");
    const leagueMembership = await db.query.leagueMemberships.findFirst({
      where: (table, { and, eq }) =>
        and(
          eq(table.userId, context.invitedUserId),
          eq(table.leagueId, context.leagueId),
        ),
    });
    expect(leagueMembership).toBeUndefined();
  });
});

async function seedInvitationContext(pg: PGlite, slug: string) {
  const leagueId = crypto.randomUUID();
  const seasonId = crypto.randomUUID();
  const franchiseId = crypto.randomUUID();
  const inviterId = crypto.randomUUID();
  const invitedUserId = crypto.randomUUID();
  const existingOwnerId = crypto.randomUUID();
  const invitationId = crypto.randomUUID();
  await pg.exec(`
    insert into users (id, email, name, email_verified)
    values
      ('${inviterId}', 'commissioner-${slug}@example.com', 'Commissioner', true),
      ('${invitedUserId}', 'owner-${slug}@example.com', 'Invited Owner', true),
      ('${existingOwnerId}', 'existing-${slug}@example.com', 'Existing Owner', true);
    insert into leagues (id, name, slug, timezone)
    values ('${leagueId}', 'League ${slug}', 'league-${slug}', 'America/Chicago');
    insert into league_seasons (id, league_id, year, status, salary_cap)
    values ('${seasonId}', '${leagueId}', 2026, 'preseason', 1000.00);
    insert into franchises (id, league_id, name, slug, abbreviation)
    values ('${franchiseId}', '${leagueId}', 'Team ${slug}', 'team-${slug}', '${slug.slice(0, 6).toUpperCase()}');
    insert into owner_invitations (
      id, league_id, league_season_id, franchise_id, email, role,
      token_hash, expires_at, invited_by_user_id
    ) values (
      '${invitationId}', '${leagueId}', '${seasonId}', '${franchiseId}',
      'owner-${slug}@example.com', 'owner', '${crypto.randomUUID()}',
      now() + interval '7 days', '${inviterId}'
    );
  `);
  return {
    leagueId,
    seasonId,
    franchiseId,
    invitedUserId,
    existingOwnerId,
    invitationId,
    slug,
  };
}
