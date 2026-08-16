import { AlertCircle, CheckCircle2, Database } from "lucide-react";
import { PageHeader } from "@/components/ui";
import { requirePermission } from "@/auth/permissions";
import { ImportControls } from "@/components/import-controls";
import { PlayerSyncControls } from "@/components/player-sync-controls";

export default async function ImportsPage() {
  await requirePermission("manage_league");
  return (
    <div className="page">
      <PageHeader
        eyebrow="History and imports"
        title="MFL Imports & Reconciliation"
        description="Read-only fixture and API imports preserve provider identifiers, raw records, and human-reviewable conflicts."
      />
      <PlayerSyncControls />
      <div style={{ height: 14 }} />
      <div className="grid-4" style={{ marginBottom: 14 }}>
        <div className="card metric">
          <div className="metric-label">Provider</div>
          <div className="metric-value">MFL</div>
          <div className="metric-sub">www49 · Public read</div>
        </div>
        <div className="card metric">
          <div className="metric-label">League / season</div>
          <div className="metric-value">22632</div>
          <div className="metric-sub">2026</div>
        </div>
        <div className="card metric">
          <div className="metric-label">Last success</div>
          <div className="metric-value money-good">Fresh</div>
          <div className="metric-sub">Today · 9:42 AM</div>
        </div>
        <div className="card metric">
          <div className="metric-label">Open issues</div>
          <div className="metric-value money-warn">2</div>
          <div className="metric-sub">Needs reconciliation</div>
        </div>
      </div>
      <ImportControls />
      <div className="grid-2" style={{ marginTop: 14 }}>
        <section className="card">
          <div className="card-header">
            <h2>Import history</h2>
            <span className="badge badge-active">
              <CheckCircle2 size={11} /> Healthy
            </span>
          </div>
          <div className="table-wrap" style={{ border: 0, borderRadius: 0 }}>
            <table>
              <thead>
                <tr>
                  <th>Run</th>
                  <th>Mode</th>
                  <th>Counts</th>
                  <th>Status</th>
                  <th>Completed</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="player-name">IMP-260805-A</td>
                  <td>Apply</td>
                  <td>41 / 7 / 196 / 0</td>
                  <td>
                    <span className="badge badge-active">Succeeded</span>
                  </td>
                  <td>Today 9:42 AM</td>
                </tr>
                <tr>
                  <td className="player-name">IMP-260804-B</td>
                  <td>Dry run</td>
                  <td>0 / 5 / 201 / 0</td>
                  <td>
                    <span className="badge badge-active">Succeeded</span>
                  </td>
                  <td>Aug 4 6:02 PM</td>
                </tr>
                <tr>
                  <td className="player-name">IMP-260804-A</td>
                  <td>Apply</td>
                  <td>12 / 0 / 0 / 0</td>
                  <td>
                    <span className="badge badge-active">Succeeded</span>
                  </td>
                  <td>Aug 4 6:00 AM</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
        <section className="card">
          <div className="card-header">
            <h2>Reconciliation issues</h2>
            <span className="badge badge-taxi">
              <AlertCircle size={11} /> 2 open
            </span>
          </div>
          <div className="card-body">
            <ul className="list">
              <li>
                <Database size={17} />
                <div>
                  <div className="list-title">Unknown franchise assignment</div>
                  <div className="list-sub">
                    Player 16104 references external franchise 0013, which is
                    not in the 2026 league.
                  </div>
                  <details>
                    <summary
                      className="setup-link"
                      style={{ cursor: "pointer" }}
                    >
                      Raw details
                    </summary>
                    <pre
                      className="notice"
                      style={{ whiteSpace: "pre-wrap" }}
                    >{`{ "player": "16104", "franchise": "0013" }`}</pre>
                  </details>
                </div>
              </li>
              <li>
                <AlertCircle size={17} />
                <div>
                  <div className="list-title">Contract years missing</div>
                  <div className="list-sub">
                    One roster record has salary but no contract-year value.
                    Record was retained for review.
                  </div>
                </div>
              </li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}
