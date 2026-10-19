import assert from "node:assert/strict";
import { mock, test } from "node:test";
import {
  classifyDiscordStatus,
  clearDiscordApiCache,
  DiscordNetworkError,
  requestDiscord,
} from "../src/lib/discord-api";
import { internalError } from "../src/lib/guild-access";

const URL = "https://discord.com/api/v10/guilds/100000000000000001/channels";
const INIT: RequestInit = {
  headers: { Authorization: "Bot test-only-token" },
  cache: "no-store",
};

function jsonResponse(body: unknown, status = 200, headers?: HeadersInit): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...Object.fromEntries(new Headers(headers)) },
  });
}

test("429 retries according to Retry-After and returns success", async (t) => {
  clearDiscordApiCache();
  const previousFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = previousFetch;
    clearDiscordApiCache();
  });

  let calls = 0;
  const waits: number[] = [];
  globalThis.fetch = async () => {
    calls += 1;
    return calls === 1
      ? jsonResponse({ message: "rate limited" }, 429, { "Retry-After": "0.25" })
      : jsonResponse({ ok: true });
  };

  const response = await requestDiscord(URL, INIT, {
    retryDelay: async (milliseconds) => {
      waits.push(milliseconds);
    },
  });
  assert.equal(response.status, 200);
  assert.equal(calls, 2);
  assert.deepEqual(waits, [250]);
});

test("repeated 429 responses stop after two bounded retries", async (t) => {
  clearDiscordApiCache();
  const previousFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = previousFetch;
    clearDiscordApiCache();
  });

  let calls = 0;
  const waits: number[] = [];
  globalThis.fetch = async () => {
    calls += 1;
    return jsonResponse({}, 429, { "Retry-After": "60" });
  };

  const response = await requestDiscord(URL, INIT, {
    retryDelay: async (milliseconds) => {
      waits.push(milliseconds);
    },
  });
  assert.equal(response.status, 429);
  assert.equal(calls, 3);
  assert.deepEqual(waits, [2_000, 2_000]);
  assert.equal(classifyDiscordStatus(response.status), "rate_limited");
});

test("403, 404 and 5xx responses remain distinguishable and unchanged", async (t) => {
  clearDiscordApiCache();
  const previousFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = previousFetch;
    clearDiscordApiCache();
  });

  for (const [status, category] of [
    [403, "forbidden"],
    [404, "not_found"],
    [500, "server_error"],
  ] as const) {
    globalThis.fetch = async () => jsonResponse({ message: category }, status);
    const response = await requestDiscord(URL, INIT);
    assert.equal(response.status, status);
    assert.equal(classifyDiscordStatus(response.status), category);
  }
});

test("network exceptions are identified without being converted to HTTP responses", async (t) => {
  clearDiscordApiCache();
  const previousFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = previousFetch;
    clearDiscordApiCache();
  });

  globalThis.fetch = async () => {
    throw new Error("test-only network failure");
  };
  await assert.rejects(
    requestDiscord(URL, INIT),
    (error: unknown) =>
      error instanceof DiscordNetworkError &&
      error.message === "test-only network failure"
  );
});

test("network exceptions are categorized in generic route diagnostics", () => {
  const logs: string[] = [];
  const errorMock = mock.method(console, "error", (...args: unknown[]) => {
    logs.push(args.map((argument) =>
      typeof argument === "string" ? argument : JSON.stringify(argument)
    ).join(" "));
  });

  try {
    const response = internalError(
      new DiscordNetworkError(new Error("offline transport issue")),
      "test operation"
    );
    assert.equal(response.status, 500);
    assert.match(logs.join("\n"), /network/);
    assert.match(logs.join("\n"), /offline transport issue/);
  } finally {
    errorMock.mock.restore();
  }
});

test("identical simultaneous requests share one fetch and independent responses", async (t) => {
  clearDiscordApiCache();
  const previousFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = previousFetch;
    clearDiscordApiCache();
  });

  let calls = 0;
  let resolveFetch: ((response: Response) => void) | undefined;
  globalThis.fetch = () => {
    calls += 1;
    return new Promise<Response>((resolve) => {
      resolveFetch = resolve;
    });
  };

  const firstRequest = requestDiscord(URL, INIT);
  const secondRequest = requestDiscord(URL, INIT);
  assert.equal(calls, 1);
  resolveFetch?.(jsonResponse({ request: "shared" }));

  const [first, second] = await Promise.all([firstRequest, secondRequest]);
  assert.deepEqual(await first.json(), { request: "shared" });
  assert.deepEqual(await second.json(), { request: "shared" });
});

test("guild response cache expires after its TTL", async (t) => {
  clearDiscordApiCache();
  const previousFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = previousFetch;
    clearDiscordApiCache();
  });

  let calls = 0;
  globalThis.fetch = async () => jsonResponse({ call: ++calls });

  const options = { cacheTtlMs: 25 };
  assert.deepEqual(await (await requestDiscord(URL, INIT, options)).json(), { call: 1 });
  assert.deepEqual(await (await requestDiscord(URL, INIT, options)).json(), { call: 1 });
  assert.equal(calls, 1);

  await new Promise((resolve) => setTimeout(resolve, 35));
  assert.deepEqual(await (await requestDiscord(URL, INIT, options)).json(), { call: 2 });
  assert.equal(calls, 2);
});

test("cached guild data is not shared across authorization identities", async (t) => {
  clearDiscordApiCache();
  const previousFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = previousFetch;
    clearDiscordApiCache();
  });

  let calls = 0;
  globalThis.fetch = async (_input, init) =>
    jsonResponse({ authorization: new Headers(init?.headers).get("Authorization"), call: ++calls });

  const options = { cacheTtlMs: 1_000 };
  const first = await requestDiscord(URL, INIT, options);
  const second = await requestDiscord(
    URL,
    { ...INIT, headers: { Authorization: "Bot another-test-only-token" } },
    options
  );
  assert.deepEqual(await first.json(), { authorization: "Bot test-only-token", call: 1 });
  assert.deepEqual(await second.json(), {
    authorization: "Bot another-test-only-token",
    call: 2,
  });
  assert.equal(calls, 2);
});
