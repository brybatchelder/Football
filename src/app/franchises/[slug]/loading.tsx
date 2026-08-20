export default function FranchiseLoading() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading franchise profile"
      className="page"
    >
      <div className="card empty">
        <h2>Loading franchise…</h2>
        <p>Resolving current ownership, identity, and roster records.</p>
      </div>
    </div>
  );
}
