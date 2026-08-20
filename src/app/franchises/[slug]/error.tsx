"use client";

export default function FranchiseError({ reset }: { reset: () => void }) {
  return (
    <div className="page">
      <div className="card empty" role="alert">
        <h2>Franchise information is unavailable</h2>
        <p>
          Current ownership and roster records could not be loaded. No league
          data was changed.
        </p>
        <button className="btn" onClick={reset} type="button">
          Try again
        </button>
      </div>
    </div>
  );
}
