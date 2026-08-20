import { Mail, ShieldCheck, UserRoundCheck, Users } from "lucide-react";
import { requirePermission } from "@/auth/permissions";
import { InviteOwnerForm } from "@/components/invite-owner-form";
import { FranchiseIdentityForm } from "@/components/franchise-identity-form";
import {
  FranchiseOwnerControls,
  LeagueMemberControls,
  RevokeInvitationControl,
} from "@/components/owner-access-controls";
import { Card, PageHeader } from "@/components/ui";
import { loadOwnerAdmin } from "@/data/owner-admin";

export default async function OwnersPage() {
  const viewer = await requirePermission(
    "manage_owners",
    "/commissioner/owners",
  );
  const data = await loadOwnerAdmin(viewer);
  return (
    <div className="page owner-admin-page">
      <PageHeader
        eyebrow="Commissioner · Access control"
        title="Owners & Franchises"
        description="Invite owners, verify season-scoped franchise access, and keep commissioner authority separate from platform administration."
      />
      {!data.available ? (
        <Card title="Database connection required">
          <p className="feature-copy">
            Owner administration is intentionally unavailable in the demo-data
            fallback because every change must be durable and audited.
          </p>
        </Card>
      ) : (
        <>
          <div className="grid-3 owner-admin-summary">
            <Card title="Franchises">
              <strong>{data.franchises.length}</strong>
              <span>current league identities</span>
            </Card>
            <Card title="Active owner access">
              <strong>
                {
                  data.franchises
                    .flatMap((franchise) => franchise.owners)
                    .filter((owner) => owner.active).length
                }
              </strong>
              <span>franchise memberships</span>
            </Card>
            <Card title="Pending invitations">
              <strong>{data.invitations.length}</strong>
              <span>awaiting acceptance</span>
            </Card>
          </div>
          <div className="owner-admin-layout">
            <section className="stack">
              <Card title="Franchise ownership">
                <div className="owner-franchise-list">
                  {data.franchises.map((franchise) => (
                    <article key={franchise.id}>
                      <span className="franchise-mark">
                        {franchise.abbreviation}
                      </span>
                      <div>
                        <strong>{franchise.name}</strong>
                        {franchise.owners.length ? (
                          franchise.owners.map((owner) => (
                            <div
                              key={owner.membershipId}
                              className={`owner-membership-row ${owner.active ? "" : "inactive"}`}
                            >
                              <span className="owner-membership-identity">
                                <UserRoundCheck size={14} /> {owner.name} ·{" "}
                                {owner.email}
                                {owner.isPrimary && <em>Primary</em>}
                              </span>
                              <FranchiseOwnerControls
                                active={owner.active}
                                isPrimary={owner.isPrimary}
                                membershipId={owner.membershipId}
                                ownerName={owner.name}
                              />
                            </div>
                          ))
                        ) : (
                          <span>
                            <Users size={14} /> No owner assigned
                          </span>
                        )}
                        <details className="franchise-identity-editor">
                          <summary>Edit identity & branding</summary>
                          <FranchiseIdentityForm franchise={franchise} />
                        </details>
                      </div>
                    </article>
                  ))}
                </div>
              </Card>
              <Card title="League access">
                <div className="owner-manager-list">
                  {data.leagueMembers.map((member) => (
                    <div
                      className={member.active ? "" : "inactive"}
                      key={member.membershipId}
                    >
                      <ShieldCheck size={14} />
                      <b>{member.name}</b>
                      <small>
                        {member.email} · {member.role.replaceAll("_", " ")} ·{" "}
                        {member.active ? "Active" : "Inactive"}
                      </small>
                      {member.userId === viewer.user?.id && member.active ? (
                        <em>You</em>
                      ) : member.role === "system_administrator" ? (
                        <em>Platform managed</em>
                      ) : (
                        <LeagueMemberControls
                          active={member.active}
                          memberName={member.name}
                          membershipId={member.membershipId}
                          role={member.role}
                        />
                      )}
                    </div>
                  ))}
                  {!data.leagueMembers.length && (
                    <p className="subtle">
                      No database-backed league memberships.
                    </p>
                  )}
                </div>
              </Card>
            </section>
            <aside className="stack">
              <Card title="Invite an owner">
                <InviteOwnerForm franchises={data.franchises} />
              </Card>
              <Card title="Pending invitations">
                <div className="owner-invitation-list">
                  {data.invitations.map((invitation) => {
                    const franchise = data.franchises.find(
                      (item) => item.id === invitation.franchiseId,
                    );
                    return (
                      <div key={invitation.id}>
                        <Mail size={14} />
                        <b>{invitation.email}</b>
                        <small>
                          {franchise?.name ?? "League access"} ·{" "}
                          {invitation.role.replaceAll("_", " ")} · expires{" "}
                          {invitation.expiresAt.toLocaleDateString("en-US")}
                        </small>
                        <RevokeInvitationControl
                          email={invitation.email}
                          invitationId={invitation.id}
                        />
                      </div>
                    );
                  })}
                  {!data.invitations.length && (
                    <p className="subtle">No invitations are waiting.</p>
                  )}
                </div>
              </Card>
            </aside>
          </div>
        </>
      )}
    </div>
  );
}
