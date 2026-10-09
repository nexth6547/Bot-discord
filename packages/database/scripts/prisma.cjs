const { spawnSync } = require("node:child_process");
const path = require("node:path");
const dotenv = require("dotenv");

const envPath = path.resolve(__dirname, "../../../.env");
const envResult = dotenv.config({ path: envPath });
if (envResult.error && envResult.error.code !== "ENOENT") {
  throw envResult.error;
}

const args = process.argv.slice(2);
if (args[0] !== "generate" && !process.env.DATABASE_URL) {
  console.error(
    `DATABASE_URL is not set. Add it to ${envPath} or provide it in the environment.`
  );
  process.exit(1);
}

const prismaCli = require.resolve("prisma");
const result = spawnSync(process.execPath, [prismaCli, ...args], {
  stdio: "inherit",
  env: process.env,
});

if (result.error) {
  throw result.error;
}

process.exitCode = result.status ?? 1;
