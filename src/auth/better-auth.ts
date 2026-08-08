import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { getDb } from "@/db/client";
import { accounts, sessions, users } from "@/db/schema";

export function createAuth() {
  return betterAuth({
    database: drizzleAdapter(getDb(), {
      provider: "pg",
      schema: { user: users, session: sessions, account: accounts },
    }),
    secret: process.env.BETTER_AUTH_SECRET,
    baseURL: process.env.BETTER_AUTH_URL,
    emailAndPassword: { enabled: true, requireEmailVerification: true },
    advanced: { useSecureCookies: process.env.NODE_ENV === "production" },
  });
}
