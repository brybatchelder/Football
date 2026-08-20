import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  contracts,
  divisions,
  franchiseAliases,
  franchiseSeasons,
  franchises,
  importRecords,
  importRuns,
  injuredReserveAssignments,
  leagueSeasons,
  leagues,
  nflTeams,
  players,
  playerPositionEligibility,
  playerSeasons,
  playerTags,
  providerConnections,
  providerFranchiseIds,
  providerPlayerIds,
  reconciliationIssues,
  rosterEntries,
  salaries,
  taxiSquadAssignments,
} from "@/db/schema";
import { parseCsv } from "@/domain/nflverse-player-sync";
import type { Position, RosterStatus } from "@/domain/types";

const NFLVERSE_PLAYERS_URL =
  "https://github.com/nflverse/nflverse-data/releases/download/players/players.csv";
// Reviewed against the 2026 MFL and nflverse records. MFL treats these edge
// defenders as DE while nflverse classifies their current position as LB.
const reviewedGsisByMflId = new Map([
  ["16278", "00-0039068"], // Yaya Diaby
  ["16266", "00-0039111"], // Tuli Tuipulotu
]);

type MflPlayer = {
  id: string;
  name: string;
  team?: string;
  position?: string;
  espn_id?: string;
};
type MflRosterPlayer = {
  id: string;
  salary?: string;
  contractYear?: string;
  contractStatus?: string;
  status?: string;
};
type MflFranchise = { id: string; name: string; division?: string };
type MflDivision = { id: string; name: string };

export type MflSyncResult = {
  runId: string;
  dryRun: boolean;
  season: number;
  franchisesSeen: number;
  rosterPlayersSeen: number;
  matched: number;
  unmatched: number;
  ownershipCreated: number;
  ownershipUpdated: number;
  ownershipReleased: number;
  contractsUpdated: number;
  salariesUpdated: number;
  tagsUpdated: number;
  unmatchedPlayers: Array<{ mflId: string; name: string; reason: string }>;
};

function list<T>(value: T | T[] | undefined): T[] {
  return value === undefined ? [] : Array.isArray(value) ? value : [value];
}

function slug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function displayName(value: string) {
  const [last, first] = value.split(",").map((part) => part.trim());
  return first ? `${first} ${last}` : value.trim();
}

function position(value?: string): Position | null {
  const raw = value?.toUpperCase();
  if (!raw) return null;
  if (["QB", "RB", "WR", "TE"].includes(raw)) return raw as Position;
  if (["K", "PK", "SPEC"].includes(raw)) return "PK";
  if (["DL", "DE", "DT", "NT"].includes(raw)) return "DL";
  if (["DB", "CB", "S", "FS", "SS"].includes(raw)) return "DB";
  if (["LB", "OLB", "ILB", "MLB"].includes(raw)) return "LB";
  return null;
}

function nflTeam(value?: string) {
  const team = value?.toUpperCase() ?? "FA";
  return (
    (
      {
        ARI: "ARI",
        AZ: "ARI",
        GBP: "GB",
        JAC: "JAX",
        KCC: "KC",
        LA: "LAR",
        LVR: "LV",
        NEP: "NE",
        NOS: "NO",
        SFO: "SF",
        TBB: "TB",
      } as Record<string, string>
    )[team] ?? team
  );
}

function matchKey(name: string, playerPosition: Position, team: string) {
  const normalizedName = name
    .toLowerCase()
    .replace(/\b(jr|sr|ii|iii|iv)\b/g, "")
    .replace(/[^a-z0-9]/g, "");
  return `${normalizedName}|${playerPosition}|${nflTeam(team)}`;
}

function rosterStatus(value?: string): RosterStatus {
  if (value === "INJURED_RESERVE") return "injured_reserve";
  if (value === "TAXI_SQUAD") return "taxi";
  return "active";
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    cache: "no-store",
    headers: { "user-agent": "FOFL-MFL-sync/1.0" },
  });
  if (!response.ok)
    throw new Error(`MFL returned ${response.status} for ${url}`);
  return (await response.json()) as T;
}

async function sources(baseUrl: string, leagueId: string, season: number) {
  const exportUrl = (type: string, extra = "") =>
    `${baseUrl}/${season}/export?TYPE=${type}&L=${leagueId}&JSON=1${extra}`;
  const [leagueJson, rosterJson, playersJson, nflverseCsv] = await Promise.all([
    fetchJson<{ league: Record<string, unknown> }>(exportUrl("league")),
    fetchJson<{
      rosters: {
        franchise?: {
          id: string;
          player?: MflRosterPlayer | MflRosterPlayer[];
        }[];
      };
    }>(exportUrl("rosters")),
    fetchJson<{ players: { player?: MflPlayer | MflPlayer[] } }>(
      exportUrl("players", "&DETAILS=1"),
    ),
    fetch(NFLVERSE_PLAYERS_URL, { cache: "no-store" }).then((response) => {
      if (!response.ok) throw new Error(`nflverse returned ${response.status}`);
      return response.text();
    }),
  ]);
  const league = leagueJson.league as {
    id: string;
    name: string;
    salaryCapAmount?: string;
    divisions?: { division?: MflDivision | MflDivision[] };
    franchises?: { franchise?: MflFranchise | MflFranchise[] };
  };
  return {
    league,
    franchises: list(league.franchises?.franchise),
    divisions: list(league.divisions?.division),
    rosters: list(rosterJson.rosters.franchise),
    mflPlayers: list(playersJson.players.player),
    nflverseRows: parseCsv(nflverseCsv),
  };
}

export async function syncMflRoster({
  dryRun,
  season,
  leagueId,
  baseUrl,
}: {
  dryRun: boolean;
  season: number;
  leagueId: string;
  baseUrl: string;
}): Promise<MflSyncResult> {
  const db = getDb();
  const source = await sources(baseUrl.replace(/\/$/, ""), leagueId, season);
  const mflPlayerById = new Map(
    source.mflPlayers.map((player) => [player.id, player]),
  );
  const gsisByEspn = new Map(
    source.nflverseRows
      .filter((row) => row.espn_id && row.gsis_id)
      .map((row) => [row.espn_id, row.gsis_id]),
  );

  let [league] = await db
    .select()
    .from(leagues)
    .where(eq(leagues.slug, "fofl"))
    .limit(1);
  if (!league) {
    [league] = await db
      .insert(leagues)
      .values({
        name: source.league.name,
        slug: "fofl",
        timezone: "America/Chicago",
      })
      .returning();
  }
  let [leagueSeason] = await db
    .select()
    .from(leagueSeasons)
    .where(
      and(
        eq(leagueSeasons.leagueId, league.id),
        eq(leagueSeasons.year, season),
      ),
    )
    .limit(1);
  if (!leagueSeason) {
    [leagueSeason] = await db
      .insert(leagueSeasons)
      .values({
        leagueId: league.id,
        year: season,
        status: "preseason",
        salaryCap: source.league.salaryCapAmount || "1000",
      })
      .returning();
  }
  let [connection] = await db
    .select()
    .from(providerConnections)
    .where(
      and(
        eq(providerConnections.leagueId, league.id),
        eq(providerConnections.provider, "mfl"),
        eq(providerConnections.externalLeagueId, leagueId),
      ),
    )
    .limit(1);
  if (!connection) {
    [connection] = await db
      .insert(providerConnections)
      .values({
        leagueId: league.id,
        provider: "mfl",
        externalLeagueId: leagueId,
        settings: { season, baseUrl },
      })
      .returning();
  }
  const [run] = await db
    .insert(importRuns)
    .values({ connectionId: connection.id, status: "running", dryRun })
    .returning();

  try {
    const masterRows = await db
      .select({
        playerId: players.id,
        playerSeasonId: playerSeasons.id,
        displayName: players.displayName,
        firstName: players.firstName,
        lastName: players.lastName,
        position: playerPositionEligibility.position,
        team: nflTeams.abbreviation,
        gsisId: providerPlayerIds.externalId,
      })
      .from(playerSeasons)
      .innerJoin(players, eq(players.id, playerSeasons.playerId))
      .leftJoin(nflTeams, eq(nflTeams.id, playerSeasons.nflTeamId))
      .leftJoin(
        playerPositionEligibility,
        and(
          eq(playerPositionEligibility.playerSeasonId, playerSeasons.id),
          eq(playerPositionEligibility.isPrimary, true),
        ),
      )
      .leftJoin(
        providerPlayerIds,
        and(
          eq(providerPlayerIds.playerId, players.id),
          eq(providerPlayerIds.provider, "nflverse"),
        ),
      )
      .where(eq(playerSeasons.year, season));
    const byGsis = new Map(
      masterRows.filter((row) => row.gsisId).map((row) => [row.gsisId!, row]),
    );
    const exact = new Map<string, typeof masterRows>();
    for (const row of masterRows) {
      const pos = position(row.position ?? undefined);
      if (!pos) continue;
      const key = matchKey(
        row.displayName || `${row.firstName} ${row.lastName}`,
        pos,
        row.team ?? "FA",
      );
      exact.set(key, [...(exact.get(key) ?? []), row]);
    }
    const existingMflIds = await db
      .select({
        playerId: providerPlayerIds.playerId,
        externalId: providerPlayerIds.externalId,
      })
      .from(providerPlayerIds)
      .where(eq(providerPlayerIds.provider, "mfl"));
    const playerById = new Map(masterRows.map((row) => [row.playerId, row]));
    const playerBySeasonId = new Map(
      masterRows.map((row) => [row.playerSeasonId, row]),
    );
    const mflIdByPlayerId = new Map(
      existingMflIds.map((item) => [item.playerId, item.externalId]),
    );
    const byMfl = new Map(
      existingMflIds.flatMap((item) => {
        const row = playerById.get(item.playerId);
        return row ? [[item.externalId, row] as const] : [];
      }),
    );

    const desired: Array<{
      franchiseId: string;
      roster: MflRosterPlayer;
      mfl: MflPlayer;
      master: (typeof masterRows)[number];
    }> = [];
    const issues: Array<{ externalId: string; message: string; raw: unknown }> =
      [];
    for (const franchiseRoster of source.rosters) {
      for (const roster of list(franchiseRoster.player)) {
        const mfl = mflPlayerById.get(roster.id);
        if (!mfl) {
          issues.push({
            externalId: roster.id,
            message: "MFL roster player is absent from the MFL player export.",
            raw: roster,
          });
          continue;
        }
        let master = byMfl.get(roster.id);
        const gsisId =
          reviewedGsisByMflId.get(roster.id) ??
          (mfl.espn_id ? gsisByEspn.get(mfl.espn_id) : undefined);
        if (!master && gsisId) master = byGsis.get(gsisId);
        if (!master) {
          const pos = position(mfl.position);
          const candidates = pos
            ? (exact.get(
                matchKey(displayName(mfl.name), pos, mfl.team ?? "FA"),
              ) ?? [])
            : [];
          if (candidates.length === 1) master = candidates[0];
        }
        if (!master) {
          issues.push({
            externalId: roster.id,
            message: `${displayName(mfl.name)} could not be safely matched to the nflverse master.`,
            raw: { roster, mfl },
          });
          continue;
        }
        desired.push({ franchiseId: franchiseRoster.id, roster, mfl, master });
      }
    }

    let ownershipCreated = 0;
    let ownershipUpdated = 0;
    let ownershipReleased = 0;
    let contractsUpdated = 0;
    let salariesUpdated = 0;
    let tagsUpdated = 0;

    if (!dryRun) {
      await db.transaction(async (tx) => {
        const divisionIds = new Map<string, string>();
        for (const sourceDivision of source.divisions) {
          let [division] = await tx
            .select()
            .from(divisions)
            .where(
              and(
                eq(divisions.leagueSeasonId, leagueSeason.id),
                eq(divisions.name, sourceDivision.name),
              ),
            )
            .limit(1);
          if (!division) {
            [division] = await tx
              .insert(divisions)
              .values({
                leagueSeasonId: leagueSeason.id,
                name: sourceDivision.name,
                sortOrder: divisionIds.size + 1,
              })
              .returning();
          }
          divisionIds.set(sourceDivision.id, division.id);
        }
        const franchiseSeasonIds = new Map<string, string>();
        const franchiseProvider = `mfl:${leagueId}`;
        for (const sourceFranchise of source.franchises) {
          const franchiseSlug = slug(sourceFranchise.name);
          const [providerIdentity] = await tx
            .select({ franchise: franchises })
            .from(providerFranchiseIds)
            .innerJoin(
              franchises,
              eq(franchises.id, providerFranchiseIds.franchiseId),
            )
            .where(
              and(
                eq(providerFranchiseIds.provider, franchiseProvider),
                eq(providerFranchiseIds.externalId, sourceFranchise.id),
                eq(franchises.leagueId, league.id),
              ),
            )
            .limit(1);
          let franchise = providerIdentity?.franchise;
          if (!franchise) {
            [franchise] = await tx
              .select()
              .from(franchises)
              .where(
                and(
                  eq(franchises.leagueId, league.id),
                  eq(franchises.slug, franchiseSlug),
                ),
              )
              .limit(1);
          }
          if (!franchise) {
            [franchise] = await tx
              .insert(franchises)
              .values({
                leagueId: league.id,
                name: sourceFranchise.name,
                slug: franchiseSlug,
                abbreviation: sourceFranchise.name
                  .split(/\s+/)
                  .map((word) => word[0])
                  .join("")
                  .slice(0, 4)
                  .toUpperCase(),
              })
              .returning();
          }
          if (!providerIdentity) {
            await tx
              .insert(providerFranchiseIds)
              .values({
                franchiseId: franchise.id,
                provider: franchiseProvider,
                externalId: sourceFranchise.id,
              })
              .onConflictDoNothing();
          }
          if (franchise.name !== sourceFranchise.name) {
            const existingAlias = await tx.query.franchiseAliases.findFirst({
              where: and(
                eq(franchiseAliases.franchiseId, franchise.id),
                eq(franchiseAliases.name, franchise.name),
                eq(franchiseAliases.effectiveToSeason, season - 1),
              ),
            });
            if (!existingAlias) {
              await tx.insert(franchiseAliases).values({
                franchiseId: franchise.id,
                name: franchise.name,
                abbreviation: franchise.abbreviation,
                effectiveToSeason: season - 1,
                source: "mfl",
              });
            }
            [franchise] = await tx
              .update(franchises)
              .set({ name: sourceFranchise.name, updatedAt: new Date() })
              .where(eq(franchises.id, franchise.id))
              .returning();
          }
          let [franchiseSeason] = await tx
            .select()
            .from(franchiseSeasons)
            .where(
              and(
                eq(franchiseSeasons.franchiseId, franchise.id),
                eq(franchiseSeasons.leagueSeasonId, leagueSeason.id),
              ),
            )
            .limit(1);
          if (!franchiseSeason) {
            [franchiseSeason] = await tx
              .insert(franchiseSeasons)
              .values({
                franchiseId: franchise.id,
                leagueSeasonId: leagueSeason.id,
                divisionId: sourceFranchise.division
                  ? divisionIds.get(sourceFranchise.division)
                  : undefined,
              })
              .returning();
          } else {
            const divisionId = sourceFranchise.division
              ? divisionIds.get(sourceFranchise.division)
              : null;
            if (
              !franchiseSeason.active ||
              franchiseSeason.divisionId !== divisionId
            ) {
              [franchiseSeason] = await tx
                .update(franchiseSeasons)
                .set({ active: true, divisionId, updatedAt: new Date() })
                .where(eq(franchiseSeasons.id, franchiseSeason.id))
                .returning();
            }
          }
          franchiseSeasonIds.set(sourceFranchise.id, franchiseSeason.id);
        }

        const existingOwnership = await tx
          .select({
            id: rosterEntries.id,
            playerSeasonId: rosterEntries.playerSeasonId,
            franchiseSeasonId: rosterEntries.franchiseSeasonId,
          })
          .from(rosterEntries)
          .innerJoin(
            franchiseSeasons,
            eq(franchiseSeasons.id, rosterEntries.franchiseSeasonId),
          )
          .where(
            and(
              eq(franchiseSeasons.leagueSeasonId, leagueSeason.id),
              isNull(rosterEntries.releasedAt),
            ),
          );
        const activeByPlayerSeason = new Map(
          existingOwnership.map((item) => [item.playerSeasonId, item]),
        );
        const incomingMflIds = new Set(
          source.rosters.flatMap((franchise) =>
            list(franchise.player).map((player) => player.id),
          ),
        );

        for (const item of desired) {
          const franchiseSeasonId = franchiseSeasonIds.get(item.franchiseId);
          if (!franchiseSeasonId) continue;
          let ownership = activeByPlayerSeason.get(item.master.playerSeasonId);
          if (ownership && ownership.franchiseSeasonId !== franchiseSeasonId) {
            await tx
              .update(rosterEntries)
              .set({ releasedAt: new Date(), updatedAt: new Date() })
              .where(eq(rosterEntries.id, ownership.id));
            ownership = undefined;
            ownershipReleased += 1;
          }
          const status = rosterStatus(item.roster.status);
          let rosterEntryId: string;
          if (!ownership) {
            const [created] = await tx
              .insert(rosterEntries)
              .values({
                franchiseSeasonId,
                playerSeasonId: item.master.playerSeasonId,
                status,
              })
              .returning({ id: rosterEntries.id });
            rosterEntryId = created.id;
            ownershipCreated += 1;
          } else {
            rosterEntryId = ownership.id;
            await tx
              .update(rosterEntries)
              .set({ status, updatedAt: new Date() })
              .where(eq(rosterEntries.id, rosterEntryId));
            ownershipUpdated += 1;
          }

          await tx
            .insert(providerPlayerIds)
            .values({
              playerId: item.master.playerId,
              provider: "mfl",
              externalId: item.roster.id,
            })
            .onConflictDoNothing();

          const [currentSalary] = await tx
            .select()
            .from(salaries)
            .where(
              and(
                eq(salaries.rosterEntryId, rosterEntryId),
                isNull(salaries.effectiveTo),
              ),
            )
            .limit(1);
          const salary = item.roster.salary || "0";
          if (currentSalary) {
            await tx
              .update(salaries)
              .set({ amount: salary })
              .where(eq(salaries.id, currentSalary.id));
          } else {
            await tx.insert(salaries).values({
              rosterEntryId,
              amount: salary,
              effectiveFrom: `${season}-01-01`,
            });
          }
          salariesUpdated += 1;

          const years = Number(item.roster.contractYear || 0);
          if (years > 0) {
            const [currentContract] = await tx
              .select()
              .from(contracts)
              .where(
                and(
                  eq(contracts.rosterEntryId, rosterEntryId),
                  eq(contracts.status, "active"),
                ),
              )
              .limit(1);
            const values = {
              startYear: season,
              endYear: season + years - 1,
              totalYears: years,
            };
            if (currentContract) {
              await tx
                .update(contracts)
                .set({ ...values, updatedAt: new Date() })
                .where(eq(contracts.id, currentContract.id));
            } else {
              await tx.insert(contracts).values({ rosterEntryId, ...values });
            }
            contractsUpdated += 1;
          }

          await tx
            .delete(playerTags)
            .where(
              and(
                eq(playerTags.rosterEntryId, rosterEntryId),
                eq(playerTags.season, season),
              ),
            );
          if (item.roster.contractStatus) {
            await tx.insert(playerTags).values({
              rosterEntryId,
              season,
              type: item.roster.contractStatus.toLowerCase(),
            });
            tagsUpdated += 1;
          }

          if (status === "taxi") {
            const [assignment] = await tx
              .select({ id: taxiSquadAssignments.id })
              .from(taxiSquadAssignments)
              .where(
                and(
                  eq(taxiSquadAssignments.rosterEntryId, rosterEntryId),
                  isNull(taxiSquadAssignments.endsAt),
                ),
              )
              .limit(1);
            if (!assignment)
              await tx
                .insert(taxiSquadAssignments)
                .values({ rosterEntryId, startsAt: new Date() });
          }
          if (status === "injured_reserve") {
            const [assignment] = await tx
              .select({ id: injuredReserveAssignments.id })
              .from(injuredReserveAssignments)
              .where(
                and(
                  eq(injuredReserveAssignments.rosterEntryId, rosterEntryId),
                  isNull(injuredReserveAssignments.endsAt),
                ),
              )
              .limit(1);
            if (!assignment)
              await tx
                .insert(injuredReserveAssignments)
                .values({ rosterEntryId, startsAt: new Date() });
          }
        }

        for (const ownership of existingOwnership) {
          const master = playerBySeasonId.get(ownership.playerSeasonId);
          const mflId = master
            ? mflIdByPlayerId.get(master.playerId)
            : undefined;
          if (mflId && !incomingMflIds.has(mflId)) {
            await tx
              .update(rosterEntries)
              .set({ releasedAt: new Date(), updatedAt: new Date() })
              .where(eq(rosterEntries.id, ownership.id));
            ownershipReleased += 1;
          }
        }
      });
    }

    if (issues.length) {
      await db.insert(reconciliationIssues).values(
        issues.map((issue) => ({
          importRunId: run.id,
          severity: "warning",
          entityType: "player",
          externalId: issue.externalId,
          code: "PLAYER_UNMATCHED",
          message: issue.message,
        })),
      );
      await db.insert(importRecords).values(
        issues.map((issue) => ({
          importRunId: run.id,
          entityType: "player",
          externalId: issue.externalId,
          action: "review",
          rawPayload: issue.raw,
          message: issue.message,
        })),
      );
    }
    const result: MflSyncResult = {
      runId: run.id,
      dryRun,
      season,
      franchisesSeen: source.franchises.length,
      rosterPlayersSeen: source.rosters.reduce(
        (count, franchise) => count + list(franchise.player).length,
        0,
      ),
      matched: desired.length,
      unmatched: issues.length,
      ownershipCreated,
      ownershipUpdated,
      ownershipReleased,
      contractsUpdated,
      salariesUpdated,
      tagsUpdated,
      unmatchedPlayers: issues.map((issue) => ({
        mflId: issue.externalId,
        name: displayName(
          mflPlayerById.get(issue.externalId)?.name ?? "Unknown player",
        ),
        reason: issue.message,
      })),
    };
    await db
      .update(importRuns)
      .set({ status: "succeeded", completedAt: new Date(), counts: result })
      .where(eq(importRuns.id, run.id));
    await db
      .update(providerConnections)
      .set({ lastSuccessAt: new Date(), updatedAt: new Date() })
      .where(eq(providerConnections.id, connection.id));
    return result;
  } catch (error) {
    await db
      .update(importRuns)
      .set({
        status: "failed",
        completedAt: new Date(),
        error:
          error instanceof Error ? error.message : "Unknown MFL sync error",
      })
      .where(eq(importRuns.id, run.id));
    throw error;
  }
}
