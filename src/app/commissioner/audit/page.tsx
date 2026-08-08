import { PageHeader } from "@/components/ui";
import { requirePermission } from "@/auth/permissions";
import { auditEntries } from "@/data/demo";
export default async function AuditPage() {
  await requirePermission("manage_league");
  return (
    <div className="page">
      <PageHeader
        eyebrow="Commissioner"
        title="Audit Log"
        description="Immutable summaries of league mutations and provider imports, displayed in America/Chicago."
      />
      <div className="filterbar">
        <input
          className="input"
          placeholder="Filter actor, action, or entity…"
        />
        <select className="select">
          <option>All sources</option>
          <option>Football</option>
          <option>MFL</option>
        </select>
        <select className="select">
          <option>All actions</option>
          <option>Roster</option>
          <option>Rules</option>
          <option>Imports</option>
        </select>
      </div>
      <div className="table-wrap mobile-stack">
        <table>
          <thead>
            <tr>
              <th>Actor</th>
              <th>Action</th>
              <th>Entity</th>
              <th>Before / after</th>
              <th>Timestamp</th>
              <th>Source</th>
              <th>Correlation</th>
            </tr>
          </thead>
          <tbody>
            {auditEntries.map((e) => (
              <tr key={e.correlation}>
                <td data-label="Actor" className="player-name">
                  {e.actor}
                </td>
                <td data-label="Action">
                  <span className="badge badge-blue">{e.action}</span>
                </td>
                <td data-label="Entity">{e.entity}</td>
                <td data-label="Before / after" className="subtle">
                  Validated state transition
                </td>
                <td data-label="Timestamp">{e.time}</td>
                <td data-label="Source">{e.source}</td>
                <td data-label="Correlation">
                  <code>{e.correlation}</code>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
