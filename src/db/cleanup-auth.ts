import { cleanupExpiredAuthData } from "@/auth/retention";
import { closeDatabase } from "@/db/client";

try {
  const removed = await cleanupExpiredAuthData();
  console.info(JSON.stringify({ status: "succeeded", removed }));
} catch {
  console.error("Authentication data cleanup failed.");
  process.exitCode = 1;
} finally {
  await closeDatabase();
}
