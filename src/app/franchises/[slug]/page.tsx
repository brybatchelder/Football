import Decimal from "decimal.js";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FranchiseRoster } from "@/components/franchise-roster";
import { Card, Money, PageHeader, PlayerIdentity } from "@/components/ui";
import { franchises, roster } from "@/data/demo";
import { rosterSummary } from "@/domain/league-rules";
import type { Position } from "@/domain/types";

const positionOrder: Position[] = ["QB", "RB", "WR", "TE", "PK", "DL", "LB", "DB"];

export default async function FranchisePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const franchise = franchises.find((candidate) => candidate.id === slug);
  if (!franchise) notFound();

  const players = roster.filter((player) => player.franchiseId === slug);
  const summary = rosterSummary(players, { cap: "1000", irPercent: "100", taxiPercent: "100" });
  const available = new Decimal("1000").minus(franchise.salary).toFixed(2);
  const contractYearsAvailable = 130 - summary.contractYears;
  const expiringPlayers = players
    .filter((player) => player.contractYears === 1)
    .sort((left, right) => Number(right.salary) - Number(left.salary));
  const activePlayers = players.filter((player) => player.status === "active");
  const positionCounts = positionOrder.map((position) => ({
    position,
    count: activePlayers.filter((player) => player.position === position).length,
  }));

  return (
    <div className="page roster-page">
      <PageHeader
        eyebrow={`${franchise.division} Division`}
        title={`${franchise.name} — Roster`}
        description={`Owned by ${franchise.owner} · 2026 roster and contract source of truth`}
        actions={
          <>
            <Link className="btn" href="/league/rosters?format=grid">League rosters</Link>
            <Link className="btn btn-primary" href="/my-team/lineup">Set lineup</Link>
          </>
        }
      />

      <section className="roster-summary-bar" aria-label="Roster summary">
        <Summary label="Active" value={summary.counts.active} href="#roster-active" />
        <Summary label="Taxi" value={summary.counts.taxi} href="#roster-taxi" />
        <Summary label="IR" value={summary.counts.injured_reserve} href="#roster-injured_reserve" />
        <Summary
          label="Cap used"
          value={<><Money value={franchise.salary} /> / $1,000</>}
          className="roster-summary-cap"
        />
        <Summary
          label="Cap available"
          value={<Money value={available} />}
          className="roster-summary-cap"
        />
        <Summary label="Contract years" value={`${summary.contractYears} / 130`} />
        <Summary label="Years available" value={contractYearsAvailable} />
      </section>

      <div className="roster-page-grid">
        <FranchiseRoster players={players} />
        <aside className="stack roster-sidebar">
          <Card title="Roster alerts">
            <ul className="roster-alerts">
              <li><strong>{expiringPlayers.length}</strong><span>contracts expire after 2026</span></li>
              <li><strong>1</strong><span>player marked holdout</span></li>
              <li><strong>{Math.max(0, 34 - summary.counts.active)}</strong><span>open active roster spot</span></li>
              <li><strong><Money value={available} /></strong><span>cap space available</span></li>
              <li><strong>{contractYearsAvailable}</strong><span>contract years available</span></li>
              <li><strong>2</strong><span>players eligible for IR review</span></li>
            </ul>
          </Card>

          <Card title="Expiring contracts">
            {expiringPlayers.length ? (
              <ul className="list compact-contract-list">
                {expiringPlayers.slice(0, 7).map((player) => (
                  <li key={player.id}>
                    <PlayerIdentity name={player.name} position={player.position} />
                    <strong><Money value={player.salary} /></strong>
                  </li>
                ))}
              </ul>
            ) : <p className="subtle">No contracts expire after this season.</p>}
          </Card>

          <Card title="Active position count">
            <div className="position-count-grid">
              {positionCounts.map(({ position, count }) => (
                <div key={position}><span>{position}</span><strong>{count}</strong></div>
              ))}
            </div>
          </Card>
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
  const content = <><span>{label}</span><strong>{value}</strong></>;
  return href ? <a className={className} href={href}>{content}</a> : <div className={className}>{content}</div>;
}
