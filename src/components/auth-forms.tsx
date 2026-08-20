"use client";

import { useState } from "react";
import { LogIn, Mail, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";

type FormStatus = { tone: "error" | "success"; message: string } | null;

export function ProductionSignInForm({
  callbackURL = "/league",
}: {
  callbackURL?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<FormStatus>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setStatus(null);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/auth/sign-in/email", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: form.get("email"),
          password: form.get("password"),
          rememberMe: form.get("rememberMe") === "on",
          callbackURL,
        }),
      });
      if (!response.ok) {
        const result = (await response.json().catch(() => null)) as {
          message?: string;
        } | null;
        throw new Error(result?.message ?? "Email or password is incorrect.");
      }
      router.push(callbackURL);
      router.refresh();
    } catch (error) {
      setStatus({
        tone: "error",
        message:
          error instanceof Error
            ? error.message
            : "Sign in could not be completed.",
      });
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <div className="field">
        <label htmlFor="sign-in-email">Email address</label>
        <input
          autoComplete="email"
          className="input"
          id="sign-in-email"
          name="email"
          required
          type="email"
        />
      </div>
      <div className="field" style={{ marginTop: 14 }}>
        <label htmlFor="sign-in-password">Password</label>
        <input
          autoComplete="current-password"
          className="input"
          id="sign-in-password"
          minLength={12}
          name="password"
          required
          type="password"
        />
      </div>
      <label className="auth-checkbox">
        <input defaultChecked name="rememberMe" type="checkbox" />
        Keep me signed in on this device
      </label>
      {status && (
        <div className="notice" role="alert">
          {status.message}
        </div>
      )}
      <button className="btn btn-primary" disabled={busy} type="submit">
        <LogIn size={15} /> {busy ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}

export function InvitationRegistrationForm({
  email,
  token,
}: {
  email: string;
  token: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<FormStatus>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setStatus(null);
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    if (password !== String(form.get("confirmation") ?? "")) {
      setStatus({ tone: "error", message: "Passwords do not match." });
      setBusy(false);
      return;
    }
    try {
      const response = await fetch("/api/auth/sign-up/email", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-fofl-invitation": token,
        },
        body: JSON.stringify({
          name: form.get("name"),
          email,
          password,
          callbackURL: "/league",
        }),
      });
      if (!response.ok) {
        const result = (await response.json().catch(() => null)) as {
          message?: string;
        } | null;
        throw new Error(
          result?.message ??
            "This invitation could not create an account. Sign in if you already have one.",
        );
      }
      const signInResponse = await fetch("/api/auth/sign-in/email", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          rememberMe: true,
          callbackURL: "/league",
        }),
      });
      if (!signInResponse.ok) {
        router.push("/sign-in?registered=1&next=%2Fleague");
        router.refresh();
        return;
      }
      router.push("/league");
      router.refresh();
    } catch (error) {
      setStatus({
        tone: "error",
        message:
          error instanceof Error ? error.message : "Account creation failed.",
      });
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <div className="field">
        <label htmlFor="invite-name">Your name</label>
        <input
          autoComplete="name"
          className="input"
          id="invite-name"
          minLength={2}
          name="name"
          required
        />
      </div>
      <div className="field" style={{ marginTop: 14 }}>
        <label htmlFor="invite-email">Email address</label>
        <input
          className="input"
          id="invite-email"
          readOnly
          type="email"
          value={email}
        />
      </div>
      <div className="field" style={{ marginTop: 14 }}>
        <label htmlFor="invite-password">Create password</label>
        <input
          autoComplete="new-password"
          className="input"
          id="invite-password"
          minLength={12}
          name="password"
          required
          type="password"
        />
      </div>
      <div className="field" style={{ marginTop: 14 }}>
        <label htmlFor="invite-confirmation">Confirm password</label>
        <input
          autoComplete="new-password"
          className="input"
          id="invite-confirmation"
          minLength={12}
          name="confirmation"
          required
          type="password"
        />
      </div>
      {status && (
        <div className="notice" role="alert" style={{ marginTop: 14 }}>
          {status.message}
        </div>
      )}
      <button
        className="btn btn-primary"
        disabled={busy}
        style={{ marginTop: 16 }}
        type="submit"
      >
        {busy ? "Creating account…" : "Create account & join FOFL"}
      </button>
    </form>
  );
}

export function BootstrapCommissionerForm({ email }: { email: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<FormStatus>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setStatus(null);
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    if (password !== String(form.get("confirmation") ?? "")) {
      setStatus({ tone: "error", message: "Passwords do not match." });
      setBusy(false);
      return;
    }
    try {
      const response = await fetch("/api/auth/sign-up/email", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          email,
          password,
          callbackURL: "/league",
        }),
      });
      if (!response.ok) {
        const result = (await response.json().catch(() => null)) as {
          message?: string;
        } | null;
        throw new Error(result?.message ?? "Bootstrap registration failed.");
      }
      router.push("/sign-in?registered=1");
      router.refresh();
    } catch (error) {
      setStatus({
        tone: "error",
        message:
          error instanceof Error
            ? error.message
            : "Bootstrap registration failed.",
      });
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <div className="field">
        <label htmlFor="bootstrap-name">Commissioner name</label>
        <input
          className="input"
          id="bootstrap-name"
          minLength={2}
          name="name"
          required
        />
      </div>
      <div className="field" style={{ marginTop: 14 }}>
        <label htmlFor="bootstrap-email">Verified email address</label>
        <input
          className="input"
          id="bootstrap-email"
          readOnly
          type="email"
          value={email}
        />
      </div>
      <div className="field" style={{ marginTop: 14 }}>
        <label htmlFor="bootstrap-password">Create password</label>
        <input
          autoComplete="new-password"
          className="input"
          id="bootstrap-password"
          minLength={12}
          name="password"
          required
          type="password"
        />
      </div>
      <div className="field" style={{ marginTop: 14 }}>
        <label htmlFor="bootstrap-confirmation">Confirm password</label>
        <input
          autoComplete="new-password"
          className="input"
          id="bootstrap-confirmation"
          minLength={12}
          name="confirmation"
          required
          type="password"
        />
      </div>
      {status && (
        <div className="notice" role="alert" style={{ marginTop: 14 }}>
          {status.message}
        </div>
      )}
      <button
        className="btn btn-primary"
        disabled={busy}
        style={{ marginTop: 16 }}
        type="submit"
      >
        {busy ? "Creating commissioner…" : "Create first commissioner"}
      </button>
    </form>
  );
}

export function PasswordResetRequestForm() {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<FormStatus>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setStatus(null);
    const email = new FormData(event.currentTarget).get("email");
    try {
      const response = await fetch("/api/auth/request-password-reset", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email,
          redirectTo: `${window.location.origin}/reset-password`,
        }),
      });
      if (!response.ok) throw new Error("The reset request could not be sent.");
      setStatus({
        tone: "success",
        message:
          "If that address belongs to an FOFL account, a reset link is on the way.",
      });
    } catch (error) {
      setStatus({
        tone: "error",
        message:
          error instanceof Error
            ? error.message
            : "The request could not be sent.",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <div className="field">
        <label htmlFor="reset-email">Email address</label>
        <input
          autoComplete="email"
          className="input"
          id="reset-email"
          name="email"
          required
          type="email"
        />
      </div>
      {status && (
        <div
          className={`notice ${status.tone === "success" ? "notice-info" : ""}`}
          role="status"
          style={{ marginTop: 14 }}
        >
          {status.message}
        </div>
      )}
      <button
        className="btn btn-primary"
        disabled={busy}
        style={{ marginTop: 15 }}
        type="submit"
      >
        <Mail size={15} /> {busy ? "Sending…" : "Request reset link"}
      </button>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<FormStatus>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setStatus(null);
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirmation = String(form.get("confirmation") ?? "");
    if (password !== confirmation) {
      setStatus({ tone: "error", message: "Passwords do not match." });
      setBusy(false);
      return;
    }
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ newPassword: password, token }),
      });
      if (!response.ok)
        throw new Error("This reset link is invalid or expired.");
      setStatus({
        tone: "success",
        message: "Password updated. You can now sign in.",
      });
    } catch (error) {
      setStatus({
        tone: "error",
        message:
          error instanceof Error ? error.message : "Password reset failed.",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <div className="field">
        <label htmlFor="new-password">New password</label>
        <input
          autoComplete="new-password"
          className="input"
          id="new-password"
          minLength={12}
          name="password"
          required
          type="password"
        />
      </div>
      <div className="field" style={{ marginTop: 14 }}>
        <label htmlFor="confirm-password">Confirm password</label>
        <input
          autoComplete="new-password"
          className="input"
          id="confirm-password"
          minLength={12}
          name="confirmation"
          required
          type="password"
        />
      </div>
      {status && (
        <div
          className={`notice ${status.tone === "success" ? "notice-info" : ""}`}
          role="status"
          style={{ marginTop: 14 }}
        >
          {status.message}
        </div>
      )}
      <button
        className="btn btn-primary"
        disabled={busy || !token}
        style={{ marginTop: 15 }}
        type="submit"
      >
        <RotateCcw size={15} /> {busy ? "Updating…" : "Update password"}
      </button>
    </form>
  );
}
