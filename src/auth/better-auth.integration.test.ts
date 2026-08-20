import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import * as schema from "@/db/schema";

const databaseState = vi.hoisted(() => ({ db: undefined as unknown }));
vi.mock("server-only", () => ({}));
vi.mock("@/db/client", () => ({ getDb: () => databaseState.db }));

import { getAuth } from "@/auth/better-auth";
import { hashInvitationToken } from "@/auth/invitations";

describe.sequential("Better Auth onboarding", () => {
  let pg: PGlite;
  let db: ReturnType<typeof drizzle<typeof schema>>;
  const leagueId = crypto.randomUUID();
  const seasonId = crypto.randomUUID();
  const franchiseId = crypto.randomUUID();
  const bootstrapEmail = "first-commissioner@example.com";

  beforeAll(async () => {
    process.env.BETTER_AUTH_SECRET =
      "integration-test-secret-at-least-32-characters";
    process.env.BETTER_AUTH_URL = "http://localhost:3000";
    process.env.BETTER_AUTH_TRUSTED_ORIGINS = "http://localhost:3000";
    process.env.AUTH_BOOTSTRAP_COMMISSIONER_EMAIL = bootstrapEmail;
    process.env.FOFL_LEAGUE_SLUG = "auth-integration";

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
    await pg.exec(`
      insert into leagues (id, name, slug, timezone)
      values ('${leagueId}', 'Auth Integration League', 'auth-integration', 'America/Chicago');
      insert into league_seasons (id, league_id, year, status, salary_cap)
      values ('${seasonId}', '${leagueId}', 2026, 'preseason', 1000.00);
      insert into franchises (id, league_id, name, slug, abbreviation)
      values ('${franchiseId}', '${leagueId}', 'Integration Team', 'integration-team', 'INT');
    `);
  }, 30_000);

  afterAll(async () => {
    delete process.env.AUTH_BOOTSTRAP_COMMISSIONER_EMAIL;
    await pg.close();
  });

  it("creates only the configured bootstrap commissioner and audits the grant", async () => {
    const result = await getAuth().api.signUpEmail({
      body: {
        email: bootstrapEmail,
        name: "First Commissioner",
        password: "strong-integration-password",
      },
    });
    const membership = await db.query.leagueMemberships.findFirst({
      where: (table, { and, eq }) =>
        and(eq(table.userId, result.user.id), eq(table.leagueId, leagueId)),
    });
    const audit = await db.query.auditLogs.findFirst({
      where: (table, { and, eq }) =>
        and(
          eq(table.actorId, result.user.id),
          eq(table.action, "commissioner.bootstrap.created"),
        ),
    });
    expect(membership).toMatchObject({ role: "commissioner", active: true });
    expect(audit?.leagueId).toBe(leagueId);

    await expect(
      getAuth().api.signUpEmail({
        body: {
          email: "uninvited@example.com",
          name: "Uninvited User",
          password: "strong-integration-password",
        },
      }),
    ).rejects.toThrow();

    process.env.AUTH_BOOTSTRAP_COMMISSIONER_EMAIL =
      "second-bootstrap@example.com";
    await expect(
      getAuth().api.signUpEmail({
        body: {
          email: "second-bootstrap@example.com",
          name: "Second Bootstrap",
          password: "strong-integration-password",
        },
      }),
    ).rejects.toThrow();
    const secondBootstrap = await db.query.users.findFirst({
      where: (table, { eq }) => eq(table.email, "second-bootstrap@example.com"),
    });
    expect(secondBootstrap).toBeUndefined();
    process.env.AUTH_BOOTSTRAP_COMMISSIONER_EMAIL = bootstrapEmail;
  });

  it("accepts an exact-email owner invitation during registration", async () => {
    const commissioner = await db.query.users.findFirst({
      where: (table, { eq }) => eq(table.email, bootstrapEmail),
    });
    if (!commissioner)
      throw new Error("Bootstrap commissioner was not created");
    const token = "integration-owner-token";
    const invitationId = crypto.randomUUID();
    await pg.exec(`
      insert into owner_invitations (
        id, league_id, league_season_id, franchise_id, email, role,
        token_hash, expires_at, invited_by_user_id
      ) values (
        '${invitationId}', '${leagueId}', '${seasonId}', '${franchiseId}',
        'invited-owner@example.com', 'owner', '${hashInvitationToken(token)}',
        now() + interval '7 days', '${commissioner.id}'
      );
    `);

    const response = await getAuth().handler(
      new Request("http://localhost:3000/api/auth/sign-up/email", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-fofl-invitation": token,
        },
        body: JSON.stringify({
          email: "invited-owner@example.com",
          name: "Invited Owner",
          password: "another-strong-integration-password",
        }),
      }),
    );
    expect(response.status).toBe(200);
    const result = (await response.json()) as {
      user: { id: string; emailVerified: boolean };
    };
    const membership = await db.query.franchiseMemberships.findFirst({
      where: (table, { and, eq }) =>
        and(
          eq(table.userId, result.user.id),
          eq(table.franchiseId, franchiseId),
          eq(table.leagueSeasonId, seasonId),
        ),
    });
    const invitation = await db.query.ownerInvitations.findFirst({
      where: (table, { eq }) => eq(table.id, invitationId),
    });
    expect(result.user.emailVerified).toBe(true);
    expect(membership).toMatchObject({ active: true, isPrimary: true });
    expect(invitation?.acceptedByUserId).toBe(result.user.id);
    const signIn = await getAuth().api.signInEmail({
      body: {
        email: "invited-owner@example.com",
        password: "another-strong-integration-password",
      },
    });
    expect(signIn.token).toBeTruthy();
    expect(signIn.user.id).toBe(result.user.id);
  });
});
