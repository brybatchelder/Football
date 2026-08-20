export async function handleAuthRequestSafely(
  operation: () => Promise<Response>,
) {
  try {
    return await operation();
  } catch {
    return Response.json(
      { error: "Authentication service is unavailable" },
      { status: 503 },
    );
  }
}
