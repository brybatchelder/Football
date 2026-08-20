import Decimal from "decimal.js";
import Link from "next/link";
import { notFound } from "next/navigation";
import { currentViewer } from "@/auth/permissions";
import { FranchiseRoster } from "@/components/franchise-roster";
import { Card, Money, PageHeader, PlayerIdentity } from "@/components/ui";
import { loadFranchiseProfile } from "@/data/franchise-profile";
import { loadPlayerPool } from "@/data/player-pool";
import { hasPermission, rosterSummary } from "@/domain/league-rules";
import type { Position } from "@/domain/types";

const positionOrder: Position[] = [
  "QB",
  "RB",
  "WR",
  "TE",
  "PK",
  "DL",
  "LB",
  "DB",
];
const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export default async function FranchisePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [profile, viewer] = await Promise.all([
    loadFranchiseProfile(slug),
    currentViewer(),
  ]);
  if (!profile) notFound();

  const playerPool = await loadPlayerPool(profile.seasonYear);
  const players = playerPool.players.filter(
    (player) => player.isRostered && player.franchiseId === profile.slug,
  );
  const summary = rosterSummary(players, {
    cap: profile.salaryCap,
    irPercent: "100",
    taxiPercent: "100",
  });
  const available = new Decimal(profile.salaryCap)
    .minus(summary.salary)
    .toFixed(2);
  const expiringPlayers = players
    .filter((player) => player.contractYears === 1)
    .sort((left, right) => Number(right.salary) - Number(left.salary));
  const activePlayers = players.filter((player) => player.status === "active");
  const positionCounts = positionOrder.map((position) => ({
    position,
    count: activePlayers.filter((player) => player.position === position)
      .length,
  }));
  const ownerNames = profile.owners.map((owner) => owner.name).join(", ");
  const isViewerFranchise = viewer.franchises.some(
    (franchise) =>
      franchise.id === profile.id || franchise.slug === profile.slug,
  );
  const canManageLeague =
    viewer.league?.id === profile.leagueId &&
    hasPermission(viewer.role, "manage_owners");
  const canEditIdentity = isViewerFranchise || canManageLeague;

  return (
    <div className="page roster-page franchise-profile-page">
      <PageHeader
        eyebrow={`${profile.leagueName} · ${profile.seasonYear}`}
        title={profile.name}
        description={`${ownerNames ? `Owned by ${ownerNames}` : "Ownership assignment pending"} · ${profile.division ?? "Division assignment pending"}`}
        actions={
          <>
            <Link className="btn" href="/league/rosters?format=grid">
              League rosters
            </Link>
            {canEditIdentity && (
              <Link
                className="btn"
                href={`/franchises/${profile.slug}/settings`}
              >
                Edit franchise
              </Link>
            )}
            {isViewerFranchise && (
              <Link className="btn btn-primary" href="/my-team/lineup">
                Set lineup
              </Link>
            )}
          </>
        }
      />

      <section
        className="franchise-profile-banner"
        style={{
          borderColor: profile.primaryColor ?? undefined,
          boxShadow: profile.primaryColor
            ? `inset 5px 0 ${profile.primaryColor}`
            : undefined,
        }}
      >
        {profile.logoUrl ? (
          // Team logos are commissioner/owner-configured HTTPS images. Keeping
          // them unoptimized supports legacy MFL-hosted artwork and arbitrary
          // league branding without widening a build-time hostname allowlist.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt={`${profile.name} logo`}
            className="franchise-profile-logo"
            referrerPolicy="no-referrer"
            src={profile.logoUrl}
          />
        ) : (
          <span
            className="franchise-mark"
            style={{ background: profile.primaryColor ?? undefined }}
          >
            {profile.abbreviation}
          </span>
        )}
        <div>
          <strong>{profile.name}</strong>
          <span>
            {profile.division ?? "Unassigned division"} ·{" "}
            {profile.seasonStatus.replaceAll("_", " ")}
          </span>
        </div>
        <span
          className={`status-pill ${profile.active ? "status-success" : ""}`}
        >
          {profile.active ? "Active franchise" : "Inactive this season"}
        </span>
      </section>

      {profile.source === "development" && (
        <div className="notice notice-info" role="status">
          Development preview data is active. Production uses league-scoped
          franchise, ownership, branding, and roster records from PostgreSQL.
        </div>
      )}

      <section className="roster-summary-bar" aria-label="Roster summary">
        <Summary
          label="Active"
          value={summary.counts.active}
          href="#roster-active"
        />
        <Summary label="Taxi" value={summary.counts.taxi} href="#roster-taxi" />
        <Summary
          label="IR"
          value={summary.counts.injured_reserve}
          href="#roster-injured_reserve"
        />
        <Summary
          className="roster-summary-cap"
          label="Cap used"
          value={`${currency.format(Number(summary.salary))} / ${currency.format(Number(profile.salaryCap))}`}
        />
        <Summary
          className="roster-summary-cap"
          label="Cap available"
          value={currency.format(Number(available))}
        />
        <Summary label="Contract years" value={summary.contractYears} />
      </section>

      <div className="roster-page-grid">
        {players.length ? (
          <FranchiseRoster players={players} />
        ) : (
          <Card title="Current roster">
            <p className="feature-copy">
              No roster records are available for {profile.name} in the{" "}
              {profile.seasonYear} season.
            </p>
          </Card>
        )}
        <aside className="stack roster-sidebar">
          <Card title="Franchise ownership">
            <div className="franchise-profile-owners">
              {profile.owners.map((owner) => (
                <span key={owner.name}>
                  <b>{owner.name}</b>
                  <small>
                    {owner.isPrimary ? "Primary owner" : "Co-owner"}
                  </small>
                </span>
              ))}
              {!profile.owners.length && (
                <p className="subtle">
                  No active owner is assigned for this season.
                </p>
              )}
            </div>
          </Card>

          <Card title="Roster alerts">
            <ul className="roster-alerts">
              <li>
                <strong>{expiringPlayers.length}</strong>
                <span>contracts expire after {profile.seasonYear}</span>
              </li>
              <li>
                <strong>
                  <Money value={available} />
                </strong>
                <span>cap space available</span>
              </li>
              <li>
                <strong>{players.length}</strong>
                <span>total rostered players</span>
              </li>
            </ul>
          </Card>

          {expiringPlayers.length > 0 && (
            <Card title="Expiring contracts">
              <ul className="list compact-contract-list">
                {expiringPlayers.slice(0, 7).map((player) => (
                  <li key={player.id}>
                    <PlayerIdentity
                      name={player.name}
                      position={player.position}
                    />
                    <strong>
                      <Money value={player.salary} />
                    </strong>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Card title="Active position count">
            <div className="position-count-grid">
              {positionCounts.map(({ position, count }) => (
                <div key={position}>
                  <span>{position}</span>
                  <strong>{count}</strong>
                </div>
              ))}
            </div>
          </Card>

          {profile.aliases.length > 0 && (
            <Card title="Franchise identity history">
              <div className="franchise-alias-list">
                {profile.aliases.map((alias) => (
                  <span
                    key={`${alias.name}-${alias.effectiveFromSeason ?? "unknown"}`}
                  >
                    <b>{alias.name}</b>
                    <small>
                      {alias.abbreviation ? `${alias.abbreviation} · ` : ""}
                      {formatSeasonRange(
                        alias.effectiveFromSeason,
                        alias.effectiveToSeason,
                      )}
                    </small>
                  </span>
                ))}
              </div>
            </Card>
          )}
        </aside>
      </div>
    </div>
  );
}

function Summary({
  label,
  value,
  href,
  className,
}: {
  label: string;
  value: React.ReactNode;
  href?: string;
  className?: string;
}) {
  const content = (
    <>
      <span>{label}</span>
      <strong>{value}</strong>
    </>
  );
  return href ? (
    <a className={className} href={href}>
      {content}
    </a>
  ) : (
    <div className={className}>{content}</div>
  );
}

function formatSeasonRange(from: number | null, to: number | null) {
  if (from && to) return from === to ? `${from}` : `${from}–${to}`;
  if (from) return `${from}–present`;
  if (to) return `Through ${to}`;
  return "Historical identity";
}
