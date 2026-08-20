"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  revokeOwnerInvitation,
  setFranchiseMembershipStatus,
  setLeagueMembershipRole,
  setLeagueMembershipStatus,
  setPrimaryFranchiseOwner,
  type OwnerAdminActionState,
} from "@/app/commissioner/owners/actions";

type OwnerAction = (formData: FormData) => Promise<OwnerAdminActionState>;
type LeagueRole =
  "visitor" | "owner" | "assistant_commissioner" | "commissioner";

const idleState: OwnerAdminActionState = { status: "idle" };

export function FranchiseOwnerControls({
  membershipId,
  ownerName,
  active,
  isPrimary,
}: {
  membershipId: string;
  ownerName: string;
  active: boolean;
  isPrimary: boolean;
}) {
  const primary = useOwnerMutation(setPrimaryFranchiseOwner);
  const access = useOwnerMutation(
    setFranchiseMembershipStatus,
    active
      ? `Remove ${ownerName}'s access to this franchise for the current season?`
      : undefined,
  );

  return (
    <div className="owner-inline-controls">
      {active && !isPrimary && (
        <form onSubmit={primary.submit}>
          <input name="membershipId" type="hidden" value={membershipId} />
          <button
            className="setup-link"
            disabled={primary.pending}
            type="submit"
          >
            {primary.pending ? "Saving…" : "Make primary"}
          </button>
          <OwnerActionFeedback state={primary.state} />
        </form>
      )}
      <form onSubmit={access.submit}>
        <input name="membershipId" type="hidden" value={membershipId} />
        <input name="active" type="hidden" value={active ? "false" : "true"} />
        <button
          className={
            active ? "setup-link owner-destructive-action" : "setup-link"
          }
          disabled={access.pending}
          type="submit"
        >
          {access.pending
            ? "Updating…"
            : active
              ? "Remove access"
              : "Restore access"}
        </button>
        <OwnerActionFeedback state={access.state} />
      </form>
    </div>
  );
}

export function LeagueMemberControls({
  membershipId,
  memberName,
  role,
  active,
}: {
  membershipId: string;
  memberName: string;
  role: LeagueRole;
  active: boolean;
}) {
  const roleChange = useOwnerMutation(
    setLeagueMembershipRole,
    `Change ${memberName}'s league role? This can add or remove commissioner authority.`,
  );
  const access = useOwnerMutation(
    setLeagueMembershipStatus,
    active
      ? `Remove all league and current-season franchise access for ${memberName}?`
      : undefined,
  );

  return (
    <div className="owner-manager-actions">
      <form onSubmit={roleChange.submit}>
        <input name="membershipId" type="hidden" value={membershipId} />
        <select
          aria-label={`Role for ${memberName}`}
          className="select"
          defaultValue={role}
          disabled={roleChange.pending || access.pending}
          name="role"
        >
          <option disabled value="visitor">
            Visitor (legacy)
          </option>
          <option value="owner">Owner</option>
          <option value="assistant_commissioner">Assistant commissioner</option>
          <option value="commissioner">Commissioner</option>
        </select>
        <button
          className="setup-link"
          disabled={roleChange.pending || access.pending}
          type="submit"
        >
          {roleChange.pending ? "Saving…" : "Save role"}
        </button>
        <OwnerActionFeedback state={roleChange.state} />
      </form>
      <form onSubmit={access.submit}>
        <input name="membershipId" type="hidden" value={membershipId} />
        <input name="active" type="hidden" value={active ? "false" : "true"} />
        <button
          className={
            active ? "setup-link owner-destructive-action" : "setup-link"
          }
          disabled={roleChange.pending || access.pending}
          type="submit"
        >
          {access.pending
            ? "Updating…"
            : active
              ? "Remove all access"
              : "Restore league access"}
        </button>
        <OwnerActionFeedback state={access.state} />
      </form>
    </div>
  );
}

export function RevokeInvitationControl({
  invitationId,
  email,
}: {
  invitationId: string;
  email: string;
}) {
  const revoke = useOwnerMutation(
    revokeOwnerInvitation,
    `Revoke the pending invitation for ${email}? Its current link will stop working.`,
  );
  return (
    <form className="owner-invitation-action" onSubmit={revoke.submit}>
      <input name="invitationId" type="hidden" value={invitationId} />
      <button
        className="setup-link owner-destructive-action"
        disabled={revoke.pending}
        type="submit"
      >
        {revoke.pending ? "Revoking…" : "Revoke"}
      </button>
      <OwnerActionFeedback state={revoke.state} />
    </form>
  );
}

function useOwnerMutation(action: OwnerAction, confirmation?: string) {
  const router = useRouter();
  const [state, setState] = useState<OwnerAdminActionState>(idleState);
  const [pending, startTransition] = useTransition();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (confirmation && !window.confirm(confirmation)) return;
    const formData = new FormData(event.currentTarget);
    setState(idleState);
    startTransition(async () => {
      try {
        const result = await action(formData);
        setState(result);
        if (result.status === "success") router.refresh();
      } catch {
        setState({
          status: "error",
          message: "The change could not be completed. Refresh and retry.",
        });
      }
    });
  }

  return { state, pending, submit };
}

function OwnerActionFeedback({ state }: { state: OwnerAdminActionState }) {
  if (state.status === "idle") return null;
  return (
    <small
      className={`owner-action-feedback ${state.status}`}
      role={state.status === "error" ? "alert" : "status"}
    >
      {state.message}
    </small>
  );
}
