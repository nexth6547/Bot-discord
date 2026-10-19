const { spawnSync } = require("node:child_process");
const path = require("node:path");

const dashboardDirectory = path.resolve(__dirname, "..");
const botDirectory = path.resolve(dashboardDirectory, "../bot");
const testFiles = path.resolve(dashboardDirectory, "tests/*.test.ts");

const result = spawnSync(
  process.execPath,
  [
    "--experimental-test-module-mocks",
    "--import",
    "tsx",
    "--test",
    testFiles,
  ],
  {
    cwd: botDirectory,
    env: {
      ...process.env,
      TSX_TSCONFIG_PATH: path.join(dashboardDirectory, "tsconfig.json"),
    },
    stdio: "inherit",
  }
);

if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
