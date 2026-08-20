import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { sendAuthEmail } from "@/auth/email";

const message = {
  to: "owner@example.com",
  subject: "Your FOFL invitation",
  text: "Accept this invitation.",
  html: "<p>Accept this invitation.</p>",
};

describe("authentication email delivery", () => {
  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("RESEND_API_KEY", "re_test_key");
    vi.stubEnv("AUTH_EMAIL_FROM", "FOFL <auth@fofl.example>");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("sends with a stable idempotency key and returns the provider id", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(Response.json({ id: "email-123" }, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "info").mockImplementation(() => undefined);

    await expect(sendAuthEmail(message)).resolves.toEqual({
      delivered: true,
      deliveryId: "email-123",
    });
    const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const headers = request.headers as Record<string, string>;
    expect(headers["idempotency-key"]).toMatch(/^fofl-[a-f0-9]{64}$/);
    expect(headers["user-agent"]).toBe("FOFL/1.0 transactional-email");
  });

  it("retries transient failures with the same idempotency key", async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({ name: "internal_server_error" }, { status: 500 }),
      )
      .mockResolvedValueOnce(
        Response.json({ id: "email-after-retry" }, { status: 200 }),
      );
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "info").mockImplementation(() => undefined);

    const delivery = sendAuthEmail(message);
    await vi.runAllTimersAsync();
    await expect(delivery).resolves.toMatchObject({ delivered: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const firstHeaders = fetchMock.mock.calls[0]?.[1]?.headers;
    const secondHeaders = fetchMock.mock.calls[1]?.[1]?.headers;
    expect(firstHeaders).toMatchObject(secondHeaders);
  });

  it("does not retry permanent provider or quota failures", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        Response.json({ name: "daily_quota_exceeded" }, { status: 429 }),
      );
    vi.stubGlobal("fetch", fetchMock);

    await expect(sendAuthEmail(message)).rejects.toThrow("failed (429)");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("fails closed when production delivery is not configured", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubGlobal("fetch", vi.fn());
    await expect(sendAuthEmail(message)).rejects.toThrow("not configured");
    expect(fetch).not.toHaveBeenCalled();
  });
});
