import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import * as schema from "@/db/schema";
import type { ViewerContext } from "@/auth/permissions";

const testState = vi.hoisted(() => ({
  db: undefined as unknown,
  viewer: undefined as unknown as ViewerContext,
}));
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/db/client", () => ({ getDb: () => testState.db }));
vi.mock("@/auth/permissions", () => ({
  currentViewer: async () => testState.viewer,
  requirePermission: async () => testState.viewer,
}));

import {
  setFranchiseMembershipStatus,
  setLeagueMembershipRole,
  setLeagueMembershipStatus,
  updateFranchiseIdentity,
} from "@/app/commissioner/owners/actions";

describe.sequential("owner administration actions", () => {
  let pg: PGlite;
  let db: ReturnType<typeof drizzle<typeof schema>>;
  const leagueId = crypto.randomUUID();
  const seasonId = crypto.randomUUID();
  const franchiseId = crypto.randomUUID();
  const commissionerId = crypto.randomUUID();
  const commissionerLeagueMembershipId = crypto.randomUUID();
  const platformAdminId = crypto.randomUUID();
  const platformAdminMembershipId = crypto.randomUUID();
  const ownerId = crypto.randomUUID();
  const ownerLeagueMembershipId = crypto.randomUUID();
  const ownerFranchiseMembershipId = crypto.randomUUID();
  const otherLeagueId = crypto.randomUUID();
  const otherSeasonId = crypto.randomUUID();
  const otherFranchiseId = crypto.randomUUID();
  const otherFranchiseMembershipId = crypto.randomUUID();
  const previousDatabaseUrl = process.env.DATABASE_URL;

  beforeAll(async () => {
    process.env.DATABASE_URL = "postgres://embedded/owner-actions";
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
    testState.db = db;
    testState.viewer = {
      authenticated: true,
      user: {
        id: commissionerId,
        email: "commissioner@example.com",
        name: "Commissioner",
      },
      role: "commissioner",
      league: {
        id: leagueId,
        slug: "owner-actions",
        name: "Owner Actions League",
        timezone: "America/Chicago",
      },
      season: { id: seasonId, year: 2026, status: "preseason" },
      franchises: [],
      activeFranchise: null,
      source: "better-auth",
    };
    await pg.exec(`
      insert into users (id, email, name, email_verified)
      values
        ('${commissionerId}', 'commissioner@example.com', 'Commissioner', true),
        ('${platformAdminId}', 'platform@example.com', 'Platform Admin', true),
        ('${ownerId}', 'owner@example.com', 'Owner', true);
      update users set platform_role = 'system_administrator'
      where id = '${platformAdminId}';
      insert into leagues (id, name, slug, timezone)
      values
        ('${leagueId}', 'Owner Actions League', 'owner-actions', 'America/Chicago'),
        ('${otherLeagueId}', 'Other League', 'other-league', 'America/Chicago');
      insert into league_seasons (id, league_id, year, status, salary_cap)
      values
        ('${seasonId}', '${leagueId}', 2026, 'preseason', 1000.00),
        ('${otherSeasonId}', '${otherLeagueId}', 2026, 'preseason', 1000.00);
      insert into franchises (id, league_id, name, slug, abbreviation)
      values
        ('${franchiseId}', '${leagueId}', 'Test Team', 'test-team', 'TST'),
        ('${otherFranchiseId}', '${otherLeagueId}', 'Other Team', 'other-team', 'OTH');
      insert into league_memberships (id, user_id, league_id, role, active)
      values
        ('${commissionerLeagueMembershipId}', '${commissionerId}', '${leagueId}', 'commissioner', true),
        ('${platformAdminMembershipId}', '${platformAdminId}', '${leagueId}', 'system_administrator', true),
        ('${ownerLeagueMembershipId}', '${ownerId}', '${leagueId}', 'owner', true),
        (gen_random_uuid(), '${ownerId}', '${otherLeagueId}', 'owner', true);
      insert into franchise_memberships (
        id, user_id, franchise_id, league_season_id, role, active, is_primary
      ) values
        ('${ownerFranchiseMembershipId}', '${ownerId}', '${franchiseId}', '${seasonId}', 'owner', true, true),
        ('${otherFranchiseMembershipId}', '${ownerId}', '${otherFranchiseId}', '${otherSeasonId}', 'owner', true, true);
    `);
  }, 30_000);

  afterAll(async () => {
    if (previousDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previousDatabaseUrl;
    await pg.close();
  });

  it("revokes league and current-season franchise access without crossing leagues", async () => {
    await setLeagueMembershipStatus(
      form({ membershipId: ownerLeagueMembershipId, active: "false" }),
    );
    const leagueMembership = await db.query.leagueMemberships.findFirst({
      where: (table, { eq }) => eq(table.id, ownerLeagueMembershipId),
    });
    const franchiseMembership = await db.query.franchiseMemberships.findFirst({
      where: (table, { eq }) => eq(table.id, ownerFranchiseMembershipId),
    });
    const otherMembership = await db.query.franchiseMemberships.findFirst({
      where: (table, { eq }) => eq(table.id, otherFranchiseMembershipId),
    });
    expect(leagueMembership?.active).toBe(false);
    expect(franchiseMembership).toMatchObject({
      active: false,
      isPrimary: false,
    });
    expect(otherMembership).toMatchObject({ active: true, isPrimary: true });
  });

  it("restoring franchise access also restores the existing league account", async () => {
    await setFranchiseMembershipStatus(
      form({ membershipId: ownerFranchiseMembershipId, active: "true" }),
    );
    await expect(
      db.query.leagueMemberships.findFirst({
        where: (table, { eq }) => eq(table.id, ownerLeagueMembershipId),
      }),
    ).resolves.toMatchObject({ active: true, role: "owner" });
    await expect(
      db.query.franchiseMemberships.findFirst({
        where: (table, { eq }) => eq(table.id, ownerFranchiseMembershipId),
      }),
    ).resolves.toMatchObject({ active: true, isPrimary: true });
  });

  it("changes league roles with an audit record", async () => {
    const result = await setLeagueMembershipRole(
      form({
        membershipId: ownerLeagueMembershipId,
        role: "assistant_commissioner",
      }),
    );
    expect(result).toMatchObject({ status: "success" });
    await expect(
      db.query.leagueMemberships.findFirst({
        where: (table, { eq }) => eq(table.id, ownerLeagueMembershipId),
      }),
    ).resolves.toMatchObject({ role: "assistant_commissioner" });
    await expect(
      db.query.auditLogs.findFirst({
        where: (table, { and, eq }) =>
          and(
            eq(table.entityId, ownerLeagueMembershipId),
            eq(table.action, "league.membership.role_changed"),
          ),
      }),
    ).resolves.toBeDefined();
  });

  it("returns explicit errors for last-commissioner and platform-role safeguards", async () => {
    testState.viewer = {
      ...testState.viewer,
      user: {
        id: platformAdminId,
        email: "platform@example.com",
        name: "Platform Admin",
      },
      role: "system_administrator",
    };
    const lastCommissioner = await setLeagueMembershipRole(
      form({
        membershipId: commissionerLeagueMembershipId,
        role: "owner",
      }),
    );
    expect(lastCommissioner).toMatchObject({
      status: "error",
      message: expect.stringContaining("last commissioner"),
    });
    const platformRole = await setLeagueMembershipStatus(
      form({ membershipId: platformAdminMembershipId, active: "false" }),
    );
    expect(platformRole).toMatchObject({
      status: "error",
      message: expect.stringContaining("platform level"),
    });
    await expect(
      db.query.leagueMemberships.findFirst({
        where: (table, { eq }) => eq(table.id, commissionerLeagueMembershipId),
      }),
    ).resolves.toMatchObject({ role: "commissioner", active: true });
    testState.viewer = {
      ...testState.viewer,
      user: {
        id: commissionerId,
        email: "commissioner@example.com",
        name: "Commissioner",
      },
      role: "commissioner",
    };
  });

  it("records a former identity when a commissioner renames a franchise", async () => {
    const result = await updateFranchiseIdentity(
      { status: "idle" },
      form({
        franchiseId,
        name: "Renamed Team",
        abbreviation: "RNT",
        primaryColor: "#123456",
        secondaryColor: "#abcdef",
        logoUrl: "https://example.com/team.png",
      }),
    );
    expect(result.status).toBe("success");
    await expect(
      db.query.franchises.findFirst({
        where: (table, { eq }) => eq(table.id, franchiseId),
      }),
    ).resolves.toMatchObject({ name: "Renamed Team", abbreviation: "RNT" });
    await expect(
      db.query.franchiseAliases.findFirst({
        where: (table, { eq }) => eq(table.franchiseId, franchiseId),
      }),
    ).resolves.toMatchObject({
      name: "Test Team",
      abbreviation: "TST",
      effectiveToSeason: 2025,
      source: "commissioner",
    });
  });

  it("lets an owner update only a currently assigned franchise", async () => {
    testState.viewer = {
      ...testState.viewer,
      user: { id: ownerId, email: "owner@example.com", name: "Owner" },
      role: "owner",
      franchises: [
        {
          id: franchiseId,
          slug: "test-team",
          name: "Renamed Team",
          abbreviation: "RNT",
          role: "owner",
          isPrimary: true,
        },
      ],
    };
    const result = await updateFranchiseIdentity(
      { status: "idle" },
      form({
        franchiseId,
        name: "Owner Chosen Team",
        abbreviation: "OCT",
        primaryColor: "#654321",
        secondaryColor: "#fedcba",
        logoUrl: "https://example.com/owner-team.png",
      }),
    );
    expect(result.status).toBe("success");
    await expect(
      db.query.franchises.findFirst({
        where: (table, { eq }) => eq(table.id, franchiseId),
      }),
    ).resolves.toMatchObject({
      name: "Owner Chosen Team",
      abbreviation: "OCT",
    });
    await expect(
      db.query.franchiseAliases.findFirst({
        where: (table, { and, eq }) =>
          and(
            eq(table.franchiseId, franchiseId),
            eq(table.name, "Renamed Team"),
          ),
      }),
    ).resolves.toMatchObject({ source: "owner" });

    const denied = await updateFranchiseIdentity(
      { status: "idle" },
      form({
        franchiseId: otherFranchiseId,
        name: "Unauthorized Rename",
        abbreviation: "BAD",
        primaryColor: "#000000",
        secondaryColor: "#ffffff",
        logoUrl: "",
      }),
    );
    expect(denied).toMatchObject({ status: "error" });
    await expect(
      db.query.franchises.findFirst({
        where: (table, { eq }) => eq(table.id, otherFranchiseId),
      }),
    ).resolves.toMatchObject({ name: "Other Team", abbreviation: "OTH" });
  });
});

function form(values: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}
