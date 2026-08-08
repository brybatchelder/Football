import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/auth/permissions";
import { MflFixtureAdapter } from "@/mfl/provider";
const inputSchema = z.object({ dryRun: z.boolean() });
export async function POST(request: Request) {
  const correlationId = crypto.randomUUID();
  try {
    await requirePermission("manage_league");
    const body = inputSchema.parse(await request.json());
    const fixture = JSON.parse(
      await readFile(
        path.join(process.cwd(), "reference/mfl-fixtures/league-2026.json"),
        "utf8",
      ),
    ) as unknown;
    const result = await new MflFixtureAdapter().import(fixture, {
      dryRun: body.dryRun,
    });
    return NextResponse.json({
      correlationId,
      result,
      summary: `${body.dryRun ? "Dry run" : "Import"} complete: ${result.imported} imported, ${result.updated} updated, ${result.skipped} skipped, ${result.errors} errors; ${result.issues.length} issue needs review.`,
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
