import Link from "next/link";
import { Money, PageHeader } from "@/components/ui";
import { standings } from "@/data/demo";

const divisions = ["Eastern", "Central", "Western"] as const;

export default function StandingsPage() {
  return (
    <div className="page">
      <PageHeader
        title="2026 Standings"
        description="Preseason division alignment and current roster salary totals from the supplied league reports. Records and scoring totals begin at zero."
        actions={
          <Link className="btn" href="/league/rosters?format=full">
            View rosters
          </Link>
        }
      />
      <div className="stack">
        {divisions.map((division) => (
          <section className="card" key={division}>
            <div className="card-header">
              <h2>{division} Division</h2>
              <span className="badge badge-blue">4 franchises</span>
            </div>
            <div className="table-wrap" style={{ border: 0, borderRadius: 0 }}>
              <table>
                <thead>
                  <tr>
                    <th>Franchise</th>
                    <th>Owner</th>
                    <th>Salary</th>
                    <th>VP</th>
                    <th>W-L-T</th>
                    <th>Div W-L-T</th>
                    <th>Streak</th>
                    <th>PF</th>
                    <th>PA</th>
                  </tr>
                </thead>
                <tbody>
                  {standings
                    .filter((team) => team.division === division)
                    .map((team) => (
                      <tr key={team.id}>
                        <td>
                          <Link
                            className="player-name"
                            href={`/franchises/${team.id}`}
                          >
                            {team.name}
                          </Link>
                        </td>
                        <td>{team.owner}</td>
                        <td>
                          <Money value={team.salary} />
                        </td>
                        <td>{team.vp}</td>
                        <td>{team.record}</td>
                        <td>{team.divisionRecord}</td>
                        <td>{team.streak}</td>
                        <td>{team.points}</td>
                        <td>{team.pointsAgainst}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
