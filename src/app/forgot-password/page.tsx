import { Card, PageHeader } from "@/components/ui";
export default function ForgotPage() {
  return (
    <div className="page" style={{ maxWidth: 720 }}>
      <PageHeader
        title="Reset password"
        description="Password recovery delivery is prepared for the production authentication milestone."
      />
      <Card>
        <form>
          <div className="field">
            <label>Email address</label>
            <input
              className="input"
              type="email"
              placeholder="owner@example.com"
            />
          </div>
          <button
            type="button"
            className="btn btn-primary"
            style={{ marginTop: 15 }}
          >
            Request reset link
          </button>
        </form>
        <p className="subtle">No email is sent in the demo environment.</p>
      </Card>
    </div>
  );
}
