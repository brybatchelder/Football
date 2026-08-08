import { createAuth } from "@/auth/better-auth";
function unavailable() {
  return Response.json(
    { error: "Authentication database is unavailable" },
    { status: 503 },
  );
}
export async function GET(request: Request) {
  try {
    return createAuth().handler(request);
  } catch {
    return unavailable();
  }
}
export async function POST(request: Request) {
  try {
    return createAuth().handler(request);
  } catch {
    return unavailable();
  }
}
