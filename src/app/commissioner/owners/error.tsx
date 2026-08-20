"use client";

export default function OwnersError({ reset }: { reset: () => void }) {
  return (
    <div className="page">
      <div className="card empty" role="alert">
        <h2>Owner administration is unavailable</h2>
        <p>
          The membership records could not be loaded. No access changes were
          made.
        </p>
        <button className="btn" onClick={reset} type="button">
          Try again
        </button>
      </div>
    </div>
  );
}
