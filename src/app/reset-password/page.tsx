import Link from "next/link";
import { ResetPasswordForm } from "@/components/auth-forms";
import { Card, PageHeader } from "@/components/ui";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const { token = "", error } = await searchParams;
  return (
    <div className="page" style={{ maxWidth: 720 }}>
      <PageHeader
        title="Choose a new password"
        description="Recovery links are single-use and expire after one hour."
      />
      <Card title="Reset FOFL password">
        {error || !token ? (
          <div className="notice" role="alert">
            This recovery link is invalid or expired. Request a new one below.
          </div>
        ) : (
          <ResetPasswordForm token={token} />
        )}
        <Link className="setup-link" href="/forgot-password">
          Request another reset link
        </Link>
      </Card>
    </div>
  );
}
