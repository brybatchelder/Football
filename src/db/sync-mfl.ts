import { closeDatabase } from "./client";
import { syncMflRoster } from "../mfl/live-sync";

const season = Number(process.env.MFL_SEASON ?? 2026);
const leagueId = process.env.MFL_LEAGUE_ID;
const baseUrl = process.env.MFL_BASE_URL ?? "https://www49.myfantasyleague.com";
const dryRun = process.argv.includes("--dry-run");

if (!leagueId) throw new Error("MFL_LEAGUE_ID is not configured");
if (!Number.isInteger(season)) throw new Error(`Invalid MFL_SEASON: ${season}`);

try {
  const result = await syncMflRoster({ dryRun, season, leagueId, baseUrl });
  console.log(JSON.stringify(result, null, 2));
} finally {
  await closeDatabase();
}
