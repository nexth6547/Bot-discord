import assert from "node:assert/strict";
import { test } from "node:test";
import { authOptions } from "../src/lib/auth";

test("Discord OAuth provider configures its issuer", () => {
  // Discord sends iss=https://discord.com in the callback; without this issuer, openid-client 5.7.1 fails with "issuer must be configured on the issuer".
  assert.equal(authOptions.providers[0]?.options?.issuer, "https://discord.com");
});
