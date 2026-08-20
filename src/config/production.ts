export type ProductionConfigIssue = {
  variable: string;
  code:
    | "missing"
    | "invalid_url"
    | "https_required"
    | "invalid_origin"
    | "invalid_email"
    | "too_short"
    | "invalid_slug"
    | "invalid_year"
    | "invalid_timezone"
    | "base_origin_not_trusted";
};

const emailPattern = /^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/;

export function productionConfigIssues(
  env: NodeJS.ProcessEnv,
): ProductionConfigIssue[] {
  if (env.NODE_ENV !== "production") return [];

  const issues: ProductionConfigIssue[] = [];
  const databaseUrl = required(env, "DATABASE_URL", issues);
  if (databaseUrl && !isPostgresUrl(databaseUrl)) {
    issues.push({ variable: "DATABASE_URL", code: "invalid_url" });
  }

  const secret = required(env, "BETTER_AUTH_SECRET", issues);
  if (secret && secret.length < 32) {
    issues.push({ variable: "BETTER_AUTH_SECRET", code: "too_short" });
  }

  const baseUrlValue = required(env, "BETTER_AUTH_URL", issues);
  const baseOrigin = validateHttpsOrigin(
    baseUrlValue,
    "BETTER_AUTH_URL",
    issues,
  );

  const trustedValue = required(env, "BETTER_AUTH_TRUSTED_ORIGINS", issues);
  const trustedOrigins = trustedValue
    ? trustedValue
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean)
        .map((value) =>
          validateHttpsOrigin(value, "BETTER_AUTH_TRUSTED_ORIGINS", issues),
        )
        .filter((value): value is string => Boolean(value))
    : [];
  if (baseOrigin && !trustedOrigins.includes(baseOrigin)) {
    issues.push({
      variable: "BETTER_AUTH_TRUSTED_ORIGINS",
      code: "base_origin_not_trusted",
    });
  }

  const from = required(env, "AUTH_EMAIL_FROM", issues);
  if (from && !isEmailAddress(extractAddress(from))) {
    issues.push({ variable: "AUTH_EMAIL_FROM", code: "invalid_email" });
  }
  required(env, "RESEND_API_KEY", issues);

  const leagueSlug = required(env, "FOFL_LEAGUE_SLUG", issues);
  if (leagueSlug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(leagueSlug)) {
    issues.push({ variable: "FOFL_LEAGUE_SLUG", code: "invalid_slug" });
  }

  const timezone = required(env, "LEAGUE_TIMEZONE", issues);
  if (timezone && !isTimezone(timezone)) {
    issues.push({ variable: "LEAGUE_TIMEZONE", code: "invalid_timezone" });
  }

  if (env.MFL_SEASON?.trim() && !parseConfiguredSeason(env.MFL_SEASON)) {
    issues.push({ variable: "MFL_SEASON", code: "invalid_year" });
  }
  if (
    env.AUTH_BOOTSTRAP_COMMISSIONER_EMAIL?.trim() &&
    !isEmailAddress(env.AUTH_BOOTSTRAP_COMMISSIONER_EMAIL.trim())
  ) {
    issues.push({
      variable: "AUTH_BOOTSTRAP_COMMISSIONER_EMAIL",
      code: "invalid_email",
    });
  }

  return deduplicate(issues);
}

export function assertProductionConfig(env: NodeJS.ProcessEnv = process.env) {
  const issues = productionConfigIssues(env);
  if (issues.length > 0) {
    throw new ProductionConfigurationError(issues);
  }
}

export class ProductionConfigurationError extends Error {
  constructor(readonly issues: ProductionConfigIssue[]) {
    super("Production configuration is invalid");
    this.name = "ProductionConfigurationError";
  }
}

export function parseConfiguredSeason(value: string | undefined) {
  if (!value || !/^\d{4}$/.test(value.trim())) return undefined;
  const year = Number(value);
  return year >= 2000 && year <= 2100 ? year : undefined;
}

function required(
  env: NodeJS.ProcessEnv,
  variable: string,
  issues: ProductionConfigIssue[],
) {
  const value = env[variable]?.trim();
  if (!value) issues.push({ variable, code: "missing" });
  return value;
}

function isPostgresUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "postgres:" || url.protocol === "postgresql:";
  } catch {
    return false;
  }
}

function validateHttpsOrigin(
  value: string | undefined,
  variable: string,
  issues: ProductionConfigIssue[],
) {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") {
      issues.push({ variable, code: "https_required" });
      return undefined;
    }
    if (
      url.username ||
      url.password ||
      url.pathname !== "/" ||
      url.search ||
      url.hash
    ) {
      issues.push({ variable, code: "invalid_origin" });
      return undefined;
    }
    return url.origin;
  } catch {
    issues.push({ variable, code: "invalid_url" });
    return undefined;
  }
}

function extractAddress(value: string) {
  const displayNameMatch = value.match(/<([^<>]+)>$/);
  return (displayNameMatch?.[1] ?? value).trim();
}

function isEmailAddress(value: string) {
  return emailPattern.test(value);
}

function isTimezone(value: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}

function deduplicate(issues: ProductionConfigIssue[]) {
  return issues.filter(
    (issue, index) =>
      issues.findIndex(
        (candidate) =>
          candidate.variable === issue.variable &&
          candidate.code === issue.code,
      ) === index,
  );
}
