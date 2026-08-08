import { NextResponse } from "next/server";
export function GET() {
  return NextResponse.json({
    status: "ok",
    service: "football-web",
    time: new Date().toISOString(),
  });
}
