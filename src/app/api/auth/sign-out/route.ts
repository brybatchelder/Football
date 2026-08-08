import { NextResponse } from "next/server";
export async function POST(request: Request) {
  const response = NextResponse.redirect(new URL("/sign-in", request.url), 303);
  response.cookies.set("football_dev_role", "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}
