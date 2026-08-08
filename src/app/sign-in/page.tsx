import { LogIn, ShieldCheck } from "lucide-react";
import { Card, PageHeader } from "@/components/ui";
export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const { reason } = await searchParams;
  return (
    <div className="page" style={{ maxWidth: 720 }}>
      <PageHeader
        eyebrow="Secure access"
        title="Sign in to Football"
        description="Development roles are isolated from production authentication and create secure, HTTP-only cookies."
      />
      {reason && (
        <div className="notice" style={{ marginBottom: 14 }}>
          Commissioner access is required for that page. Choose a development
          account below.
        </div>
      )}
      <Card title="Development account setup">
        <form method="post" action="/api/auth/dev-sign-in">
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
            <select className="select" name="role" defaultValue="commissioner">
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
        <div className="notice notice-info" style={{ marginTop: 16 }}>
          <ShieldCheck size={14} /> Development sign-in is disabled when
          NODE_ENV is production. Production identity is designed for Better
          Auth with PostgreSQL sessions.
        </div>
        <a className="setup-link" href="/forgot-password">
          Forgot password?
        </a>
      </Card>
    </div>
  );
}
