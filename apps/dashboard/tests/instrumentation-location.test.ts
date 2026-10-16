import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const dashboardDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "..");

test("Next.js instrumentation hook stays under src and remains enabled", () => {
  const instrumentationPath = resolve(dashboardDirectory, "src/instrumentation.ts");
  const rootInstrumentationPath = resolve(dashboardDirectory, "instrumentation.ts");
  const nextConfigPath = resolve(dashboardDirectory, "next.config.mjs");

  assert.ok(existsSync(instrumentationPath), "src/instrumentation.ts must exist");
  const instrumentationSource = readFileSync(instrumentationPath, "utf8");
  assert.match(
    instrumentationSource,
    /export\s+function\s+register\s*\(/,
    "src/instrumentation.ts must export register()"
  );
  assert.match(
    instrumentationSource,
    /register\s*\(\s*\)\s*\{[\s\S]*?assertDashboardEnvironment\s*\(\s*\)/,
    "register() must call assertDashboardEnvironment()"
  );

  assert.equal(
    existsSync(rootInstrumentationPath),
    false,
    "apps/dashboard/instrumentation.ts must not exist: Next.js ignores the root hook when src/ exists"
  );

  const nextConfig = readFileSync(nextConfigPath, "utf8");
  assert.match(
    nextConfig,
    /experimental\s*:\s*\{[\s\S]*?instrumentationHook\s*:\s*true/,
    "Next.js 14 requires experimental.instrumentationHook to be enabled"
  );
});
