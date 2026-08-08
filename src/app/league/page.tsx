import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CloudDownload,
  Megaphone,
} from "lucide-react";
import { Card, Money, PageHeader } from "@/components/ui";
import { draftPicks, franchises, roster, standings } from "@/data/demo";
import { leagueActivity } from "@/domain/league-activity";

export default async function LeagueHome({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view } = await searchParams;
  if (view === "xtra") return <LeagueXtra />;
  return (
    <div className="page">
      <PageHeader
        title="League Headquarters"
        description="The 2026 command center for standings, contracts, league activity, and MFL mirror health."
        actions={
          <Link className="btn btn-primary" href="/league/rosters?format=full">
            View all rosters <ArrowRight size={14} />
          </Link>
        }
      />
      <LeagueHomeTabs active="home" />
      <div className="dashboard-grid">
        <div className="stack">
          <section className="hero">
            <div className="kicker">Reigning champion · 2025</div>
            <h2>Canton Legends</h2>
            <p>League operations for the new season open August 18.</p>
          </section>
          <div className="grid-4">
            <div className="card metric">
              <div className="metric-label">Season status</div>
              <div className="metric-value">Preseason</div>
              <div className="metric-sub">Week 0 · MFL official</div>
            </div>
            <div className="card metric">
              <div className="metric-label">Next deadline</div>
              <div className="metric-value">13 days</div>
              <div className="metric-sub">Contract declarations</div>
            </div>
            <div className="card metric">
              <div className="metric-label">Cap alerts</div>
              <div className="metric-value money-warn">3</div>
              <div className="metric-sub">Franchises above 90%</div>
            </div>
            <div className="card metric">
              <div className="metric-label">Import health</div>
              <div className="metric-value money-good">Fresh</div>
              <div className="metric-sub">Today at 9:42 AM</div>
            </div>
          </div>
          <Card
            title="Division standings preview"
            action={
              <Link className="setup-link" href="/standings">
                Full standings →
              </Link>
            }
          >
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Franchise</th>
                    <th>Division</th>
                    <th>Record</th>
                    <th>VP</th>
                    <th>PF</th>
                  </tr>
                </thead>
                <tbody>
                  {standings.slice(0, 6).map((team) => (
                    <tr key={team.id}>
                      <td className="player-name">{team.name}</td>
                      <td>{team.division}</td>
                      <td>{team.record}</td>
                      <td>{team.vp}</td>
                      <td>{team.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
          <div className="grid-2">
            <Card title="Recent transactions">
              <ul className="list">
                <li>
                  <div>
                    <div className="list-title">Canton roster synchronized</div>
                    <div className="list-sub">
                      43 players · <Money value="763" /> · supplied report
                    </div>
                  </div>
                </li>
                <li>
                  <div>
                    <div className="list-title">
                      Quad City replaces San Diego Surf
                    </div>
                    <div className="list-sub">
                      Franchise identity updated for 2026
                    </div>
                  </div>
                </li>
                <li>
                  <div>
                    <div className="list-title">
                      Detroit acquires 2027 Round 2
                    </div>
                    <div className="list-sub">Trade with Barcelona · Aug 2</div>
                  </div>
                </li>
              </ul>
            </Card>
            <Card title="Announcements">
              <ul className="list">
                <li>
                  <Megaphone size={16} />
                  <div>
                    <div className="list-title">
                      2026 contract calendar posted
                    </div>
                    <div className="list-sub">Commissioner · Aug 3</div>
                  </div>
                </li>
                <li>
                  <AlertTriangle size={16} />
                  <div>
                    <div className="list-title">Rule questions still open</div>
                    <div className="list-sub">
                      Contract-year and IR caps need confirmation.
                    </div>
                  </div>
                </li>
              </ul>
            </Card>
          </div>
        </div>
        <aside className="stack">
          <Card title="Upcoming league dates">
            <ul className="list">
              {[
                ["18", "AUG", "Contract declarations"],
                ["25", "AUG", "Rookie auction opens"],
                ["03", "SEP", "Final roster compliance"],
                ["10", "SEP", "NFL kickoff"],
              ].map(([day, month, title]) => (
                <li key={title}>
                  <div className="date-box">
                    <span>{month}</span>
                    <strong>{day}</strong>
                  </div>
                  <div>
                    <div className="list-title">{title}</div>
                    <div className="list-sub">7:00 PM Central</div>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
          <Card title="Salary cap watch">
            <ul className="list">
              {franchises.slice(0, 4).map((f, i) => (
                <li key={f.id} style={{ display: "block" }}>
                  <div
                    style={{ display: "flex", justifyContent: "space-between" }}
                  >
                    <span className="list-title">{f.name}</span>
                    <strong>{94 - i * 3}%</strong>
                  </div>
                  <div className="progress" style={{ marginTop: 7 }}>
                    <span style={{ width: `${94 - i * 3}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          </Card>
          <Card title="Commissioner notices">
            <div className="notice">
              Two imported player records need franchise reconciliation.
            </div>
            <Link
              className="btn"
              style={{ marginTop: 12 }}
              href="/commissioner/imports"
            >
              Review issues
            </Link>
          </Card>
          <Card title="Quick links">
            <div className="stack" style={{ gap: 8 }}>
              <Link className="btn" href="/franchises/canton-legends">
                My franchise
              </Link>
              <Link className="btn" href="/league/rosters?format=grid">
                Roster grid
              </Link>
              <Link className="btn" href="/commissioner">
                <CloudDownload size={14} /> Setup center
              </Link>
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function LeagueHomeTabs({ active }: { active: "home" | "xtra" }) {
  return (
    <nav className="league-home-tabs" aria-label="League HQ views">
      <Link className={active === "home" ? "active" : ""} href="/league">League HQ</Link>
      <Link className={active === "xtra" ? "active" : ""} href="/league?view=xtra">XTRA</Link>
    </nav>
  );
}

function LeagueXtra() {
  const canton = franchises.find((franchise) => franchise.id === "canton-legends")!;
  const cantonRoster = roster.filter((player) => player.franchiseId === canton.id);
  const active = cantonRoster.filter((player) => player.status === "active").length;
  const taxi = cantonRoster.filter((player) => player.status === "taxi").length;
  const ir = cantonRoster.filter((player) => player.status === "injured_reserve").length;
  const ownedPicks = draftPicks.filter((pick) => pick.currentFranchiseId === canton.id).length;
  const capAvailable = 1000 - Number(canton.salary);
  return (
    <div className="page league-xtra-page">
      <LeagueHomeTabs active="xtra" />
      <section className="league-xtra-banner">
        <div><span className="eyebrow">Front Office Football League</span><h1>2026 Preseason</h1><p>33 days to kickoff · Owner command center</p></div>
        <Link href="/my-team/history">🏆 Defending Champion · Canton Legends</Link>
      </section>
      <div className="league-xtra-top">
        <section className="league-franchise-command">
          <header><div><span className="eyebrow">My Franchise</span><h2>{canton.name}</h2><p>{canton.owner} · 2026 Preseason</p></div><span className="franchise-mark" style={{ background: canton.color }}>{canton.abbreviation}</span></header>
          <div className="league-franchise-metrics"><span><b>{active}</b><small>Active roster</small></span><span><b>${capAvailable.toFixed(0)}</b><small>Cap available</small></span><span><b>{taxi}</b><small>Taxi</small></span><span><b>{ir}</b><small>IR</small></span><span><b>{ownedPicks}</b><small>Future picks</small></span></div>
          <div className="league-next-action"><div><span>Next action</span><b>Contract declarations due Aug 18</b><small>Review expiring and unassigned contract years.</small></div><Link className="btn btn-primary" href="/my-team/contracts">Manage contracts <ArrowRight size={14} /></Link></div>
        </section>
        <Card title="Up next"><ul className="list">{[["18", "AUG", "Contract declarations"], ["25", "AUG", "Rookie auction opens"], ["03", "SEP", "Final roster compliance"], ["10", "SEP", "NFL kickoff"]].map(([day, month, title]) => <li key={title}><div className="date-box"><span>{month}</span><strong>{day}</strong></div><div><div className="list-title">{title}</div><div className="list-sub">7:00 PM Central</div></div></li>)}</ul></Card>
      </div>
      <div className="league-right-now"><div><span>Next deadline</span><b>Aug 18</b><small>Contract declarations</small></div><div><span>My roster</span><b>{active} active</b><small>{Math.max(0, 42 - active)} openings</small></div><div><span>My cap</span><b>${capAvailable.toFixed(0)}</b><small>Available of $1,000</small></div><div><span>League activity</span><b>{leagueActivity.length} items</b><small>Imported + seeded coverage</small></div></div>
      <div className="league-xtra-main">
        <Card title="Around the league" action={<Link className="setup-link" href="/transactions/activity">View activity →</Link>}>
          <div className="league-activity-feed">{leagueActivity.map((event) => <article key={event.id}><span>{event.type.replace("-", " ")}</span><div><b>{event.title}</b><small>{event.summary} · {event.occurredAt}</small></div></article>)}</div>
        </Card>
        <Card title="Offseason pulse"><div className="offseason-pulse"><span><b>{draftPicks.length}</b> tracked draft assets</span><span><b>{roster.filter((player) => player.status === "taxi").length}</b> Taxi players league-wide</span><span><b>{franchises.filter((franchise) => Number(franchise.salary) >= 900).length}</b> franchises above 90% cap</span><span><b>{leagueActivity.filter((event) => event.type === "trade").length}</b> tracked trades</span></div><Link className="btn" href="/transactions/trade-block">Explore Trade Block</Link></Card>
      </div>
      <div className="league-xtra-bottom">
        <Card title="Offseason snapshot"><div className="league-snapshot-grid">{franchises.slice().sort((left, right) => Number(right.salary) - Number(left.salary)).slice(0, 6).map((franchise) => <div key={franchise.id}><span className="franchise-mark" style={{ background: franchise.color }}>{franchise.abbreviation}</span><b>{franchise.name}</b><small><Money value={franchise.salary} /> used · ${(1000 - Number(franchise.salary)).toFixed(0)} available</small></div>)}</div></Card>
        <Card title="Announcements"><ul className="list"><li><Megaphone size={16} /><div><div className="list-title">2026 contract calendar posted</div><div className="list-sub">Contract declarations open Aug 18</div></div></li><li><AlertTriangle size={16} /><div><div className="list-title">Roster compliance approaching</div><div className="list-sub">Final compliance deadline is Sep 3</div></div></li></ul></Card>
      </div>
    </div>
  );
}
