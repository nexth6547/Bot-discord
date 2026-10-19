import assert from "node:assert/strict";
import { test } from "node:test";
import { clearDiscordApiCache, discordApiFetch } from "../src/lib/discord-api";

function makeResponse(status: number, headers?: HeadersInit): Response {
  return new Response(JSON.stringify({ status }), { status, headers });
}

test("Discord API retries a 429 using Retry-After and returns the success response", async () => {
  const previousFetch = globalThis.fetch;
  let requests = 0;
  globalThis.fetch = async () => {
    requests++;
    return requests === 1
      ? makeResponse(429, { "Retry-After": "0" })
      : makeResponse(200);
  };

  try {
    const response = await discordApiFetch(
      "https://discord.com/api/v10/guilds/test-rate-limit-success"
    );
    assert.equal(response.status, 200);
    assert.equal(requests, 2);
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test("Discord API stops after two retries when 429 persists", async () => {
  const previousFetch = globalThis.fetch;
  let requests = 0;
  globalThis.fetch = async () => {
    requests++;
    return makeResponse(429, { "Retry-After": "0" });
  };

  try {
    const response = await discordApiFetch(
      "https://discord.com/api/v10/guilds/test-repeated-rate-limit"
    );
    assert.equal(response.status, 429);
    assert.equal(requests, 3);
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test("Discord API preserves 403 and 500 HTTP responses", async () => {
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const url = String(input);
    return makeResponse(url.endsWith("/403") ? 403 : 500);
  };

  try {
    const forbidden = await discordApiFetch("https://discord.com/api/v10/test/403");
    const notFound = await discordApiFetch("https://discord.com/api/v10/test/404");
    const serverError = await discordApiFetch("https://discord.com/api/v10/test/500");
    assert.equal(forbidden.status, 403);
    assert.equal(notFound.status, 404);
    assert.equal(serverError.status, 500);
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test("Discord API propagates network exceptions", async () => {
  const previousFetch = globalThis.fetch;
  const networkError = new TypeError("Mock network failure");
  globalThis.fetch = async () => {
    throw networkError;
  };

  try {
    await assert.rejects(
      discordApiFetch("https://discord.com/api/v10/test/network"),
      (error: unknown) => error === networkError
    );
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test("simultaneous identical Discord API requests are deduplicated", async () => {
  const previousFetch = globalThis.fetch;
  let requests = 0;
  let releaseFetch: ((response: Response) => void) | undefined;
  globalThis.fetch = async () => {
    requests++;
    return new Promise<Response>((resolve) => {
      releaseFetch = resolve;
    });
  };

  try {
    const url = "https://discord.com/api/v10/test/simultaneous-dedupe";
    const first = discordApiFetch(url, { headers: { Authorization: "Bot fictional-a" } });
    const second = discordApiFetch(url, { headers: { Authorization: "Bot fictional-a" } });

    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(requests, 1);
    assert.ok(releaseFetch);
    releaseFetch(makeResponse(200));

    const responses = await Promise.all([first, second]);
    assert.deepEqual(responses.map((response) => response.status), [200, 200]);
    assert.notEqual(responses[0], responses[1]);
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test("user-specific Discord requests are not shared between users", async () => {
  const previousFetch = globalThis.fetch;
  let requests = 0;
  const releaseFetches: Array<() => void> = [];
  globalThis.fetch = async () => {
    requests++;
    await new Promise<void>((resolve) => {
      releaseFetches.push(resolve);
    });
    return makeResponse(200);
  };

  try {
    const url = "https://discord.com/api/v10/users/@me/guilds";
    const first = discordApiFetch(url, { headers: { Authorization: "Bearer fictional-a" } });
    const second = discordApiFetch(url, { headers: { Authorization: "Bearer fictional-b" } });

    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(requests, 2);
    assert.equal(releaseFetches.length, 2);
    releaseFetches.forEach((releaseFetch) => releaseFetch());

    await Promise.all([first, second]);
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test("guild responses are cached briefly and fetched again after TTL expiry", async () => {
  const previousFetch = globalThis.fetch;
  const originalNow = Date.now;
  let now = 1_000;
  let requests = 0;
  Date.now = () => now;
  clearDiscordApiCache();
  globalThis.fetch = async () => {
    requests++;
    return makeResponse(200);
  };

  try {
    const url = "https://discord.com/api/v10/guilds/test-cache-expiry/channels";
    const options = { cacheGuildResponse: true };
    const first = await discordApiFetch(url, {}, options);
    const cached = await discordApiFetch(url, {}, options);
    assert.equal(first.status, 200);
    assert.equal(cached.status, 200);
    assert.equal(requests, 1);

    now += 15_001;
    await discordApiFetch(url, {}, options);
    assert.equal(requests, 2);
  } finally {
    clearDiscordApiCache();
    Date.now = originalNow;
    globalThis.fetch = previousFetch;
  }
});

test("identical user-list requests with different OAuth tokens remain separate", async () => {
  const previousFetch = globalThis.fetch;
  let requests = 0;
  globalThis.fetch = async () => {
    requests++;
    return makeResponse(200);
  };

  try {
    const url = "https://discord.com/api/v10/users/@me/guilds";
    const cacheOption = { cacheGuildResponse: true };
    await discordApiFetch(
      url,
      { headers: { Authorization: "Bearer fictional-user-a" } },
      cacheOption
    );
    await discordApiFetch(
      url,
      { headers: { Authorization: "Bearer fictional-user-b" } },
      cacheOption
    );
    assert.equal(requests, 2);
  } finally {
    globalThis.fetch = previousFetch;
  }
});
