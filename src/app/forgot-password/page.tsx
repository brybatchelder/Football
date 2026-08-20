import { Card, PageHeader } from "@/components/ui";
import { PasswordResetRequestForm } from "@/components/auth-forms";
export default function ForgotPage() {
  return (
    <div className="page" style={{ maxWidth: 720 }}>
      <PageHeader
        title="Reset password"
        description="Request a time-limited recovery link for your verified FOFL owner account."
      />
      <Card>
        <PasswordResetRequestForm />
        {process.env.NODE_ENV !== "production" && (
          <p className="subtle">
            Development requests are accepted, but delivery requires the email
            environment variables used in production.
          </p>
        )}
      </Card>
    </div>
  );
}
