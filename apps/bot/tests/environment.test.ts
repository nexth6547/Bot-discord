import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { assertBotEnvironment, validateBotEnvironment } from "../src/environment";

const environmentKeys = ["NODE_ENV", "DISCORD_TOKEN", "DISCORD_CLIENT_ID", "DATABASE_URL"] as const;
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
  process.env.DISCORD_TOKEN = "fictional-bot-token-for-environment-tests";
  process.env.DISCORD_CLIENT_ID = "900000000000000001";
  process.env.DATABASE_URL = "file:./environment-test.db";
}

test("bot accepts a complete configuration", () => {
  setValidEnvironment();
  assert.deepEqual(validateBotEnvironment(), []);
  assert.doesNotThrow(() => assertBotEnvironment());
});

test("bot fails clearly for each missing or empty required variable without exposing values", () => {
  const requiredVariables = ["DISCORD_TOKEN", "DISCORD_CLIENT_ID", "DATABASE_URL"] as const;

  for (const key of requiredVariables) {
    for (const value of [undefined, ""]) {
      setValidEnvironment();
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;

      const errors = validateBotEnvironment();
      assert.ok(errors.some((error) => error.includes(key)), `${key} should be required`);
      assert.throws(
        () => assertBotEnvironment(),
        (error: unknown) =>
          error instanceof Error &&
          error.message.includes(key) &&
          !error.message.includes("fictional-bot-token")
      );
    }
  }
});

test("bot rejects demonstration tokens and invalid application snowflakes", () => {
  setValidEnvironment();
  process.env.DISCORD_TOKEN = "your_token_here";
  assert.ok(validateBotEnvironment().some((error) => error.includes("DISCORD_TOKEN")));

  process.env.DISCORD_TOKEN = "fictional-bot-token-for-environment-tests";
  process.env.DISCORD_CLIENT_ID = "not-a-snowflake";
  assert.ok(validateBotEnvironment().some((error) => error.includes("snowflake")));
});

test("bot requires a DATABASE_URL compatible with the SQLite Prisma provider", () => {
  setValidEnvironment();
  delete process.env.DATABASE_URL;
  assert.ok(validateBotEnvironment().some((error) => error.includes("DATABASE_URL")));

  process.env.DATABASE_URL = "postgresql://localhost/example";
  assert.throws(
    () => assertBotEnvironment(),
    (error: unknown) => error instanceof Error && error.message.includes("SQLite")
  );
});
