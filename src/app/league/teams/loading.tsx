export default function LeagueTeamsLoading() {
  return (
    <div className="page" aria-busy="true" aria-live="polite">
      <div className="page-loading-state">
        <strong>Loading franchises and owners…</strong>
        <p>Resolving the private current-season member directory.</p>
      </div>
    </div>
  );
}
