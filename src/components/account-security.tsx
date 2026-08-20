"use client";

import { useCallback, useState } from "react";
import {
  KeyRound,
  MonitorSmartphone,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useRouter } from "next/navigation";

export type SessionSummary = {
  id: string;
  createdAt: string;
  expiresAt: string;
  ipAddress?: string | null;
  userAgent?: string | null;
};

type Feedback = { tone: "error" | "success"; message: string } | null;

async function responseMessage(response: Response, fallback: string) {
  const result = (await response.json().catch(() => null)) as {
    message?: string;
    code?: string;
  } | null;
  return result?.message ?? result?.code?.replaceAll("_", " ") ?? fallback;
}

export function AccountSecurity({
  currentName,
  initialSessions,
  initialSessionError,
}: {
  currentName: string;
  initialSessions: SessionSummary[];
  initialSessionError?: string;
}) {
  const router = useRouter();
  const [sessions, setSessions] = useState<SessionSummary[]>(initialSessions);
  const [sessionFeedback, setSessionFeedback] = useState<Feedback>(
    initialSessionError
      ? { tone: "error", message: initialSessionError }
      : null,
  );
  const [profileFeedback, setProfileFeedback] = useState<Feedback>(null);
  const [passwordFeedback, setPasswordFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState<"profile" | "password" | "sessions" | null>(
    null,
  );

  const loadSessions = useCallback(async () => {
    const response = await fetch("/api/auth/list-sessions", {
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error(
        await responseMessage(
          response,
          "Active sessions could not be loaded. Sign in again and retry.",
        ),
      );
    }
    setSessions((await response.json()) as SessionSummary[]);
  }, []);

  async function updateProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy("profile");
    setProfileFeedback(null);
    const name = String(
      new FormData(event.currentTarget).get("name") ?? "",
    ).trim();
    try {
      const response = await fetch("/api/auth/update-user", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!response.ok) {
        throw new Error(
          await responseMessage(response, "Profile update failed."),
        );
      }
      setProfileFeedback({ tone: "success", message: "Profile name updated." });
      router.refresh();
    } catch (error) {
      setProfileFeedback({
        tone: "error",
        message:
          error instanceof Error ? error.message : "Profile update failed.",
      });
    } finally {
      setBusy(null);
    }
  }

  async function changePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const newPassword = String(form.get("newPassword") ?? "");
    if (newPassword !== String(form.get("confirmation") ?? "")) {
      setPasswordFeedback({
        tone: "error",
        message: "Passwords do not match.",
      });
      return;
    }
    setBusy("password");
    setPasswordFeedback(null);
    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          currentPassword: form.get("currentPassword"),
          newPassword,
          revokeOtherSessions: true,
        }),
      });
      if (!response.ok) {
        throw new Error(
          await responseMessage(response, "Password update failed."),
        );
      }
      formElement.reset();
      setPasswordFeedback({
        tone: "success",
        message: "Password updated and other sessions signed out.",
      });
      await loadSessions();
    } catch (error) {
      setPasswordFeedback({
        tone: "error",
        message:
          error instanceof Error ? error.message : "Password update failed.",
      });
    } finally {
      setBusy(null);
    }
  }

  async function revokeOtherSessions() {
    setBusy("sessions");
    setSessionFeedback(null);
    try {
      const response = await fetch("/api/auth/revoke-other-sessions", {
        method: "POST",
      });
      if (!response.ok) {
        throw new Error(
          await responseMessage(
            response,
            "Other sessions could not be revoked.",
          ),
        );
      }
      setSessionFeedback({
        tone: "success",
        message: "All other sessions have been signed out.",
      });
      await loadSessions();
    } catch (error) {
      setSessionFeedback({
        tone: "error",
        message:
          error instanceof Error
            ? error.message
            : "Other sessions could not be revoked.",
      });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="account-security-grid">
      <section className="account-security-panel">
        <h2>
          <UserRound size={17} /> Profile
        </h2>
        <form onSubmit={updateProfile}>
          <div className="field">
            <label htmlFor="account-name">Display name</label>
            <input
              className="input"
              defaultValue={currentName}
              id="account-name"
              maxLength={80}
              minLength={2}
              name="name"
              required
            />
          </div>
          {profileFeedback && <FeedbackMessage feedback={profileFeedback} />}
          <button className="btn" disabled={busy !== null} type="submit">
            {busy === "profile" ? "Saving…" : "Save profile"}
          </button>
        </form>
      </section>

      <section className="account-security-panel">
        <h2>
          <KeyRound size={17} /> Change password
        </h2>
        <form onSubmit={changePassword}>
          <div className="field">
            <label htmlFor="current-password">Current password</label>
            <input
              autoComplete="current-password"
              className="input"
              id="current-password"
              name="currentPassword"
              required
              type="password"
            />
          </div>
          <div className="field">
            <label htmlFor="account-new-password">New password</label>
            <input
              autoComplete="new-password"
              className="input"
              id="account-new-password"
              maxLength={128}
              minLength={12}
              name="newPassword"
              required
              type="password"
            />
          </div>
          <div className="field">
            <label htmlFor="account-confirmation">Confirm new password</label>
            <input
              autoComplete="new-password"
              className="input"
              id="account-confirmation"
              maxLength={128}
              minLength={12}
              name="confirmation"
              required
              type="password"
            />
          </div>
          {passwordFeedback && <FeedbackMessage feedback={passwordFeedback} />}
          <button className="btn" disabled={busy !== null} type="submit">
            {busy === "password" ? "Updating…" : "Update password"}
          </button>
        </form>
      </section>

      <section className="account-security-panel account-sessions-panel">
        <div className="account-security-heading">
          <h2>
            <MonitorSmartphone size={17} /> Active sessions
          </h2>
          <button
            className="setup-link"
            disabled={busy !== null}
            onClick={revokeOtherSessions}
            type="button"
          >
            {busy === "sessions" ? "Signing out…" : "Sign out other sessions"}
          </button>
        </div>
        {sessions.length ? (
          <div className="account-session-list">
            {sessions.map((session) => (
              <article key={session.id}>
                <ShieldCheck size={16} />
                <div>
                  <b>{describeSession(session)}</b>
                  <small>
                    Started{" "}
                    {new Date(session.createdAt).toLocaleString("en-US")} ·
                    expires{" "}
                    {new Date(session.expiresAt).toLocaleDateString("en-US")}
                  </small>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="subtle">No active sessions were returned.</p>
        )}
        {sessionFeedback && <FeedbackMessage feedback={sessionFeedback} />}
      </section>
    </div>
  );
}

function FeedbackMessage({ feedback }: { feedback: NonNullable<Feedback> }) {
  return (
    <p
      className={`notice ${feedback.tone === "success" ? "notice-info" : ""}`}
      role="status"
    >
      {feedback.message}
    </p>
  );
}

function describeSession(session: SessionSummary) {
  const agent = session.userAgent?.trim();
  if (agent) return agent.length > 72 ? `${agent.slice(0, 69)}…` : agent;
  return session.ipAddress
    ? `Session from ${session.ipAddress}`
    : "Authenticated session";
}
