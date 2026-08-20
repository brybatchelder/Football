import { LogIn, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { Card, PageHeader } from "@/components/ui";
import { ProductionSignInForm } from "@/components/auth-forms";
export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{
    reason?: string;
    next?: string;
    registered?: string;
  }>;
}) {
  const { reason, next, registered } = await searchParams;
  const callbackURL =
    next?.startsWith("/") && !next.startsWith("//") ? next : "/league";
  const reasonMessage =
    reason === "permission"
      ? "Your account does not have permission to open that page. Sign in with an authorized account."
      : reason === "authentication"
        ? "Sign in to continue to the protected page you requested."
        : null;
  return (
    <div className="page" style={{ maxWidth: 720 }}>
      <PageHeader
        eyebrow="Secure access"
        title="Sign in to Football"
        description={
          process.env.NODE_ENV === "production"
            ? "Use the verified owner account associated with your FOFL franchise."
            : "Development roles are isolated from production authentication and create secure, HTTP-only cookies."
        }
      />
      {reasonMessage && (
        <div className="notice" style={{ marginBottom: 14 }}>
          {reasonMessage}
        </div>
      )}
      {registered === "1" && (
        <div className="notice notice-info" style={{ marginBottom: 14 }}>
          Account created. Check your email to verify the address before signing
          in.
        </div>
      )}
      <Card
        title={
          process.env.NODE_ENV === "production"
            ? "Owner sign in"
            : "Development account setup"
        }
      >
        {process.env.NODE_ENV === "production" ? (
          <ProductionSignInForm callbackURL={callbackURL} />
        ) : (
          <form method="post" action="/api/auth/dev-sign-in">
            <input name="next" type="hidden" value={callbackURL} />
            <div className="field">
              <label>Email</label>
              <input
                className="input"
                name="email"
                type="email"
                defaultValue="commissioner@football.local"
                required
              />
            </div>
            <div className="field" style={{ marginTop: 14 }}>
              <label>Role</label>
              <select
                className="select"
                name="role"
                defaultValue="commissioner"
              >
                <option value="owner">Owner</option>
                <option value="assistant_commissioner">
                  Assistant Commissioner
                </option>
                <option value="commissioner">Commissioner</option>
              </select>
            </div>
            <button className="btn btn-primary" style={{ marginTop: 18 }}>
              <LogIn size={15} /> Continue to league
            </button>
          </form>
        )}
        {process.env.NODE_ENV !== "production" && (
          <div className="notice notice-info" style={{ marginTop: 16 }}>
            <ShieldCheck size={14} /> Development sign-in is disabled when
            NODE_ENV is production. Production identity is designed for Better
            Auth with PostgreSQL sessions.
          </div>
        )}
        <Link className="setup-link" href="/forgot-password">
          Forgot password?
        </Link>
        {process.env.NODE_ENV === "production" &&
          process.env.AUTH_BOOTSTRAP_COMMISSIONER_EMAIL && (
            <Link className="setup-link" href="/bootstrap-commissioner">
              Create the first commissioner
            </Link>
          )}
      </Card>
    </div>
  );
}
