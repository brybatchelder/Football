import { describe, expect, it } from "vitest";
import {
  assertProductionConfig,
  ProductionConfigurationError,
  productionConfigIssues,
} from "@/config/production";

const validProductionEnv = {
  NODE_ENV: "production",
  DATABASE_URL: "postgresql://fofl:secret@db.example.com/fofl?sslmode=require",
  BETTER_AUTH_SECRET: "a".repeat(32),
  BETTER_AUTH_URL: "https://football.example.com",
  BETTER_AUTH_TRUSTED_ORIGINS: "https://football.example.com",
  AUTH_EMAIL_FROM: "FOFL <no-reply@example.com>",
  RESEND_API_KEY: "configured-by-the-deployment-platform",
  FOFL_LEAGUE_SLUG: "front-office-football-league",
  LEAGUE_TIMEZONE: "America/Chicago",
  MFL_SEASON: "2026",
} satisfies NodeJS.ProcessEnv;

describe("production configuration", () => {
  it("accepts a complete HTTPS production configuration", () => {
    expect(productionConfigIssues(validProductionEnv)).toEqual([]);
    expect(() => assertProductionConfig(validProductionEnv)).not.toThrow();
  });

  it("does not impose production requirements in development", () => {
    expect(productionConfigIssues({ NODE_ENV: "development" })).toEqual([]);
  });

  it("reports safe variable names and reason codes without values", () => {
    const env = {
      ...validProductionEnv,
      DATABASE_URL: "mysql://db.example.com/fofl",
      BETTER_AUTH_SECRET: "short",
      BETTER_AUTH_URL: "http://football.example.com/path",
      BETTER_AUTH_TRUSTED_ORIGINS: "https://admin.example.com/path",
      AUTH_EMAIL_FROM: "not-an-email",
      FOFL_LEAGUE_SLUG: "FOFL League",
      LEAGUE_TIMEZONE: "Central-ish",
      MFL_SEASON: "twenty-six",
    };

    const issues = productionConfigIssues(env);
    expect(issues).toEqual(
      expect.arrayContaining([
        { variable: "DATABASE_URL", code: "invalid_url" },
        { variable: "BETTER_AUTH_SECRET", code: "too_short" },
        { variable: "BETTER_AUTH_URL", code: "https_required" },
        {
          variable: "BETTER_AUTH_TRUSTED_ORIGINS",
          code: "invalid_origin",
        },
        { variable: "AUTH_EMAIL_FROM", code: "invalid_email" },
        { variable: "FOFL_LEAGUE_SLUG", code: "invalid_slug" },
        { variable: "LEAGUE_TIMEZONE", code: "invalid_timezone" },
        { variable: "MFL_SEASON", code: "invalid_year" },
      ]),
    );
    expect(JSON.stringify(issues)).not.toContain("mysql://");
    expect(() => assertProductionConfig(env)).toThrow(
      ProductionConfigurationError,
    );
  });
});
