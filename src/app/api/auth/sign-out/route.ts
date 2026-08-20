import { NextResponse } from "next/server";
import { getAuth } from "@/auth/better-auth";

export async function POST(request: Request) {
  let authResponse: Response | undefined;
  if (process.env.DATABASE_URL) {
    try {
      authResponse = await getAuth().api.signOut({
        headers: request.headers,
        asResponse: true,
      });
    } catch {
      // A missing or expired production session should still clear local cookies.
    }
  }
  const response = NextResponse.redirect(new URL("/sign-in", request.url), 303);
  authResponse?.headers.getSetCookie().forEach((cookie) => {
    response.headers.append("set-cookie", cookie);
  });
  response.cookies.set("football_dev_role", "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  response.cookies.set("football_franchise", "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}
