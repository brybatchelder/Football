import { sql, type SQL } from "drizzle-orm";

export type RestoreVerificationDatabase = {
  execute(query: SQL): Promise<unknown>;
};

export type RestoreVerificationReport = {
  leagueSlug: string;
  seasons: number;
  franchises: number;
  users: number;
  activeCommissioners: number;
  auditRecords: number;
  checks: string[];
};

export function sameDatabaseTarget(left: string, right: string | undefined) {
  if (!right?.trim()) return false;
  try {
    const leftUrl = new URL(left);
    const rightUrl = new URL(right);
    const normalizeProtocol = (protocol: string) =>
      protocol === "postgresql:" ? "postgres:" : protocol;
    const normalizePort = (url: URL) => url.port || "5432";
    return (
      normalizeProtocol(leftUrl.protocol) ===
        normalizeProtocol(rightUrl.protocol) &&
      leftUrl.hostname.toLowerCase() === rightUrl.hostname.toLowerCase() &&
      normalizePort(leftUrl) === normalizePort(rightUrl) &&
      decodeURIComponent(leftUrl.pathname) ===
        decodeURIComponent(rightUrl.pathname) &&
      decodeURIComponent(leftUrl.username) ===
        decodeURIComponent(rightUrl.username)
    );
  } catch {
    return left === right;
  }
}

export async function verifyRestoredDatabase(
  db: RestoreVerificationDatabase,
  leagueSlug: string,
): Promise<RestoreVerificationReport> {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(leagueSlug)) {
    throw new Error("Restore verification requires a valid league slug");
  }
  const result = await db.execute(sql`
    select
      (select count(*)::int from leagues where slug = ${leagueSlug}) as league_count,
      (select count(*)::int
        from league_seasons
        inner join leagues on leagues.id = league_seasons.league_id
        where leagues.slug = ${leagueSlug}) as season_count,
      (select count(*)::int
        from franchises
        inner join leagues on leagues.id = franchises.league_id
        where leagues.slug = ${leagueSlug}) as franchise_count,
      (select count(*)::int from users) as user_count,
      (select count(*)::int
        from league_memberships
        inner join leagues on leagues.id = league_memberships.league_id
        where leagues.slug = ${leagueSlug}
          and league_memberships.active = true
          and league_memberships.role in ('commissioner', 'system_administrator'))
        as active_commissioner_count,
      (select count(*)::int
        from audit_logs
        inner join leagues on leagues.id = audit_logs.league_id
        where leagues.slug = ${leagueSlug}) as audit_count,
      (select count(*)::int
        from franchise_memberships
        inner join franchises
          on franchises.id = franchise_memberships.franchise_id
        inner join league_seasons
          on league_seasons.id = franchise_memberships.league_season_id
        where franchises.league_id <> league_seasons.league_id)
        as cross_league_membership_count,
      (select count(*)::int
        from franchise_memberships
        inner join franchises
          on franchises.id = franchise_memberships.franchise_id
        inner join leagues on leagues.id = franchises.league_id
        left join league_memberships
          on league_memberships.user_id = franchise_memberships.user_id
          and league_memberships.league_id = franchises.league_id
          and league_memberships.active = true
        where leagues.slug = ${leagueSlug}
          and franchise_memberships.active = true
          and league_memberships.id is null)
        as active_franchise_without_league_count,
      (select count(*)::int from (
        select
          franchise_memberships.franchise_id,
          franchise_memberships.league_season_id
        from franchise_memberships
        inner join franchises
          on franchises.id = franchise_memberships.franchise_id
        inner join leagues on leagues.id = franchises.league_id
        where franchise_memberships.active = true
          and leagues.slug = ${leagueSlug}
        group by
          franchise_memberships.franchise_id,
          franchise_memberships.league_season_id
        having count(*) filter (where franchise_memberships.is_primary = true) <> 1
      ) invalid_primary_groups) as invalid_primary_group_count,
      (select count(*)::int
        from franchises
        inner join leagues on leagues.id = franchises.league_id
        left join provider_franchise_ids
          on provider_franchise_ids.franchise_id = franchises.id
          and provider_franchise_ids.provider = 'mfl'
        where leagues.slug = ${leagueSlug}
          and provider_franchise_ids.id is null)
        as missing_mfl_identity_count
  `);
  const row = firstRow(result);
  const leagueCount = integer(row.league_count, "league count");
  const seasonCount = integer(row.season_count, "season count");
  const franchiseCount = integer(row.franchise_count, "franchise count");
  const userCount = integer(row.user_count, "user count");
  const activeCommissionerCount = integer(
    row.active_commissioner_count,
    "active commissioner count",
  );
  const auditCount = integer(row.audit_count, "audit count");
  const failures = [
    leagueCount !== 1 && `expected exactly one ${leagueSlug} league`,
    seasonCount < 1 && "no league season was restored",
    franchiseCount < 1 && "no franchises were restored",
    activeCommissionerCount < 1 && "no active commissioner was restored",
    integer(
      row.cross_league_membership_count,
      "cross-league membership count",
    ) > 0 && "cross-league franchise memberships exist",
    integer(
      row.active_franchise_without_league_count,
      "active franchise membership without league access count",
    ) > 0 && "active franchise access exists without active league access",
    integer(row.invalid_primary_group_count, "invalid primary group count") >
      0 &&
      "an active franchise membership group lacks exactly one primary owner",
    integer(row.missing_mfl_identity_count, "missing MFL identity count") > 0 &&
      "one or more franchises lack stable MFL identity",
  ].filter((failure): failure is string => Boolean(failure));
  if (failures.length > 0) {
    throw new Error(`Restore verification failed: ${failures.join("; ")}`);
  }

  return {
    leagueSlug,
    seasons: seasonCount,
    franchises: franchiseCount,
    users: userCount,
    activeCommissioners: activeCommissionerCount,
    auditRecords: auditCount,
    checks: [
      "league_and_season_present",
      "commissioner_access_present",
      "cross_league_memberships_absent",
      "active_access_consistent",
      "primary_owner_invariant",
      "mfl_identity_complete",
    ],
  };
}

function firstRow(result: unknown): Record<string, unknown> {
  const rows = Array.isArray(result)
    ? result
    : result && typeof result === "object" && "rows" in result
      ? (result as { rows: unknown }).rows
      : null;
  if (!Array.isArray(rows) || !rows[0] || typeof rows[0] !== "object") {
    throw new Error("Restore verification query returned no result");
  }
  return rows[0] as Record<string, unknown>;
}

function integer(value: unknown, label: string) {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    throw new Error(`Restore verification returned an invalid ${label}`);
  }
  return parsed;
}
