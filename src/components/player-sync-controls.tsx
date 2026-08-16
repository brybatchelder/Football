"use client";

import { DatabaseZap, ScanSearch, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type SyncResult = {
  runId: string;
  dryRun: boolean;
  sourceSeason: number;
  playersSeen: number;
  playersCreated: number;
  playersUpdated: number;
  rosterAttributesUpdated: number;
  matchedAutomatically: number;
  unmatchedCount: number;
  reviewCount: number;
  ownershipRecordsModified: number;
};
type SyncRun = {
  id: string;
  status: "pending" | "running" | "succeeded" | "failed";
  dryRun: boolean;
  playersSeen: number;
  playersCreated: number;
  playersUpdated: number;
  reviewCount: number;
  unmatchedCount: number;
  startedAt: string;
  errorMessage: string | null;
};

export function PlayerSyncControls() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string>();
  const [result, setResult] = useState<SyncResult>();
  const [history, setHistory] = useState<SyncRun[]>([]);

  const loadHistory = useCallback(async () => {
    try {
      const response = await fetch("/api/imports/nflverse", { cache: "no-store" });
      if (response.ok) setHistory(((await response.json()) as { runs: SyncRun[] }).runs);
    } catch { /* database may not be configured in the local UI preview */ }
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/imports/nflverse", { cache: "no-store" })
      .then((response) => response.ok ? response.json() as Promise<{ runs: SyncRun[] }> : undefined)
      .then((json) => { if (active && json) setHistory(json.runs); })
      .catch(() => { /* database may not be configured in the local UI preview */ });
    return () => { active = false; };
  }, []);

  async function run(dryRun: boolean) {
    if (!dryRun && !window.confirm("Apply the validated nflverse player changes? FOFL ownership, salary, contracts, Taxi, and IR records will not be changed.")) return;
    setBusy(true);
    setMessage(undefined);
    setResult(undefined);
    try {
      const response = await fetch("/api/imports/nflverse", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ dryRun, season: 2026 }),
      });
      const json = await response.json() as { summary?: string; error?: string; result?: SyncResult };
      setMessage(json.summary ?? json.error ?? "Sync returned no report.");
      setResult(json.result);
      if (json.result) void loadHistory();
    } catch {
      setMessage("Could not reach the NFL player sync service.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card">
      <div className="card-header">
        <div>
          <div className="eyebrow">NFL master data</div>
          <h2>Sync NFL Players</h2>
        </div>
        <span className="badge badge-blue"><ShieldCheck size={11} /> Ownership protected</span>
      </div>
      <div className="card-body">
        <p className="subtle" style={{ marginTop: 0 }}>
          Imports nflverse master identities and overlays the 2026 season roster. Stable GSIS IDs drive upserts; uncertain FOFL matches are held for review.
        </p>
        <div className="button-row">
          <button disabled={busy} className="btn btn-primary" onClick={() => run(true)}>
            <ScanSearch size={14} /> {busy ? "Syncing…" : "Run dry-run report"}
          </button>
          <button disabled={busy} className="btn" onClick={() => run(false)}>
            <DatabaseZap size={14} /> Sync now
          </button>
        </div>
        {message && <div className={`notice ${result ? "notice-info" : "notice-warning"}`} style={{ marginTop: 12 }}>{message}</div>}
        {result && (
          <div className="grid-4" style={{ marginTop: 12 }}>
            <div className="metric"><div className="metric-label">Checked</div><div className="metric-value">{result.playersSeen.toLocaleString()}</div></div>
            <div className="metric"><div className="metric-label">New / updated</div><div className="metric-value">{result.playersCreated} / {result.playersUpdated}</div></div>
            <div className="metric"><div className="metric-label">Needs review</div><div className="metric-value money-warn">{result.reviewCount + result.unmatchedCount}</div></div>
            <div className="metric"><div className="metric-label">FOFL records changed</div><div className="metric-value money-good">{result.ownershipRecordsModified}</div></div>
          </div>
        )}
        {history.length > 0 && (
          <div className="table-wrap" style={{ marginTop: 12 }}>
            <table>
              <thead><tr><th>Started</th><th>Mode</th><th>Checked</th><th>New / updated</th><th>Review</th><th>Status</th></tr></thead>
              <tbody>{history.map((run) => (
                <tr key={run.id}>
                  <td>{new Date(run.startedAt).toLocaleString()}</td>
                  <td>{run.dryRun ? "Dry run" : "Apply"}</td>
                  <td>{run.playersSeen.toLocaleString()}</td>
                  <td>{run.playersCreated} / {run.playersUpdated}</td>
                  <td>{run.reviewCount + run.unmatchedCount}</td>
                  <td><span className={`badge ${run.status === "succeeded" ? "badge-active" : run.status === "failed" ? "badge-taxi" : "badge-blue"}`}>{run.status}</span>{run.errorMessage && <small className="subtle"> · {run.errorMessage}</small>}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
        <p className="subtle">Manual only for v1. No scheduled job is enabled.</p>
      </div>
    </section>
  );
}
