import { pathToFileURL } from "node:url";

type SmokeOptions = {
  baseUrl: string;
  expectBootstrapClosed?: boolean;
  allowHttp?: boolean;
  fetcher?: typeof fetch;
};

export async function smokeStaging({
  baseUrl,
  expectBootstrapClosed = true,
  allowHttp = false,
  fetcher = fetch,
}: SmokeOptions) {
  const origin = parseOrigin(baseUrl, allowHttp);
  const request = async (path: string, init?: RequestInit) =>
    fetcher(new URL(path, origin), {
      redirect: "manual",
      signal: AbortSignal.timeout(15_000),
      headers: { "user-agent": "FOFL-release-smoke/1.0" },
      ...init,
    });

  const health = await request("/api/health");
  expectStatus(health, 200, "liveness");
  const healthBody = await jsonObject(health, "liveness");
  expectEqual(healthBody.status, "ok", "liveness status");
  expectEqual(healthBody.service, "football-web", "liveness service");

  const readiness = await request("/api/ready");
  expectStatus(readiness, 200, "readiness");
  expectHeaderIncludes(readiness, "cache-control", "no-store", "readiness");
  const readinessBody = await jsonObject(readiness, "readiness");
  expectEqual(readinessBody.status, "ready", "readiness status");
  expectEqual(
    objectProperty(readinessBody, "configuration").ok,
    true,
    "production configuration",
  );
  expectEqual(
    objectProperty(readinessBody, "database").ok,
    true,
    "database readiness",
  );

  const signIn = await request("/sign-in");
  expectStatus(signIn, 200, "sign-in page");
  expectHeaderIncludes(
    signIn,
    "strict-transport-security",
    "max-age=63072000",
    "HSTS",
  );
  expectHeaderIncludes(
    signIn,
    "content-security-policy",
    "frame-ancestors 'none'",
    "content security policy",
  );
  expectHeaderIncludes(signIn, "x-frame-options", "DENY", "frame policy");
  expectHeaderIncludes(
    signIn,
    "x-content-type-options",
    "nosniff",
    "content type policy",
  );
  expectHeaderIncludes(
    signIn,
    "referrer-policy",
    "strict-origin-when-cross-origin",
    "referrer policy",
  );
  expectHeaderIncludes(
    signIn,
    "permissions-policy",
    "camera=()",
    "permissions policy",
  );
  if (signIn.headers.has("x-powered-by")) {
    throw new Error("sign-in page exposes the framework through X-Powered-By");
  }

  const devAuth = await request("/api/auth/dev-sign-in", {
    method: "POST",
    body: new URLSearchParams({
      email: "release-smoke@example.invalid",
      role: "commissioner",
    }),
  });
  expectStatus(devAuth, 404, "development authentication shutdown");

  if (expectBootstrapClosed) {
    const bootstrap = await request("/bootstrap-commissioner");
    expectStatus(bootstrap, 404, "commissioner bootstrap shutdown");
  }

  return {
    origin: origin.origin,
    checks: [
      "liveness",
      "readiness",
      "security_headers",
      "development_auth_disabled",
      ...(expectBootstrapClosed ? ["bootstrap_closed"] : []),
    ],
  };
}

function parseOrigin(value: string, allowHttp: boolean) {
  if (!value.trim()) throw new Error("STAGING_BASE_URL is required");
  const url = new URL(value);
  if (
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  ) {
    throw new Error(
      "STAGING_BASE_URL must be an origin without credentials or a path",
    );
  }
  if (url.protocol !== "https:" && !(allowHttp && url.protocol === "http:")) {
    throw new Error("STAGING_BASE_URL must use HTTPS");
  }
  return url;
}

async function jsonObject(response: Response, label: string) {
  const value: unknown = await response.json();
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} did not return a JSON object`);
  }
  return value as Record<string, unknown>;
}

function objectProperty(value: Record<string, unknown>, property: string) {
  const nested = value[property];
  if (!nested || typeof nested !== "object" || Array.isArray(nested)) {
    throw new Error(`${property} is missing from the readiness response`);
  }
  return nested as Record<string, unknown>;
}

function expectStatus(response: Response, expected: number, label: string) {
  if (response.status !== expected) {
    throw new Error(
      `${label} returned HTTP ${response.status}; expected ${expected}`,
    );
  }
}

function expectEqual(actual: unknown, expected: unknown, label: string) {
  if (actual !== expected) {
    throw new Error(
      `${label} was ${String(actual)}; expected ${String(expected)}`,
    );
  }
}

function expectHeaderIncludes(
  response: Response,
  header: string,
  expected: string,
  label: string,
) {
  const actual = response.headers.get(header);
  if (!actual?.includes(expected)) {
    throw new Error(`${label} is missing ${header}: ${expected}`);
  }
}

async function main() {
  const result = await smokeStaging({
    baseUrl: process.env.STAGING_BASE_URL ?? "",
    expectBootstrapClosed:
      process.env.EXPECT_BOOTSTRAP_CLOSED?.toLowerCase() !== "false",
    allowHttp: process.env.ALLOW_HTTP_SMOKE === "true",
  });
  console.log(
    JSON.stringify({
      status: "passed",
      ...result,
      checkedAt: new Date().toISOString(),
    }),
  );
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  await main();
}
