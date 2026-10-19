import assert from "node:assert/strict";
import { mock, test } from "node:test";
import {
  classifyDiscordStatus,
  clearDiscordApiCache,
  discordGuildBotMemberUrl,
  DiscordNetworkError,
  requestDiscord,
} from "../src/lib/discord-api";
import { internalError, logDiscordHttpFailure } from "../src/lib/guild-access";

const URL = "https://discord.com/api/v10/guilds/100000000000000001/channels";
const INIT: RequestInit = {
  headers: { Authorization: "Bot test-only-token" },
  cache: "no-store",
};

function jsonResponse(body: unknown, status = 200, headers?: HeadersInit): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...Object.fromEntries(new Headers(headers)),
    },
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
    return jsonResponse({}, 429, { "Retry-After": "2" });
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

test("a Retry-After longer than the retry limit returns 429 without retrying", async (t) => {
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
    return jsonResponse({}, 429, { "Retry-After": "10" });
  };

  const response = await requestDiscord(URL, INIT, {
    retryDelay: async (milliseconds) => {
      waits.push(milliseconds);
    },
  });
  assert.equal(response.status, 429);
  assert.equal(calls, 1);
  assert.deepEqual(waits, []);
});

test("guild bot member URL uses the configured bot ID", () => {
  const previousClientId = process.env.DISCORD_CLIENT_ID;
  process.env.DISCORD_CLIENT_ID = "900000000000000001";
  try {
    const url = discordGuildBotMemberUrl("100000000000000001");
    assert.equal(
      url,
      "https://discord.com/api/v10/guilds/100000000000000001/members/900000000000000001"
    );
    assert.ok(!url.includes("@me"));
  } finally {
    if (previousClientId === undefined) delete process.env.DISCORD_CLIENT_ID;
    else process.env.DISCORD_CLIENT_ID = previousClientId;
  }
});

test("guild bot member URL rejects invalid IDs without including their values", () => {
  const previousClientId = process.env.DISCORD_CLIENT_ID;
  try {
    for (const invalidClientId of [undefined, "", "not-numeric"]) {
      if (invalidClientId === undefined) delete process.env.DISCORD_CLIENT_ID;
      else process.env.DISCORD_CLIENT_ID = invalidClientId;

      assert.throws(
        () => discordGuildBotMemberUrl("100000000000000001"),
        (error: unknown) => {
          assert.ok(error instanceof Error);
          assert.match(error.message, /DISCORD_CLIENT_ID/);
          if (invalidClientId) assert.ok(!error.message.includes(invalidClientId));
          return true;
        }
      );
    }

    process.env.DISCORD_CLIENT_ID = "900000000000000001";
    assert.throws(
      () => discordGuildBotMemberUrl("not-numeric"),
      (error: unknown) => {
        assert.ok(error instanceof Error);
        assert.match(error.message, /guildId/);
        assert.ok(!error.message.includes("not-numeric"));
        return true;
      }
    );
  } finally {
    if (previousClientId === undefined) delete process.env.DISCORD_CLIENT_ID;
    else process.env.DISCORD_CLIENT_ID = previousClientId;
  }
});

test("400 Discord validation diagnostics include field names and codes without secrets", async () => {
  const logs: string[] = [];
  const secret = "test-only-auth-secret";
  const errorMock = mock.method(console, "error", (...args: unknown[]) => {
    logs.push(args.map((argument) =>
      typeof argument === "string" ? argument : JSON.stringify(argument)
    ).join(" "));
  });

  try {
    await logDiscordHttpFailure(
      "test operation",
      jsonResponse({
        code: 50035,
        message: "Invalid Form Body",
        errors: {
          user_id: {
            _errors: [{ code: "BASE_TYPE_REQUIRED", message: secret }],
          },
        },
      }, 400),
      [secret]
    );
    const output = logs.join("\n");
    assert.match(output, /user_id/);
    assert.match(output, /BASE_TYPE_REQUIRED/);
    assert.ok(!output.includes(secret));
  } finally {
    errorMock.mock.restore();
  }
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
    jsonResponse({
      authorization: new Headers(init?.headers).get("Authorization"),
      call: ++calls,
    });

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

test("user-specific guild lists are never cached", async (t) => {
  clearDiscordApiCache();
  const previousFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = previousFetch;
    clearDiscordApiCache();
  });

  let calls = 0;
  globalThis.fetch = async () => jsonResponse({ call: ++calls });

  const userGuildList = "https://discord.com/api/v10/users/@me/guilds";
  const options = { cacheTtlMs: 1_000 };
  await requestDiscord(userGuildList, INIT, options);
  await requestDiscord(userGuildList, INIT, options);
  assert.equal(calls, 2);
});
