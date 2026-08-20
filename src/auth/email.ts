import "server-only";

import { createHash } from "node:crypto";

type AuthEmail = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

export async function sendAuthEmail(message: AuthEmail) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.AUTH_EMAIL_FROM;

  if (!apiKey || !from) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Authentication email delivery is not configured");
    }
    console.info(
      `[auth-email] Delivery skipped for ${message.to}: ${message.subject}`,
    );
    return { delivered: false as const };
  }

  const payload = JSON.stringify({ from, ...message });
  const idempotencyKey = `fofl-${createHash("sha256").update(payload).digest("hex")}`;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    let response: Response;
    try {
      response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          authorization: `Bearer ${apiKey}`,
          "content-type": "application/json",
          "idempotency-key": idempotencyKey,
          "user-agent": "FOFL/1.0 transactional-email",
        },
        body: payload,
        signal: AbortSignal.timeout(10_000),
      });
    } catch (error) {
      if (attempt === 3) {
        throw new Error("Authentication email delivery failed (network)", {
          cause: error,
        });
      }
      await delay(250 * attempt);
      continue;
    }

    const body = await responseJson(response);
    if (response.ok) {
      const deliveryId =
        body && typeof body.id === "string" ? body.id : undefined;
      if (!deliveryId) {
        throw new Error(
          "Authentication email delivery failed (invalid provider response)",
        );
      }
      console.info("[auth-email] Delivered through Resend.", { deliveryId });
      return { delivered: true as const, deliveryId };
    }

    if (attempt < 3 && isRetryable(response.status, body?.name)) {
      await delay(retryDelay(response, attempt));
      continue;
    }
    throw new Error(
      `Authentication email delivery failed (${response.status})`,
    );
  }
  throw new Error("Authentication email delivery failed");
}

export function verificationEmail(url: string) {
  return {
    subject: "Verify your FOFL account",
    text: `Verify your FOFL account: ${url}`,
    html: `<p>Verify your FOFL account to access your franchise.</p><p><a href="${escapeHtml(url)}">Verify account</a></p><p>This link expires in one hour.</p>`,
  };
}

export function passwordResetEmail(url: string) {
  return {
    subject: "Reset your FOFL password",
    text: `Reset your FOFL password: ${url}`,
    html: `<p>A password reset was requested for your FOFL account.</p><p><a href="${escapeHtml(url)}">Reset password</a></p><p>This link expires in one hour. Ignore this message if you did not request it.</p>`,
  };
}

export function ownerInvitationEmail(input: {
  url: string;
  leagueName: string;
  franchiseName?: string | null;
  expiresAt: Date;
}) {
  const destination = input.franchiseName
    ? `${input.franchiseName} in ${input.leagueName}`
    : input.leagueName;
  return {
    subject: `Your ${input.leagueName} invitation`,
    text: `You were invited to manage ${destination}. Accept the invitation: ${input.url}`,
    html: `<p>You were invited to manage ${escapeHtml(destination)}.</p><p><a href="${escapeHtml(input.url)}">Accept invitation</a></p><p>This invitation expires ${escapeHtml(input.expiresAt.toLocaleString("en-US"))}.</p>`,
  };
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

async function responseJson(response: Response) {
  try {
    const value: unknown = await response.json();
    return value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : undefined;
  } catch {
    return undefined;
  }
}

function isRetryable(status: number, providerError: unknown) {
  return (
    status >= 500 ||
    (status === 409 && providerError === "concurrent_idempotent_requests") ||
    (status === 429 &&
      providerError !== "daily_quota_exceeded" &&
      providerError !== "monthly_quota_exceeded")
  );
}

function retryDelay(response: Response, attempt: number) {
  const retryAfter = Number(response.headers.get("retry-after"));
  if (Number.isFinite(retryAfter) && retryAfter >= 0) {
    return Math.min(retryAfter * 1_000, 2_000);
  }
  return 250 * attempt;
}

function delay(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
