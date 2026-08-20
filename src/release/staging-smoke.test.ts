import { describe, expect, it, vi } from "vitest";
import { smokeStaging } from "@/release/staging-smoke";

describe("staging release smoke", () => {
  it("verifies readiness, security, and closed setup surfaces", async () => {
    const fetcher = createFetcher();
    const result = await smokeStaging({
      baseUrl: "https://staging.example.com",
      fetcher,
    });

    expect(result).toEqual({
      origin: "https://staging.example.com",
      checks: [
        "liveness",
        "readiness",
        "security_headers",
        "development_auth_disabled",
        "bootstrap_closed",
      ],
    });
    expect(fetcher).toHaveBeenCalledTimes(5);
  });

  it("rejects non-TLS staging origins", async () => {
    await expect(
      smokeStaging({
        baseUrl: "http://staging.example.com",
        fetcher: createFetcher(),
      }),
    ).rejects.toThrow("must use HTTPS");
  });

  it("fails when the application database is not ready", async () => {
    const fetcher = createFetcher({ ready: false });
    await expect(
      smokeStaging({
        baseUrl: "https://staging.example.com",
        fetcher,
      }),
    ).rejects.toThrow("readiness returned HTTP 503");
  });

  it("can leave bootstrap open during initial provisioning only", async () => {
    const fetcher = createFetcher();
    const result = await smokeStaging({
      baseUrl: "https://staging.example.com",
      expectBootstrapClosed: false,
      fetcher,
    });
    expect(result.checks).not.toContain("bootstrap_closed");
    expect(fetcher).toHaveBeenCalledTimes(4);
  });
});

function createFetcher(options: { ready?: boolean } = {}) {
  const ready = options.ready ?? true;
  return vi.fn(async (input: string | URL | Request) => {
    const url = new URL(
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url,
    );
    if (url.pathname === "/api/health") {
      return Response.json({ status: "ok", service: "football-web" });
    }
    if (url.pathname === "/api/ready") {
      return Response.json(
        {
          status: ready ? "ready" : "degraded",
          configuration: { ok: true, issues: [] },
          database: ready ? { ok: true } : { ok: false, reason: "unavailable" },
        },
        {
          status: ready ? 200 : 503,
          headers: { "cache-control": "no-store" },
        },
      );
    }
    if (url.pathname === "/sign-in") {
      return new Response("sign in", {
        headers: {
          "strict-transport-security":
            "max-age=63072000; includeSubDomains; preload",
          "content-security-policy": "frame-ancestors 'none'",
          "x-frame-options": "DENY",
          "x-content-type-options": "nosniff",
          "referrer-policy": "strict-origin-when-cross-origin",
          "permissions-policy": "camera=(), microphone=()",
        },
      });
    }
    if (url.pathname === "/api/auth/dev-sign-in") {
      return Response.json({ error: "disabled" }, { status: 404 });
    }
    if (url.pathname === "/bootstrap-commissioner") {
      return new Response("not found", { status: 404 });
    }
    return new Response("not found", { status: 404 });
  }) as unknown as typeof fetch;
}
