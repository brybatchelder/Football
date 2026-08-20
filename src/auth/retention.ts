import { lte } from "drizzle-orm";
import { getDb } from "@/db/client";
import { authRateLimits, authVerifications, sessions } from "@/db/schema";

const defaultRateLimitRetentionMs = 24 * 60 * 60 * 1_000;

export async function cleanupExpiredAuthData(
  now = new Date(),
  rateLimitRetentionMs = defaultRateLimitRetentionMs,
) {
  const db = getDb();
  return db.transaction(async (tx) => {
    const removedSessions = await tx
      .delete(sessions)
      .where(lte(sessions.expiresAt, now))
      .returning({ id: sessions.id });
    const removedVerifications = await tx
      .delete(authVerifications)
      .where(lte(authVerifications.expiresAt, now))
      .returning({ id: authVerifications.id });
    const removedRateLimits = await tx
      .delete(authRateLimits)
      .where(
        lte(authRateLimits.lastRequest, now.getTime() - rateLimitRetentionMs),
      )
      .returning({ key: authRateLimits.key });

    return {
      sessions: removedSessions.length,
      verifications: removedVerifications.length,
      rateLimits: removedRateLimits.length,
    };
  });
}
