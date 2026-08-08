import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CloudDownload,
  Megaphone,
} from "lucide-react";
import { Card, Money, PageHeader } from "@/components/ui";
import { franchises, standings } from "@/data/demo";

export default function LeagueHome() {
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
