import { describe, expect, it } from "vitest";
import { handleAuthRequestSafely } from "@/auth/safe-handler";

describe("safe authentication route handling", () => {
  it("returns the authentication response", async () => {
    const response = await handleAuthRequestSafely(async () =>
      Response.json({ ok: true }),
    );
    expect(response.status).toBe(200);
  });

  it("converts asynchronous authentication failures to a safe 503", async () => {
    const response = await handleAuthRequestSafely(async () => {
      await Promise.resolve();
      throw new Error("sensitive database detail");
    });
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      error: "Authentication service is unavailable",
    });
  });
});
