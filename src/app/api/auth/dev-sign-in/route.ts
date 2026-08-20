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
  const requestedNext = form.get("next");
  const next =
    typeof requestedNext === "string" &&
    requestedNext.startsWith("/") &&
    !requestedNext.startsWith("//")
      ? requestedNext
      : "/league";
  // Keep this redirect relative. Next can normalize request.url to localhost
  // while a browser is using 127.0.0.1, which turns a local sign-in into a
  // cross-origin redirect and is correctly rejected by CSP form-action.
  const response = new NextResponse(null, {
    status: 303,
    headers: { Location: next },
  });
  response.cookies.set("football_dev_role", parsed.data.role, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  return response;
}
