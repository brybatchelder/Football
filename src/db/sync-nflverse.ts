import { closeDatabase } from "./client";
import { syncNflversePlayers } from "../nflverse/player-sync";

const season = Number(
  process.env.NFLVERSE_SEASON ?? process.env.MFL_SEASON ?? 2026,
);

if (!Number.isInteger(season) || season < 2000 || season > 2100) {
  throw new Error(`Invalid NFL season: ${season}`);
}

try {
  const result = await syncNflversePlayers({ dryRun: false, season });
  console.log(JSON.stringify(result, null, 2));
} finally {
  await closeDatabase();
}
