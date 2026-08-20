import "server-only";

import { and, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { auditLogs, leagueMemberships, leagues, users } from "@/db/schema";

export function isBootstrapCommissionerEmail(email: string) {
  const configured = process.env.AUTH_BOOTSTRAP_COMMISSIONER_EMAIL;
  return Boolean(
    configured &&
    configured.trim().toLowerCase() === email.trim().toLowerCase(),
  );
}

export async function canBootstrapCommissioner(email: string) {
  if (!isBootstrapCommissionerEmail(email)) return false;
  const db = getDb();
  const slug = process.env.FOFL_LEAGUE_SLUG ?? "fofl";
  const league = await db.query.leagues.findFirst({
    where: eq(leagues.slug, slug),
  });
  if (!league) {
    throw new Error(
      `Cannot bootstrap commissioner: league ${slug} does not exist. Run the MFL sync first.`,
    );
  }
  const existingCommissioner = await db.query.leagueMemberships.findFirst({
    where: and(
      eq(leagueMemberships.leagueId, league.id),
      eq(leagueMemberships.active, true),
      inArray(leagueMemberships.role, ["commissioner", "system_administrator"]),
    ),
    columns: { id: true },
  });
  return !existingCommissioner;
}

export async function bootstrapAccountExists(email: string) {
  if (!isBootstrapCommissionerEmail(email)) return false;
  const account = await getDb().query.users.findFirst({
    where: eq(users.email, email.trim().toLowerCase()),
    columns: { id: true },
  });
  return Boolean(account);
}

export async function grantBootstrapCommissioner(
  userId: string,
  email: string,
) {
  if (!isBootstrapCommissionerEmail(email)) return false;
  const db = getDb();
  const slug = process.env.FOFL_LEAGUE_SLUG ?? "fofl";
  const league = await db.query.leagues.findFirst({
    where: eq(leagues.slug, slug),
  });
  if (!league) {
    throw new Error(
      `Cannot bootstrap commissioner: league ${slug} does not exist. Run the MFL sync first.`,
    );
  }

  return db.transaction(async (tx) => {
    await tx.execute(sql`
      select id from leagues
      where id = ${league.id}
      for update
    `);
    const existingCommissioner = await tx.query.leagueMemberships.findFirst({
      where: and(
        eq(leagueMemberships.leagueId, league.id),
        eq(leagueMemberships.active, true),
        inArray(leagueMemberships.role, [
          "commissioner",
          "system_administrator",
        ]),
      ),
    });
    if (existingCommissioner?.userId === userId) return true;
    if (existingCommissioner) {
      throw new Error("The first commissioner has already been created.");
    }
    await tx
      .insert(leagueMemberships)
      .values({
        userId,
        leagueId: league.id,
        role: "commissioner",
        active: true,
      })
      .onConflictDoUpdate({
        target: [leagueMemberships.userId, leagueMemberships.leagueId],
        set: { role: "commissioner", active: true, updatedAt: new Date() },
      });
    await tx.insert(auditLogs).values({
      leagueId: league.id,
      actorId: userId,
      action: "commissioner.bootstrap.created",
      entityType: "league_membership",
      entityId: league.id,
      entityName: email.trim().toLowerCase(),
      after: { role: "commissioner", bootstrap: true },
      source: "football",
      correlationId: crypto.randomUUID(),
    });
    return true;
  });
}
