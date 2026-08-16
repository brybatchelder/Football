"use client";
import { Play, ScanSearch } from "lucide-react";
import { useState } from "react";
export function ImportControls() {
  const [result, setResult] = useState<string>();
  const [busy, setBusy] = useState(false);
  async function run(dryRun: boolean) {
    setBusy(true);
    const response = await fetch("/api/imports/mfl", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ dryRun }),
    });
    const json = (await response.json()) as {
      summary?: string;
      error?: string;
    };
    setResult(json.summary ?? json.error);
    setBusy(false);
  }
  return (
    <section className="card">
      <div className="card-header">
        <h2>Import controls</h2>
        <span className="badge badge-blue">Live MFL</span>
      </div>
      <div className="card-body">
        <div className="button-row">
          <button
            disabled={busy}
            className="btn btn-primary"
            onClick={() => run(false)}
          >
            <Play size={14} />
            {busy ? "Working…" : "Run import"}
          </button>
          <button disabled={busy} className="btn" onClick={() => run(true)}>
            <ScanSearch size={14} />
            Dry run preview
          </button>
        </div>
        {result && (
          <div className="notice notice-info" style={{ marginTop: 12 }}>
            {result}
          </div>
        )}
        <p className="subtle">
          Public reads do not require credentials. MFL usernames and passwords
          remain server-only and are never serialized to this page.
        </p>
      </div>
    </section>
  );
}
