import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/auth/permissions";
import { getPlayerSyncHistory, syncNflversePlayers } from "@/nflverse/player-sync";

const inputSchema = z.object({
  dryRun: z.boolean(),
  season: z.number().int().min(2026).max(2100).default(2026),
});

export async function GET() {
  try {
    await requirePermission("manage_league");
    return NextResponse.json({ runs: await getPlayerSyncHistory() });
  } catch {
    return NextResponse.json({ error: "Player sync history is unavailable" }, { status: 400 });
  }
}

export async function POST(request: Request) {
  const correlationId = crypto.randomUUID();
  try {
    await requirePermission("manage_league");
    const input = inputSchema.parse(await request.json());
    const result = await syncNflversePlayers(input);
    return NextResponse.json({
      correlationId,
      result,
      summary: `${input.dryRun ? "NFL player dry run" : "NFL player sync"} complete: ${result.playersSeen.toLocaleString()} checked, ${result.playersCreated.toLocaleString()} new, ${result.playersUpdated.toLocaleString()} updated, ${result.matchedAutomatically.toLocaleString()} existing FOFL players linked, ${result.reviewCount + result.unmatchedCount} require review, 0 ownership or contract records modified.`,
    });
  } catch (error) {
    return NextResponse.json(
      {
        correlationId,
        error: error instanceof z.ZodError ? "Invalid player sync request" : error instanceof Error ? error.message : "NFL player sync failed",
      },
      { status: 400 },
    );
  }
}
