import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { mock, test } from "node:test";
import { PrismaClient } from "@bot/database";
import { clearDiscordApiCache } from "../src/lib/discord-api";

const GUILD_ID = "100000000000000001";
const CHANNEL_ID = "200000000000000001";
const ROLE_ID = "300000000000000001";
const BOT_ROLE_ID = "500000000000000001";
const ADMINISTRATOR = 1n << 3n;
const MANAGE_GUILD = 1n << 5n;
const REQUIRED_CHANNEL_PERMISSIONS =
  (1n << 10n) | (1n << 11n) | (1n << 14n);

let activeSession: { accessToken: string } | null = {
  accessToken: "test-only-session-token",
};
let channelType = 0;
let channelExists = true;
let botPermissions = REQUIRED_CHANNEL_PERMISSIONS;
let messageStatus = 201;
let messagePosts = 0;
let activePrisma: PrismaClient | undefined;

const prismaProxy = new Proxy(
  {},
  {
    get(_target, property) {
      if (!activePrisma) return undefined;
      const value = Reflect.get(activePrisma, property);
      return typeof value === "function" ? value.bind(activePrisma) : value;
    },
  }
);

mock.module("next-auth", {
  exports: {
    getServerSession: async () => activeSession,
  },
});
mock.module("@bot/database", { exports: { default: prismaProxy } });

process.env.NODE_ENV = "test";
process.env.DISCORD_TOKEN = "test-only-not-a-token";
process.env.DISCORD_CLIENT_ID = "900000000000000001";
process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID = "900000000000000001";
process.env.DISCORD_CLIENT_SECRET = "test-only-client-secret-value";
process.env.NEXTAUTH_SECRET = "test-only-secret-value-with-more-than-32-characters";
process.env.NEXTAUTH_URL = "http://localhost:3000";
process.env.DISCORD_REDIRECT_URI = "http://localhost:3000/api/auth/callback/discord";
process.env.DATABASE_URL = "file:./test.db";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function mockDiscord(): void {
  clearDiscordApiCache();
  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    const method = init?.method ?? "GET";

    if (url.pathname === "/api/v10/users/@me/guilds") {
      return jsonResponse([
        {
          id: GUILD_ID,
          name: "Ticket publish test guild",
          icon: null,
          permissions: String(ADMINISTRATOR | MANAGE_GUILD),
          owner: false,
        },
      ]);
    }
    if (url.pathname === `/api/v10/guilds/${GUILD_ID}`) {
      return jsonResponse({ id: GUILD_ID, approximate_member_count: 5 });
    }
    if (url.pathname === `/api/v10/guilds/${GUILD_ID}/channels`) {
      return jsonResponse(
        channelExists
          ? [{
              id: CHANNEL_ID,
              name: "test-channel",
              type: channelType,
              position: 0,
              permission_overwrites: [],
            }]
          : []
      );
    }
    if (url.pathname === `/api/v10/guilds/${GUILD_ID}/roles`) {
      return jsonResponse([
        { id: GUILD_ID, name: "@everyone", position: 0, managed: false, permissions: "0" },
        { id: ROLE_ID, name: "Support", position: 1, managed: false, permissions: "0" },
        {
          id: BOT_ROLE_ID,
          name: "Bot",
          position: 10,
          managed: false,
          permissions: String(botPermissions),
        },
      ]);
    }
    if (url.pathname === `/api/v10/guilds/${GUILD_ID}/members/900000000000000001`) {
      return jsonResponse({ user: { id: "600000000000000001" }, roles: [BOT_ROLE_ID] });
    }
    if (url.pathname === `/api/v10/channels/${CHANNEL_ID}/messages` && method === "POST") {
      messagePosts++;
      return jsonResponse(
        messageStatus === 201 ? { id: "400000000000000001" } : { message: "Forbidden" },
        messageStatus
      );
    }

    throw new Error(`Unexpected mocked Discord request: ${method} ${url.pathname}`);
  };
}

async function withTemporaryDatabase<T>(
  run: (client: PrismaClient) => Promise<T>
): Promise<T> {
  const directory = mkdtempSync(join(tmpdir(), "bloomera-ticket-publish-test-"));
  let client: PrismaClient | undefined;

  try {
    const schemaPath = join(directory, "schema.prisma");
    const schemaSource = readFileSync(
      resolve(dirname(fileURLToPath(import.meta.url)), "../../../packages/database/prisma/schema.prisma"),
      "utf8"
    );
    const schema = schemaSource.replace(
      /url\s*=\s*env\("DATABASE_URL"\)/,
      'url = "file:./test.db"'
    );
    assert.notEqual(schema, schemaSource, "Temporary Prisma schema must use an isolated SQLite file");
    writeFileSync(schemaPath, schema);

    execFileSync(
      process.execPath,
      [
        resolve(dirname(fileURLToPath(import.meta.url)), "../../../packages/database/node_modules/prisma/build/index.js"),
        "db",
        "push",
        "--schema",
        schemaPath,
        "--skip-generate",
      ],
      { cwd: directory, stdio: "pipe" }
    );
    client = new PrismaClient({
      datasources: { db: { url: `file:${join(directory, "test.db")}` } },
    });
    activePrisma = client;
    clearDiscordApiCache();
    return await run(client);
  } finally {
    activePrisma = undefined;
    try {
      if (client) await client.$disconnect();
    } finally {
      await rm(directory, { recursive: true, force: true, maxRetries: 10, retryDelay: 250 });
    }
  }
}

const validPayload = {
  enabled: true,
  panelChannelId: CHANNEL_ID,
  panelTitle: "Support",
  panelDescription: "Open a ticket",
  buttonText: "Create ticket",
};

function makeRequest(body: string): Request {
  return new Request(`http://localhost/api/guilds/${GUILD_ID}/tickets/publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
}

async function assertDatabaseEmpty(client: PrismaClient): Promise<void> {
  assert.equal(await client.guildConfig.count(), 0, "guild config must remain unwritten");
  assert.equal(await client.ticketConfig.count(), 0, "ticket config must remain unwritten");
}

test("POST /tickets/publish rejects invalid request bodies without database writes", async (t) => {
  const { POST } = await import("../src/app/api/guilds/[guildId]/tickets/publish/route");
  const cases: Array<{ name: string; body: string }> = [
    { name: "unknown field", body: JSON.stringify({ ...validPayload, extra: true }) },
    { name: "missing required title", body: JSON.stringify({ ...validPayload, panelTitle: "" }) },
    { name: "wrong type", body: JSON.stringify({ ...validPayload, enabled: "true" }) },
    { name: "invalid JSON", body: "{invalid" },
  ];

  for (const invalid of cases) {
    await t.test(invalid.name, async () => {
      await withTemporaryDatabase(async (client) => {
        activeSession = { accessToken: "test-only-session-token" };
        channelType = 0;
        channelExists = true;
        botPermissions = REQUIRED_CHANNEL_PERMISSIONS;
        messageStatus = 201;
        messagePosts = 0;
        mockDiscord();

        const response = await POST(makeRequest(invalid.body), {
          params: { guildId: GUILD_ID },
        });
        assert.equal(response.status, 400);
        assert.equal(messagePosts, 0, "invalid payload must not send a Discord request");
        await assertDatabaseEmpty(client);
      });
    });
  }
});

test("POST /tickets/publish rejects channels outside the guild without writes", async () => {
  const { POST } = await import("../src/app/api/guilds/[guildId]/tickets/publish/route");
  await withTemporaryDatabase(async (client) => {
    activeSession = { accessToken: "test-only-session-token" };
    channelExists = false;
    messagePosts = 0;
    mockDiscord();

    const response = await POST(makeRequest(JSON.stringify(validPayload)), {
      params: { guildId: GUILD_ID },
    });
    assert.equal(response.status, 400);
    assert.equal(messagePosts, 0);
    await assertDatabaseEmpty(client);
  });
});

test("POST /tickets/publish rejects a non-text panel channel without writes", async () => {
  const { POST } = await import("../src/app/api/guilds/[guildId]/tickets/publish/route");
  await withTemporaryDatabase(async (client) => {
    activeSession = { accessToken: "test-only-session-token" };
    channelExists = true;
    channelType = 4;
    messagePosts = 0;
    mockDiscord();

    const response = await POST(makeRequest(JSON.stringify(validPayload)), {
      params: { guildId: GUILD_ID },
    });
    assert.equal(response.status, 400);
    assert.equal(messagePosts, 0);
    await assertDatabaseEmpty(client);
  });
});

test("POST /tickets/publish rejects missing bot channel permissions without writes", async () => {
  const { POST } = await import("../src/app/api/guilds/[guildId]/tickets/publish/route");
  await withTemporaryDatabase(async (client) => {
    activeSession = { accessToken: "test-only-session-token" };
    channelExists = true;
    channelType = 0;
    botPermissions = 0n;
    messagePosts = 0;
    mockDiscord();

    const response = await POST(makeRequest(JSON.stringify(validPayload)), {
      params: { guildId: GUILD_ID },
    });
    assert.equal(response.status, 400);
    assert.equal(messagePosts, 0);
    await assertDatabaseEmpty(client);
  });
});

test("POST /tickets/publish reports Discord send failure without database writes", async () => {
  const { POST } = await import("../src/app/api/guilds/[guildId]/tickets/publish/route");
  await withTemporaryDatabase(async (client) => {
    activeSession = { accessToken: "test-only-session-token" };
    channelExists = true;
    channelType = 0;
    botPermissions = REQUIRED_CHANNEL_PERMISSIONS;
    messageStatus = 403;
    messagePosts = 0;
    mockDiscord();

    const response = await POST(makeRequest(JSON.stringify(validPayload)), {
      params: { guildId: GUILD_ID },
    });
    assert.equal(response.status, 502);
    assert.equal(messagePosts, 1);
    await assertDatabaseEmpty(client);
  });
});
