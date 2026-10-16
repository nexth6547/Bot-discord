import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import {
  assertDashboardEnvironment,
  validateDashboardEnvironment,
} from "../src/lib/environment";

const environmentKeys = [
  "NODE_ENV",
  "DISCORD_TOKEN",
  "DISCORD_CLIENT_ID",
  "NEXT_PUBLIC_DISCORD_CLIENT_ID",
  "DISCORD_CLIENT_SECRET",
  "NEXTAUTH_SECRET",
  "NEXTAUTH_URL",
  "DISCORD_REDIRECT_URI",
  "DATABASE_URL",
] as const;
const originalEnvironment = new Map(
  environmentKeys.map((key) => [key, process.env[key]] as const)
);

afterEach(() => {
  for (const key of environmentKeys) {
    const value = originalEnvironment.get(key);
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

function setValidEnvironment() {
  process.env.NODE_ENV = "test";
  process.env.DISCORD_TOKEN = "fictional-dashboard-bot-token";
  process.env.DISCORD_CLIENT_ID = "900000000000000001";
  process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID = "900000000000000001";
  process.env.DISCORD_CLIENT_SECRET = "fictional-oauth-client-secret-value";
  process.env.NEXTAUTH_SECRET = "fictional-session-secret-that-is-at-least-32-chars";
  process.env.NEXTAUTH_URL = "http://localhost:3000";
  process.env.DISCORD_REDIRECT_URI = "http://localhost:3000/api/auth/callback/discord";
  process.env.DATABASE_URL = "file:./environment-test.db";
}

test("dashboard accepts a complete configuration", () => {
  setValidEnvironment();
  assert.deepEqual(validateDashboardEnvironment(), []);
  assert.doesNotThrow(() => assertDashboardEnvironment());
});

test("dashboard fails clearly for each missing or empty required variable", () => {
  const requiredVariables = [
    "DISCORD_TOKEN",
    "DISCORD_CLIENT_ID",
    "NEXT_PUBLIC_DISCORD_CLIENT_ID",
    "DISCORD_CLIENT_SECRET",
    "NEXTAUTH_SECRET",
    "NEXTAUTH_URL",
    "DISCORD_REDIRECT_URI",
    "DATABASE_URL",
  ] as const;

  for (const key of requiredVariables) {
    for (const value of [undefined, ""]) {
      setValidEnvironment();
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;

      const errors = validateDashboardEnvironment();
      assert.ok(errors.some((error) => error.includes(key)), `${key} should be required`);
      assert.throws(
        () => assertDashboardEnvironment(),
        (error: unknown) => error instanceof Error && error.message.includes(key)
      );
    }
  }
});

test("dashboard rejects demonstration values and short session secrets without revealing them", () => {
  setValidEnvironment();
  process.env.DISCORD_TOKEN = "changeme";
  assert.ok(validateDashboardEnvironment().some((error) => error.includes("DISCORD_TOKEN")));

  setValidEnvironment();
  process.env.DISCORD_CLIENT_SECRET = "your_client_secret_here";
  assert.ok(validateDashboardEnvironment().some((error) => error.includes("DISCORD_CLIENT_SECRET")));

  setValidEnvironment();
  process.env.NEXTAUTH_SECRET = "short-secret";
  assert.ok(validateDashboardEnvironment().some((error) => error.includes("32 caractères minimum")));

  setValidEnvironment();
  process.env.NEXTAUTH_SECRET = "EXAMPLE_SESSION_SECRET_WITH_A_VALID_LENGTH";
  const exampleSecret = process.env.NEXTAUTH_SECRET;
  assert.throws(
    () => assertDashboardEnvironment(),
    (error: unknown) =>
      error instanceof Error &&
      error.message.includes("NEXTAUTH_SECRET") &&
      !error.message.includes(exampleSecret)
  );
});

test("dashboard validates application snowflakes", () => {
  setValidEnvironment();
  process.env.DISCORD_CLIENT_ID = "invalid";
  assert.ok(validateDashboardEnvironment().some((error) => error.includes("DISCORD_CLIENT_ID")));

  setValidEnvironment();
  process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID = "invalid";
  assert.ok(
    validateDashboardEnvironment().some((error) => error.includes("NEXT_PUBLIC_DISCORD_CLIENT_ID"))
  );
});

test("dashboard requires a well-formed callback matching the dashboard base URL", () => {
  setValidEnvironment();
  delete process.env.DISCORD_REDIRECT_URI;
  assert.ok(validateDashboardEnvironment().some((error) => error.includes("DISCORD_REDIRECT_URI")));

  setValidEnvironment();
  process.env.DISCORD_REDIRECT_URI = "not-an-absolute-url";
  assert.ok(validateDashboardEnvironment().some((error) => error.includes("URL HTTP(S) absolue")));

  setValidEnvironment();
  process.env.DISCORD_REDIRECT_URI = "https://other.example.test/api/auth/callback/discord";
  assert.ok(validateDashboardEnvironment().some((error) => error.includes("doit correspondre")));
});

test("dashboard requires a DATABASE_URL compatible with the SQLite Prisma provider", () => {
  setValidEnvironment();
  delete process.env.DATABASE_URL;
  assert.ok(validateDashboardEnvironment().some((error) => error.includes("DATABASE_URL")));

  setValidEnvironment();
  process.env.DATABASE_URL = "postgresql://localhost/example";
  assert.throws(
    () => assertDashboardEnvironment(),
    (error: unknown) => error instanceof Error && error.message.includes("SQLite")
  );
});
