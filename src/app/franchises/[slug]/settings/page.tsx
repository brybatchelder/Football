import { redirect, notFound } from "next/navigation";
import { currentViewer } from "@/auth/permissions";
import { FranchiseIdentityForm } from "@/components/franchise-identity-form";
import { Card, PageHeader } from "@/components/ui";
import { loadFranchiseProfile } from "@/data/franchise-profile";
import { hasPermission } from "@/domain/league-rules";

export default async function FranchiseSettingsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [profile, viewer] = await Promise.all([
    loadFranchiseProfile(slug),
    currentViewer(),
  ]);
  if (!profile) notFound();
  const canManage =
    viewer.league?.id === profile.leagueId &&
    (hasPermission(viewer.role, "manage_owners") ||
      viewer.franchises.some((franchise) => franchise.id === profile.id));
  if (!canManage) {
    redirect(
      `/sign-in?reason=${viewer.authenticated ? "permission" : "authentication"}&next=${encodeURIComponent(`/franchises/${slug}/settings`)}`,
    );
  }

  return (
    <div className="page franchise-settings-page">
      <PageHeader
        eyebrow={`${profile.leagueName} · Franchise settings`}
        title={profile.name}
        description="Manage the public team identity shown throughout FOFL. Name changes are retained in franchise history."
      />
      <Card title="Identity & branding">
        <FranchiseIdentityForm franchise={profile} />
      </Card>
      <Card title="Ownership boundary">
        <p className="feature-copy">
          This page changes display identity only. Owner assignments, league
          access, and primary-owner status remain commissioner-controlled and
          audited.
        </p>
      </Card>
    </div>
  );
}
