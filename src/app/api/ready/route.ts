import { NextResponse } from "next/server";
import {
  productionConfigIssues,
  parseConfiguredSeason,
} from "@/config/production";
import { checkApplicationDatabase } from "@/db/readiness";

export async function GET() {
  const issues = productionConfigIssues(process.env);
  const database = issues.some((issue) => issue.variable === "DATABASE_URL")
    ? ({ ok: false, reason: "configuration_invalid" } as const)
    : await checkApplicationDatabase(
        process.env.FOFL_LEAGUE_SLUG?.trim() || "fofl",
        parseConfiguredSeason(process.env.MFL_SEASON),
      );
  const ready = issues.length === 0 && database.ok;
  return NextResponse.json(
    {
      status: ready ? "ready" : "degraded",
      configuration: { ok: issues.length === 0, issues },
      database,
    },
    {
      status: ready ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
