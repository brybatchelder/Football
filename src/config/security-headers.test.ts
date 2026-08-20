import { describe, expect, it } from "vitest";
import { securityHeaders } from "@/config/security-headers";

describe("security headers", () => {
  it("adds production transport and content protections", () => {
    const headers = Object.fromEntries(
      securityHeaders("production").map(({ key, value }) => [key, value]),
    );
    expect(headers["Strict-Transport-Security"]).toContain("max-age=63072000");
    expect(headers["Content-Security-Policy"]).toContain(
      "frame-ancestors 'none'",
    );
    expect(headers["Content-Security-Policy"]).toContain(
      "upgrade-insecure-requests",
    );
    expect(headers["Content-Security-Policy"]).not.toContain("'unsafe-eval'");
  });

  it("allows Next development tooling without sending HSTS", () => {
    const headers = Object.fromEntries(
      securityHeaders("development").map(({ key, value }) => [key, value]),
    );
    expect(headers["Strict-Transport-Security"]).toBeUndefined();
    expect(headers["Content-Security-Policy"]).toContain("'unsafe-eval'");
    expect(headers["Content-Security-Policy"]).toContain("ws: wss:");
  });
});
