import { NextResponse } from "next/server";
import { checkDatabase } from "@/db/client";
export async function GET() {
  const database = await checkDatabase();
  return NextResponse.json(
    { status: database.ok ? "ready" : "degraded", database },
    { status: database.ok ? 200 : 503 },
  );
}
