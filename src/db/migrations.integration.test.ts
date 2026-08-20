import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const ids = {
  league: "11111111-1111-4111-8111-111111111111",
  season: "22222222-2222-4222-8222-222222222222",
  franchise: "33333333-3333-4333-8333-333333333333",
  secondFranchise: "44444444-4444-4444-8444-444444444444",
  user: "55555555-5555-4555-8555-555555555555",
  secondUser: "66666666-6666-4666-8666-666666666666",
  invitation: "77777777-7777-4777-8777-777777777777",
  secondInvitation: "88888888-8888-4888-8888-888888888888",
};

describe.sequential("PostgreSQL migration chain", () => {
  let db: PGlite;

  beforeAll(async () => {
    db = await PGlite.create();
    const migrationDirectory = path.resolve(process.cwd(), "drizzle");
    const migrationFiles = (await readdir(migrationDirectory))
      .filter((file) => /^\d{4}_.+\.sql$/.test(file))
      .sort();
    for (const migrationFile of migrationFiles) {
      await db.exec(
        await readFile(path.join(migrationDirectory, migrationFile), "utf8"),
      );
    }
  }, 30_000);

  afterAll(async () => {
    await db.close();
  });

  it("applies every migration and creates the authorization indexes", async () => {
    const indexes = await db.query<{ indexname: string }>(
      `select indexname from pg_indexes where schemaname = 'public'`,
    );
    const names = indexes.rows.map((row) => row.indexname);
    expect(names).toContain("franchise_membership_primary_active");
    expect(names).toContain("owner_invitation_pending_franchise");
    expect(names).toContain("owner_invitation_pending_league");
    expect(names).toContain("franchise_league_abbreviation");
    expect(names).toContain("provider_franchise_external");
    expect(names).toContain("sessions_expires_at");
    expect(names).toContain("auth_verifications_expires_at");
    expect(names).toContain("auth_rate_limits_last_request");
  });

  it("enforces franchise abbreviation uniqueness within a league", async () => {
    await seedAuthorizationContext(db);
    await expect(
      db.exec(`
        insert into franchises (id, league_id, name, slug, abbreviation)
        values ('${ids.secondFranchise}', '${ids.league}', 'Other Team', 'other-team', 'TEST')
      `),
    ).rejects.toThrow();
  });

  it("allows only one pending invitation for the same franchise and email", async () => {
    await db.exec(`
      insert into owner_invitations (
        id, league_id, league_season_id, franchise_id, email, role,
        token_hash, expires_at, invited_by_user_id
      ) values (
        '${ids.invitation}', '${ids.league}', '${ids.season}', '${ids.franchise}',
        'owner@example.com', 'owner', 'first-token', now() + interval '7 days', '${ids.user}'
      )
    `);
    await expect(
      db.exec(`
        insert into owner_invitations (
          id, league_id, league_season_id, franchise_id, email, role,
          token_hash, expires_at, invited_by_user_id
        ) values (
          '${ids.secondInvitation}', '${ids.league}', '${ids.season}', '${ids.franchise}',
          'owner@example.com', 'owner', 'second-token', now() + interval '7 days', '${ids.user}'
        )
      `),
    ).rejects.toThrow();

    await db.exec(`
      update owner_invitations set revoked_at = now() where id = '${ids.invitation}';
      insert into owner_invitations (
        id, league_id, league_season_id, franchise_id, email, role,
        token_hash, expires_at, invited_by_user_id
      ) values (
        '${ids.secondInvitation}', '${ids.league}', '${ids.season}', '${ids.franchise}',
        'owner@example.com', 'owner', 'second-token', now() + interval '7 days', '${ids.user}'
      );
    `);
  });

  it("allows only one active primary owner per franchise and season", async () => {
    await db.exec(`
      insert into franchise_memberships (
        user_id, franchise_id, league_season_id, role, active, is_primary
      ) values (
        '${ids.user}', '${ids.franchise}', '${ids.season}', 'owner', true, true
      )
    `);
    await expect(
      db.exec(`
        insert into franchise_memberships (
          user_id, franchise_id, league_season_id, role, active, is_primary
        ) values (
          '${ids.secondUser}', '${ids.franchise}', '${ids.season}', 'owner', true, true
        )
      `),
    ).rejects.toThrow();

    await db.exec(`
      insert into franchise_memberships (
        user_id, franchise_id, league_season_id, role, active, is_primary
      ) values (
        '${ids.secondUser}', '${ids.franchise}', '${ids.season}', 'owner', false, true
      );
      update franchise_memberships set active = false where user_id = '${ids.user}';
      update franchise_memberships set active = true where user_id = '${ids.secondUser}';
    `);
  });

  it("keeps each external franchise identity mapped to one internal franchise", async () => {
    await db.exec(`
      insert into provider_franchise_ids (franchise_id, provider, external_id)
      values ('${ids.franchise}', 'mfl:22632', '0001')
    `);
    await expect(
      db.exec(`
        insert into provider_franchise_ids (franchise_id, provider, external_id)
        values ('${ids.franchise}', 'mfl:22632', '0001')
      `),
    ).rejects.toThrow();
  });
});

async function seedAuthorizationContext(db: PGlite) {
  await db.exec(`
    insert into users (id, email, name, email_verified)
    values
      ('${ids.user}', 'commissioner@example.com', 'Commissioner', true),
      ('${ids.secondUser}', 'second@example.com', 'Second Owner', true);
    insert into leagues (id, name, slug, timezone)
    values ('${ids.league}', 'Test League', 'test-league', 'America/Chicago');
    insert into league_seasons (id, league_id, year, status, salary_cap)
    values ('${ids.season}', '${ids.league}', 2026, 'preseason', 1000.00);
    insert into franchises (id, league_id, name, slug, abbreviation)
    values ('${ids.franchise}', '${ids.league}', 'Test Team', 'test-team', 'TEST');
  `);
}
