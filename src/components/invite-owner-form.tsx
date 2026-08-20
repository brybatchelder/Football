"use client";

import { useActionState } from "react";
import { Send } from "lucide-react";
import {
  inviteOwner,
  type InviteOwnerState,
} from "@/app/commissioner/owners/actions";

const initialState: InviteOwnerState = { status: "idle" };

export function InviteOwnerForm({
  franchises,
}: {
  franchises: Array<{ id: string; name: string }>;
}) {
  const [state, action, pending] = useActionState(inviteOwner, initialState);
  return (
    <form action={action} className="invite-owner-form">
      <div className="field">
        <label htmlFor="owner-email">Owner email</label>
        <input
          className="input"
          id="owner-email"
          name="email"
          required
          type="email"
        />
      </div>
      <div className="field">
        <label htmlFor="owner-role">Access level</label>
        <select
          className="select"
          defaultValue="owner"
          id="owner-role"
          name="role"
        >
          <option value="owner">Owner</option>
          <option value="assistant_commissioner">Assistant commissioner</option>
          <option value="commissioner">Commissioner</option>
        </select>
      </div>
      <div className="field">
        <label htmlFor="owner-franchise">Franchise</label>
        <select className="select" id="owner-franchise" name="franchiseId">
          <option value="">League access only</option>
          {franchises.map((franchise) => (
            <option key={franchise.id} value={franchise.id}>
              {franchise.name}
            </option>
          ))}
        </select>
      </div>
      <button className="btn btn-primary" disabled={pending} type="submit">
        <Send size={14} /> {pending ? "Sending…" : "Send invitation"}
      </button>
      {state.status !== "idle" && (
        <div
          className={`notice ${state.status === "success" ? "notice-info" : ""}`}
          role="status"
        >
          {state.message}
        </div>
      )}
    </form>
  );
}
