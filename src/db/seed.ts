import { getDb } from "./client";
import {
  divisions,
  franchiseMemberships,
  franchiseSeasons,
  franchises,
  leagueMemberships,
  leagueSeasons,
  leagues,
  salaryCapRules,
  users,
} from "./schema";
async function seed() {
  if (process.env.NODE_ENV === "production")
    throw new Error("Development seed is disabled in production");
  const db = getDb();
  const [league] = await db
    .insert(leagues)
    .values({
      name: "Front Office Football League",
      slug: "fofl",
      timezone: "America/Chicago",
      isDemo: true,
    })
    .onConflictDoUpdate({
      target: leagues.slug,
      set: { name: "Front Office Football League", updatedAt: new Date() },
    })
    .returning();
  if (!league) throw new Error("League seed failed");
  const [season] = await db
    .insert(leagueSeasons)
    .values({
      leagueId: league.id,
      year: 2026,
      status: "preseason",
      salaryCap: "1000.00",
      scoringPrecision: 2,
    })
    .onConflictDoNothing()
    .returning();
  const activeSeason =
    season ??
    (await db.query.leagueSeasons.findFirst({
      where: (t, { and, eq }) =>
        and(eq(t.leagueId, league.id), eq(t.year, 2026)),
    }));
  if (!activeSeason) throw new Error("Season seed failed");
  await db
    .insert(divisions)
    .values(
      ["North", "Central", "South"].map((name, i) => ({
        leagueSeasonId: activeSeason.id,
        name,
        sortOrder: i + 1,
      })),
    )
    .onConflictDoNothing();
  const names = [
    "Canton Legends",
    "Tampa Bay Storm",
    "Memphis Showboats",
    "New Orleans Thunder",
    "Seattle Rainiers",
    "New York Knights",
    "Barcelona Dragons",
    "Detroit Fury",
    "Oklahoma Outlaws",
    "Dallas Texans",
    "Houston Oilers",
    "Quad City Steamwheelers",
  ];
  await db
    .insert(franchises)
    .values(
      names.map((name, i) => ({
        leagueId: league.id,
        name,
        slug: name.toLowerCase().replaceAll(" ", "-"),
        abbreviation:
          i < 8
            ? name
                .split(" ")
                .map((w) => w[0])
                .join("")
                .slice(0, 3)
            : `D${i + 1}`,
      })),
    )
    .onConflictDoNothing();
  const seededFranchises = await db.query.franchises.findMany({
    where: (t, { eq }) => eq(t.leagueId, league.id),
  });
  const seededDivisions = await db.query.divisions.findMany({
    where: (t, { eq }) => eq(t.leagueSeasonId, activeSeason.id),
  });
  for (const [index, franchise] of seededFranchises.entries()) {
    await db
      .insert(franchiseSeasons)
      .values({
        franchiseId: franchise.id,
        leagueSeasonId: activeSeason.id,
        divisionId: seededDivisions[index % seededDivisions.length]?.id,
        active: true,
      })
      .onConflictDoNothing();
  }
  await db
    .insert(salaryCapRules)
    .values({
      leagueSeasonId: activeSeason.id,
      capAmount: "1000.00",
      irSalaryPercentage: "50",
      taxiSalaryPercentage: "100",
      contractYearCap: null,
    })
    .onConflictDoNothing();
  const [createdCommissioner] = await db
    .insert(users)
    .values({
      email: "commissioner@football.local",
      name: "Development Commissioner",
      emailVerified: true,
      platformRole: "visitor",
    })
    .onConflictDoUpdate({
      target: users.email,
      set: {
        name: "Development Commissioner",
        emailVerified: true,
        platformRole: "visitor",
        updatedAt: new Date(),
      },
    })
    .returning();
  const commissioner =
    createdCommissioner ??
    (await db.query.users.findFirst({
      where: (t, { eq }) => eq(t.email, "commissioner@football.local"),
    }));
  if (!commissioner) throw new Error("Commissioner seed failed");
  await db
    .insert(leagueMemberships)
    .values({
      userId: commissioner.id,
      leagueId: league.id,
      role: "commissioner",
      active: true,
    })
    .onConflictDoUpdate({
      target: [leagueMemberships.userId, leagueMemberships.leagueId],
      set: { role: "commissioner", active: true, updatedAt: new Date() },
    });
  const canton = seededFranchises.find(
    (franchise) => franchise.slug === "canton-legends",
  );
  if (canton) {
    await db
      .insert(franchiseMemberships)
      .values({
        userId: commissioner.id,
        franchiseId: canton.id,
        leagueSeasonId: activeSeason.id,
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
        set: { active: true, isPrimary: true, updatedAt: new Date() },
      });
  }
  console.log("Seeded Front Office Football League demo data.");
}
seed()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
