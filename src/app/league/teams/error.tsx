"use client";

export default function LeagueTeamsError({ reset }: { reset: () => void }) {
  return (
    <div className="page">
      <div className="notice" role="alert">
        <strong>The franchise directory could not be loaded.</strong>
        <p>No owner or franchise records were changed.</p>
        <button className="btn" onClick={reset} type="button">
          Retry directory
        </button>
      </div>
    </div>
  );
}
