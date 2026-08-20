import { closeDatabase, getDb } from "./client";
import {
  verifyRestoredDatabase,
  sameDatabaseTarget,
  type RestoreVerificationDatabase,
} from "./restore-verification";

const restoreUrl = process.env.RESTORE_DATABASE_URL?.trim();
if (!restoreUrl) throw new Error("RESTORE_DATABASE_URL is required");
if (sameDatabaseTarget(restoreUrl, process.env.DATABASE_URL)) {
  throw new Error(
    "RESTORE_DATABASE_URL must not point to the current application database",
  );
}
const leagueSlug =
  process.env.RESTORE_EXPECTED_LEAGUE_SLUG?.trim() ||
  process.env.FOFL_LEAGUE_SLUG?.trim();
if (!leagueSlug) {
  throw new Error("RESTORE_EXPECTED_LEAGUE_SLUG is required");
}

process.env.DATABASE_URL = restoreUrl;
try {
  const report = await verifyRestoredDatabase(
    getDb() as unknown as RestoreVerificationDatabase,
    leagueSlug,
  );
  console.log(
    JSON.stringify({
      status: "passed",
      ...report,
      checkedAt: new Date().toISOString(),
    }),
  );
} finally {
  await closeDatabase();
}
