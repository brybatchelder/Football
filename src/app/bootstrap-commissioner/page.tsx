import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  bootstrapAccountExists,
  canBootstrapCommissioner,
  grantBootstrapCommissioner,
  isBootstrapCommissionerEmail,
} from "@/auth/bootstrap";
import { currentViewer } from "@/auth/permissions";
import { BootstrapCommissionerForm } from "@/components/auth-forms";
import { Card, PageHeader } from "@/components/ui";

export default async function BootstrapCommissionerPage() {
  const email = process.env.AUTH_BOOTSTRAP_COMMISSIONER_EMAIL?.trim();
  if (!email) notFound();
  if (!(await canBootstrapCommissioner(email))) notFound();
  const [accountExists, viewer] = await Promise.all([
    bootstrapAccountExists(email),
    currentViewer(),
  ]);

  async function completeInterruptedBootstrap() {
    "use server";
    const current = await currentViewer();
    if (
      !current.authenticated ||
      !current.user ||
      !isBootstrapCommissionerEmail(current.user.email)
    ) {
      redirect("/sign-in?next=%2Fbootstrap-commissioner");
    }
    if (!(await canBootstrapCommissioner(current.user.email))) notFound();
    await grantBootstrapCommissioner(current.user.id, current.user.email);
    redirect("/league?bootstrapped=1");
  }

  return (
    <div className="page" style={{ maxWidth: 720 }}>
      <PageHeader
        eyebrow="One-time production setup"
        title="Create the first commissioner"
        description="This route accepts only the exact address configured by deployment. Verify the email, confirm commissioner access, then remove the bootstrap variable immediately."
      />
      <Card title="Commissioner identity">
        {accountExists ? (
          viewer.authenticated &&
          viewer.user &&
          isBootstrapCommissionerEmail(viewer.user.email) ? (
            <form action={completeInterruptedBootstrap}>
              <p className="feature-copy">
                The commissioner account exists, but its league grant did not
                finish. Complete the interrupted one-time setup while signed in
                as <strong>{viewer.user.email}</strong>.
              </p>
              <button className="btn btn-primary" type="submit">
                Complete commissioner setup
              </button>
            </form>
          ) : (
            <div className="notice notice-info" role="status">
              This commissioner account already exists. Verify its email, then{" "}
              <Link href="/sign-in?next=%2Fbootstrap-commissioner">
                sign in to complete setup
              </Link>
              .
            </div>
          )
        ) : (
          <BootstrapCommissionerForm email={email} />
        )}
      </Card>
    </div>
  );
}
