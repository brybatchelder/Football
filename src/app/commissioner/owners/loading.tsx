export default function OwnersLoading() {
  return (
    <div
      className="page"
      aria-busy="true"
      aria-label="Loading owner administration"
    >
      <div className="card empty">
        <h2>Loading owners and franchises…</h2>
        <p>Resolving season memberships and pending invitations.</p>
      </div>
    </div>
  );
}
