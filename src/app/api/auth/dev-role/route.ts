import { NextResponse } from "next/server";
import { devRoleSchema } from "@/auth/schemas";

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Development role switching is disabled" }, { status: 404 });
  }
  const parsed = devRoleSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid development role" }, { status: 400 });
  const response = NextResponse.json({ role: parsed.data.role });
  response.cookies.set("football_dev_role", parsed.data.role, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  return response;
}
