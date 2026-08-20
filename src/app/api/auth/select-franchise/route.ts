import { NextResponse } from "next/server";
import { z } from "zod";
import { currentViewer } from "@/auth/viewer";

const inputSchema = z.object({ slug: z.string().min(1).max(100) });

export async function POST(request: Request) {
  const viewer = await currentViewer();
  if (!viewer.authenticated) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 },
    );
  }
  const parsed = inputSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid franchise" }, { status: 400 });
  }
  const franchise = viewer.franchises.find(
    (candidate) => candidate.slug === parsed.data.slug,
  );
  if (!franchise) {
    return NextResponse.json(
      { error: "Franchise access denied" },
      { status: 403 },
    );
  }

  const response = NextResponse.json({ franchise });
  response.cookies.set("football_franchise", franchise.slug, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return response;
}
