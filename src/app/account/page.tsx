import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuth } from "@/auth/better-auth";
import { currentViewer } from "@/auth/permissions";
import { Card, PageHeader } from "@/components/ui";
import {
  AccountSecurity,
  type SessionSummary,
} from "@/components/account-security";

export default async function AccountPage() {
  const viewer = await currentViewer();
  if (!viewer.authenticated || !viewer.user)
    redirect("/sign-in?reason=authentication&next=%2Faccount");
  let initialSessions: SessionSummary[] = [];
  let initialSessionError: string | undefined;
  if (viewer.source === "better-auth") {
    try {
      const sessions = await getAuth().api.listSessions({
        headers: await headers(),
      });
      initialSessions = sessions.map((session) => ({
        id: session.id,
        createdAt: new Date(session.createdAt).toISOString(),
        expiresAt: new Date(session.expiresAt).toISOString(),
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
      }));
    } catch {
      initialSessionError =
        "Active sessions could not be loaded. Sign in again to refresh this security view.";
    }
  }
  return (
    <div className="page account-page">
      <PageHeader
        eyebrow="Owner account"
        title={viewer.user.name}
        description="Identity, league access, and franchise memberships resolved from your authenticated session."
      />
      <div className="dashboard-grid">
        <Card title="Account identity">
          <dl className="account-details">
            <div>
              <dt>Email</dt>
              <dd>{viewer.user.email}</dd>
            </div>
            <div>
              <dt>Effective role</dt>
              <dd>{viewer.role.replaceAll("_", " ")}</dd>
            </div>
            <div>
              <dt>League</dt>
              <dd>{viewer.league?.name ?? "No league membership"}</dd>
            </div>
            <div>
              <dt>Season</dt>
              <dd>{viewer.season?.year ?? "Not assigned"}</dd>
            </div>
          </dl>
        </Card>
        <Card title="My franchises">
          <div className="account-franchises">
            {viewer.franchises.map((franchise) => (
              <Link key={franchise.id} href={`/franchises/${franchise.slug}`}>
                <span className="franchise-mark">{franchise.abbreviation}</span>
                <span>
                  <b>{franchise.name}</b>
                  <small>
                    {franchise.role} {franchise.isPrimary ? "· Primary" : ""}
                  </small>
                </span>
              </Link>
            ))}
            {!viewer.franchises.length && (
              <p className="subtle">
                No franchise is attached to this account for the current season.
              </p>
            )}
          </div>
        </Card>
      </div>
      {viewer.source === "better-auth" ? (
        <AccountSecurity
          currentName={viewer.user.name}
          initialSessionError={initialSessionError}
          initialSessions={initialSessions}
        />
      ) : (
        <Card title="Account security">
          <p className="subtle">
            Password and session controls are available with a production
            database-backed account.
          </p>
        </Card>
      )}
    </div>
  );
}
