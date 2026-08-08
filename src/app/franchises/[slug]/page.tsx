import Decimal from "decimal.js";
import Link from "next/link";
import { notFound } from "next/navigation";
import { currentRole } from "@/auth/permissions";
import {
  Card,
  FranchiseMark,
  Money,
  PageHeader,
  PlayerIdentity,
  StatusBadge,
} from "@/components/ui";
import { franchises, roster } from "@/data/demo";
import { hasPermission, rosterSummary } from "@/domain/league-rules";

export default async function FranchisePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const franchise = franchises.find((candidate) => candidate.id === slug);
  if (!franchise) notFound();
  const players = roster.filter((player) => player.franchiseId === slug);
  const summary = rosterSummary(players, {
    cap: "1000",
    irPercent: "100",
    taxiPercent: "100",
  });
  const available = new Decimal("1000").minus(franchise.salary).toFixed(2);
  const taggedPlayers = players.filter((player) => player.tag);
  const expiringPlayers = players
    .filter((player) => player.contractYears > 0)
    .sort((left, right) => left.contractYears - right.contractYears)
    .slice(0, 5);
  const role = await currentRole();

  return (
    <div className="page">
      <PageHeader
        eyebrow={`${franchise.division} Division`}
        title={franchise.name}
        description={`Owned by ${franchise.owner} · 2026 supplied roster report`}
        actions={
          <>
            <Link className="btn" href="/league/rosters?format=grid">
              Roster grid
            </Link>
            <Link className="btn btn-primary" href="/transactions/trades">
              Propose trade
            </Link>
          </>
        }
      />
      <div
        className="franchise-title card"
        style={{ padding: 18, marginBottom: 14 }}
      >
        <FranchiseMark
          abbreviation={franchise.abbreviation}
          color={franchise.color}
        />
        <div>
          <h2>{franchise.name}</h2>
          <p>
            {franchise.owner} · {franchise.division} Division
          </p>
        </div>
      </div>
      <div className="grid-4" style={{ marginBottom: 14 }}>
        <div className="card metric">
          <div className="metric-label">Roster salary</div>
          <div className="metric-value">
            <Money value={franchise.salary} />
          </div>
          <div className="metric-sub">
            <Money value={available} /> available
          </div>
        </div>
        <div className="card metric">
          <div className="metric-label">Dead cap</div>
          <div className="metric-value">—</div>
          <div className="metric-sub">Not included in supplied report</div>
        </div>
        <div className="card metric">
          <div className="metric-label">Contract years</div>
          <div className="metric-value">{summary.contractYears}</div>
          <div className="metric-sub">
            {130 - summary.contractYears} available of 130
          </div>
        </div>
        <div className="card metric">
          <div className="metric-label">Active / Taxi / IR</div>
          <div className="metric-value">
            {summary.counts.active} / {summary.counts.taxi} /{" "}
            {summary.counts.injured_reserve}
          </div>
          <div className="metric-sub">{players.length} total players</div>
        </div>
      </div>
      <div className="dashboard-grid">
        <div className="stack">
          <Card title="2026 roster">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Player</th>
                    <th>2025 Pts</th>
                    <th>Bye</th>
                    <th>Salary</th>
                    <th>Years</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {players.map((player) => (
                    <tr key={player.id}>
                      <td>
                        <PlayerIdentity
                          name={player.name}
                          position={player.position}
                        />
                        <div className="subtle">{player.team}</div>
                      </td>
                      <td>{player.priorPoints}</td>
                      <td>{player.bye || "—"}</td>
                      <td>
                        <Money value={player.salary} />
                      </td>
                      <td>{player.contractYears || "—"}</td>
                      <td>
                        <StatusBadge status={player.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
          <div className="grid-2">
            <Card title="Future draft picks">
              <div className="notice notice-info">
                Future draft-pick ownership was not included in the supplied
                reports. This section will populate from the MFL draft-pick
                import.
              </div>
            </Card>
            <Card title="Recent activity">
              <ul className="list">
                <li>
                  <div>
                    <div className="list-title">Roster report synchronized</div>
                    <div className="list-sub">
                      {players.length} players ·{" "}
                      <Money value={franchise.salary} /> reported salary
                    </div>
                  </div>
                </li>
                <li>
                  <div>
                    <div className="list-title">
                      Franchise identity confirmed
                    </div>
                    <div className="list-sub">
                      {franchise.name} · {franchise.division} Division
                    </div>
                  </div>
                </li>
              </ul>
            </Card>
          </div>
        </div>
        <aside className="stack">
          <Card title="Contract watch">
            <ul className="list">
              {expiringPlayers.map((player) => (
                <li key={player.id}>
                  <div>
                    <div className="list-title">
                      <PlayerIdentity
                        name={player.name}
                        position={player.position}
                      />
                    </div>
                    <div className="list-sub">
                      {player.contractYears} year
                      {player.contractYears === 1 ? "" : "s"} remaining ·{" "}
                      <Money value={player.salary} />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
          <Card title="Tagged players">
            {taggedPlayers.length ? (
              <ul className="list">
                {taggedPlayers.map((player) => (
                  <li key={player.id}>
                    <div>
                      <div className="list-title">
                        <PlayerIdentity
                          name={player.name}
                          position={player.position}
                        />
                      </div>
                      <div className="list-sub">
                        {player.tag} · <Money value={player.salary} />
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="subtle">
                No player tags are listed in the supplied report.
              </div>
            )}
          </Card>
          {hasPermission(role, "manage_league") && (
            <Card title="Commissioner notes">
              <textarea
                className="input"
                style={{ width: "100%", minHeight: 90 }}
                defaultValue="Verify imported contract and roster status history before the 2026 roster lock."
              />
              <button className="btn btn-dark" style={{ marginTop: 10 }}>
                Save note
              </button>
            </Card>
          )}
          <Card title="Audit preview">
            <ul className="list">
              <li>
                <div>
                  <div className="list-title">Roster report imported</div>
                  <div className="list-sub">Supplied source · 2026 Week 1</div>
                </div>
              </li>
              <li>
                <div>
                  <div className="list-title">Franchise data updated</div>
                  <div className="list-sub">
                    Owner, division, salary, and roster
                  </div>
                </div>
              </li>
            </ul>
            <Link className="setup-link" href="/commissioner/audit">
              Open full audit log →
            </Link>
          </Card>
        </aside>
      </div>
    </div>
  );
}
