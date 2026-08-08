import { NextResponse } from "next/server";
import { signInSchema } from "@/auth/schemas";
export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production")
    return NextResponse.json(
      { error: "Development authentication is disabled" },
      { status: 404 },
    );
  const form = await request.formData();
  const parsed = signInSchema.safeParse({
    email: form.get("email"),
    role: form.get("role"),
  });
  if (!parsed.success)
    return NextResponse.json(
      { error: "Invalid development account" },
      { status: 400 },
    );
  const response = NextResponse.redirect(new URL("/league", request.url), 303);
  response.cookies.set("football_dev_role", parsed.data.role, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  return response;
}
