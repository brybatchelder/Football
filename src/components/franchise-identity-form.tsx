"use client";

import { useActionState } from "react";
import {
  updateFranchiseIdentity,
  type FranchiseIdentityState,
} from "@/app/commissioner/owners/actions";

type FranchiseIdentity = {
  id: string;
  name: string;
  abbreviation: string;
  primaryColor: string | null;
  secondaryColor: string | null;
  logoUrl: string | null;
};

const initialState: FranchiseIdentityState = { status: "idle" };

export function FranchiseIdentityForm({
  franchise,
}: {
  franchise: FranchiseIdentity;
}) {
  const [state, action, pending] = useActionState(
    updateFranchiseIdentity,
    initialState,
  );

  return (
    <form action={action} className="franchise-identity-form">
      <input name="franchiseId" type="hidden" value={franchise.id} />
      <label>
        Display name
        <input
          defaultValue={franchise.name}
          maxLength={80}
          name="name"
          required
        />
      </label>
      <label>
        Abbreviation
        <input
          defaultValue={franchise.abbreviation}
          maxLength={6}
          minLength={2}
          name="abbreviation"
          required
        />
      </label>
      <label>
        Primary color
        <input
          defaultValue={franchise.primaryColor ?? "#123044"}
          name="primaryColor"
          type="color"
        />
      </label>
      <label>
        Secondary color
        <input
          defaultValue={franchise.secondaryColor ?? "#d9a441"}
          name="secondaryColor"
          type="color"
        />
      </label>
      <label className="franchise-logo-field">
        Logo URL
        <input
          defaultValue={franchise.logoUrl ?? ""}
          inputMode="url"
          name="logoUrl"
          placeholder="https://…"
          type="url"
        />
      </label>
      {state.status !== "idle" && (
        <p className={`form-status ${state.status}`} role="status">
          {state.message}
        </p>
      )}
      <button className="btn btn-primary" disabled={pending} type="submit">
        {pending ? "Saving…" : "Save identity"}
      </button>
    </form>
  );
}
