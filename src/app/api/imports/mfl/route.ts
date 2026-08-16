import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/auth/permissions";
import { syncMflRoster } from "@/mfl/live-sync";
const inputSchema = z.object({ dryRun: z.boolean() });
export async function POST(request: Request) {
  const correlationId = crypto.randomUUID();
  try {
    await requirePermission("manage_league");
    const body = inputSchema.parse(await request.json());
    const leagueId = process.env.MFL_LEAGUE_ID;
    if (!leagueId) throw new Error("MFL_LEAGUE_ID is not configured");
    const result = await syncMflRoster({
      dryRun: body.dryRun,
      season: Number(process.env.MFL_SEASON ?? 2026),
      leagueId,
      baseUrl:
        process.env.MFL_BASE_URL ?? "https://www49.myfantasyleague.com",
    });
    return NextResponse.json({
      correlationId,
      result,
      summary: `${body.dryRun ? "Dry run" : "Import"} complete: ${result.matched}/${result.rosterPlayersSeen} players matched, ${result.unmatched} need review, ${result.ownershipCreated} ownership records created, and ${result.ownershipUpdated} updated.`,
    });
  } catch (error) {
    return NextResponse.json(
      {
        correlationId,
        error:
          error instanceof z.ZodError
            ? "Invalid import request"
            : "Import could not be completed",
      },
      { status: 400 },
    );
  }
}
