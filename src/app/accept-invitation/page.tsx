import Link from "next/link";
import { redirect } from "next/navigation";
import { currentViewer } from "@/auth/permissions";
import {
  acceptInvitation,
  findValidInvitation,
  invitationDetails,
  normalizeEmail,
} from "@/auth/invitations";
import { InvitationRegistrationForm } from "@/components/auth-forms";
import { Card, PageHeader } from "@/components/ui";

async function acceptExistingAccount(formData: FormData) {
  "use server";
  const token = String(formData.get("token") ?? "");
  const viewer = await currentViewer();
  if (!viewer.authenticated || !viewer.user) {
    redirect(
      `/sign-in?next=${encodeURIComponent(`/accept-invitation?token=${token}`)}`,
    );
  }
  const invitation = await findValidInvitation(token, viewer.user.email);
  if (!invitation) redirect("/accept-invitation?error=invalid");
  await acceptInvitation(invitation.id, viewer.user.id);
  redirect("/league?joined=1");
}

export default async function AcceptInvitationPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const { token = "", error } = await searchParams;
  const details = token ? await invitationDetails(token) : null;
  const viewer = await currentViewer();

  if (error || !details) {
    return (
      <div className="page" style={{ maxWidth: 760 }}>
        <PageHeader
          title="Invitation unavailable"
          description="This owner invitation is invalid, expired, revoked, or already accepted."
        />
        <Card>
          <Link className="btn" href="/sign-in">
            Return to sign in
          </Link>
        </Card>
      </div>
    );
  }

  const destination = details.franchise?.name ?? details.league.name;
  const emailMatches =
    viewer.user &&
    normalizeEmail(viewer.user.email) ===
      normalizeEmail(details.invitation.email);

  return (
    <div className="page" style={{ maxWidth: 760 }}>
      <PageHeader
        eyebrow={details.league.name}
        title={`Join ${destination}`}
        description={`This invitation grants ${details.invitation.role.replaceAll("_", " ")} access for the ${details.invitation.leagueSeasonId ? "current" : "upcoming"} league season.`}
      />
      <Card
        title={
          viewer.authenticated
            ? "Confirm membership"
            : "Create your owner account"
        }
      >
        {viewer.authenticated && emailMatches ? (
          <form action={acceptExistingAccount}>
            <input name="token" type="hidden" value={token} />
            <p className="feature-copy">
              Signed in as <strong>{viewer.user?.email}</strong>. Accepting adds
              this membership to your existing FOFL account.
            </p>
            <button className="btn btn-primary" type="submit">
              Accept invitation
            </button>
          </form>
        ) : viewer.authenticated ? (
          <div className="notice" role="alert">
            This invitation was issued to {details.invitation.email}, but you
            are signed in as {viewer.user?.email}. Sign out before continuing.
          </div>
        ) : (
          <>
            <InvitationRegistrationForm
              email={details.invitation.email}
              token={token}
            />
            <p className="subtle" style={{ marginTop: 16 }}>
              Already have an FOFL account?{" "}
              <Link
                className="setup-link"
                href={`/sign-in?next=${encodeURIComponent(`/accept-invitation?token=${token}`)}`}
              >
                Sign in to accept
              </Link>
            </p>
          </>
        )}
      </Card>
    </div>
  );
}
