import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { getDb } from "@/db/client";
import {
  accounts,
  authRateLimits,
  authVerifications,
  sessions,
  users,
} from "@/db/schema";
import {
  passwordResetEmail,
  sendAuthEmail,
  verificationEmail,
} from "@/auth/email";
import { acceptInvitation, findValidInvitation } from "@/auth/invitations";
import {
  canBootstrapCommissioner,
  grantBootstrapCommissioner,
  isBootstrapCommissionerEmail,
} from "@/auth/bootstrap";

function buildAuth() {
  return betterAuth({
    database: drizzleAdapter(getDb(), {
      provider: "pg",
      schema: {
        user: users,
        session: sessions,
        account: accounts,
        verification: authVerifications,
        rateLimit: authRateLimits,
      },
    }),
    secret: process.env.BETTER_AUTH_SECRET,
    baseURL: process.env.BETTER_AUTH_URL,
    trustedOrigins: trustedOrigins(),
    emailVerification: {
      sendOnSignIn: true,
      sendOnSignUp: true,
      expiresIn: 60 * 60,
      async sendVerificationEmail({ user, url }) {
        await sendAuthEmail({ to: user.email, ...verificationEmail(url) });
      },
    },
    emailAndPassword: {
      enabled: true,
      disableSignUp: false,
      requireEmailVerification: true,
      minPasswordLength: 12,
      maxPasswordLength: 128,
      resetPasswordTokenExpiresIn: 60 * 60,
      revokeSessionsOnPasswordReset: true,
      async sendResetPassword({ user, url }) {
        await sendAuthEmail({ to: user.email, ...passwordResetEmail(url) });
      },
    },
    user: {
      additionalFields: {
        platformRole: {
          type: "string",
          required: false,
          defaultValue: "visitor",
          input: false,
        },
      },
    },
    rateLimit: {
      enabled: process.env.NODE_ENV === "production",
      storage: "database",
      window: 60,
      max: 100,
      customRules: {
        "/sign-in/email": { window: 60, max: 8 },
        "/request-password-reset": { window: 60 * 10, max: 3 },
        "/send-verification-email": { window: 60 * 10, max: 3 },
      },
    },
    databaseHooks: {
      user: {
        create: {
          async before(user, context) {
            if (isBootstrapCommissionerEmail(user.email)) {
              return (await canBootstrapCommissioner(user.email))
                ? undefined
                : false;
            }
            const invitationToken =
              context?.request?.headers.get("x-fofl-invitation");
            if (!invitationToken) return false;
            const invitation = await findValidInvitation(
              invitationToken,
              user.email,
            );
            if (!invitation) return false;
            return { data: { ...user, emailVerified: true } };
          },
          async after(user, context) {
            if (isBootstrapCommissionerEmail(user.email)) {
              await grantBootstrapCommissioner(user.id, user.email);
              return;
            }
            const invitationToken =
              context?.request?.headers.get("x-fofl-invitation");
            if (!invitationToken) return;
            const invitation = await findValidInvitation(
              invitationToken,
              user.email,
            );
            if (invitation) await acceptInvitation(invitation.id, user.id);
          },
        },
      },
    },
    advanced: {
      useSecureCookies: process.env.NODE_ENV === "production",
      database: { generateId: "uuid" },
    },
    plugins: [nextCookies()],
  });
}

type FootballAuth = ReturnType<typeof buildAuth>;
let authInstance: FootballAuth | undefined;

export function getAuth(): FootballAuth {
  if (!authInstance) authInstance = buildAuth();
  return authInstance;
}

/** Retained for scripts and callers created before the auth module was centralized. */
export const createAuth = getAuth;

function trustedOrigins() {
  return (process.env.BETTER_AUTH_TRUSTED_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}
