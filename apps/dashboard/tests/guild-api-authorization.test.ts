import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { mock, test } from "node:test";
import { PrismaClient } from "@bot/database";

const GUILD_ID = "100000000000000001";
const OTHER_GUILD_ID = "100000000000000002";
const CHANNEL_ID = "200000000000000001";
const ROLE_ID = "300000000000000001";
const PANEL_MESSAGE_ID = "400000000000000001";
const ADMINISTRATOR = 1n << 3n;
const MANAGE_GUILD = 1n << 5n;
const BOT_PERMISSIONS =
  (1n << 4n) | (1n << 10n) | (1n << 11n) | (1n << 14n) | (1n << 28n);

type Session = { accessToken: string } | null;
type ApiMethod = "GET" | "POST" | "DELETE";
type RouteHandler = (request: Request, context: { params: { guildId: string } }) => Promise<Response>;
type RouteModule = Partial<Record<ApiMethod, RouteHandler>>;

let activeSession: Session = null;
let activePrisma: PrismaClient | undefined;
let botIsInGuild = true;
let userPermissions = String(ADMINISTRATOR);

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

const testClientId = "900000000000000001";
process.env.NODE_ENV = "test";
process.env.DISCORD_TOKEN = "test-only-not-a-token";
process.env.DISCORD_CLIENT_ID = testClientId;
process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID = testClientId;
process.env.DISCORD_CLIENT_SECRET = "test-only-client-secret-value";
process.env.NEXTAUTH_SECRET = "test-only-secret-value-with-more-than-32-characters";
process.env.NEXTAUTH_URL = "http://localhost:3000";
process.env.DISCORD_REDIRECT_URI = "http://localhost:3000/api/auth/callback/discord";
process.env.DATABASE_URL = "file:./test.db";

const successBodies: Record<string, Record<string, unknown>> = {
  "POST /tickets": { enabled: false },
  "POST /tickets/publish": {
    enabled: true,
    panelChannelId: CHANNEL_ID,
    panelTitle: "Support",
    panelDescription: "Open a ticket",
    buttonText: "Create ticket",
  },
  "POST /logs": { enabled: true },
  "POST /reaction-roles": {
    channelId: CHANNEL_ID,
    targetRoleId: ROLE_ID,
    label: "Get role",
    emoji: "⭐",
  },
  "POST /moderation": { autoModAntiLink: true },
  "POST /welcome": { enabled: false },
  "POST /levels": { enabled: true },
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function setDiscordMocks(): void {
  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    const method = init?.method ?? "GET";

    if (url.pathname === "/api/v10/users/@me/guilds") {
      return jsonResponse([
        {
          id: GUILD_ID,
          name: "Authorization test guild",
          icon: null,
          permissions: userPermissions,
          owner: false,
        },
      ]);
    }

    if (url.pathname === `/api/v10/guilds/${GUILD_ID}`) {
      if (!botIsInGuild) return jsonResponse({ message: "Unknown Guild" }, 404);
      return jsonResponse({ id: GUILD_ID, approximate_member_count: 12 });
    }

    if (url.pathname === `/api/v10/guilds/${GUILD_ID}/channels`) {
      return jsonResponse([
        {
          id: CHANNEL_ID,
          name: "test-channel",
          type: 0,
          position: 0,
          permission_overwrites: [],
        },
      ]);
    }

    if (url.pathname === `/api/v10/guilds/${GUILD_ID}/roles`) {
      return jsonResponse([
        { id: GUILD_ID, name: "@everyone", position: 0, managed: false, permissions: "0" },
        { id: ROLE_ID, name: "Test role", position: 1, managed: false, permissions: "0" },
        {
          id: "500000000000000001",
          name: "Bot role",
          position: 10,
          managed: false,
          permissions: String(BOT_PERMISSIONS),
        },
      ]);
    }

    if (url.pathname === `/api/v10/guilds/${GUILD_ID}/members/@me`) {
      return jsonResponse({ user: { id: "600000000000000001" }, roles: ["500000000000000001"] });
    }

    if (url.pathname.startsWith(`/api/v10/channels/${CHANNEL_ID}/messages`)) {
      if (method === "POST" || method === "PATCH") {
        return jsonResponse({ id: PANEL_MESSAGE_ID }, method === "POST" ? 201 : 200);
      }
      return new Response(null, { status: 204 });
    }

    throw new Error(`Unexpected Discord request: ${method} ${url.pathname}`);
  };
}

async function withTemporaryDatabase<T>(run: (client: PrismaClient) => Promise<T>): Promise<T> {
  const directory = mkdtempSync(join(tmpdir(), "bloomera-guild-api-test-"));
  const schemaPath = join(directory, "schema.prisma");
  const schemaSource = readFileSync(
    resolve(dirname(fileURLToPath(import.meta.url)), "../../../packages/database/prisma/schema.prisma"),
    "utf8"
  );
  const schema = schemaSource.replace(
    /url\s*=\s*env\("DATABASE_URL"\)/,
    'url = "file:./test.db"'
  );
  assert.notEqual(schema, schemaSource, "Temporary Prisma schema must use the isolated SQLite file");
  writeFileSync(schemaPath, schema);

  try {
    execFileSync(
      resolve(dirname(fileURLToPath(import.meta.url)), "../../../packages/database/node_modules/.bin/prisma"),
      ["db", "push", "--schema", schemaPath, "--skip-generate"],
      { cwd: directory, stdio: "pipe" }
    );

    const client = new PrismaClient({
      datasources: { db: { url: `file:${join(directory, "test.db")}` } },
    });
    activePrisma = client;
    try {
      return await run(client);
    } finally {
      activePrisma = undefined;
      await client.$disconnect();
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

function getHandler(module: RouteModule, method: ApiMethod): RouteHandler {
  const handler = module[method];
  assert.ok(handler, `${method} handler must exist`);
  return handler;
}

function makeRequest(method: ApiMethod, path: string, guildId = GUILD_ID): Request {
  const query =
    method === "DELETE" && path === "/reaction-roles"
      ? `?id=owned-reaction-role`
      : "";
  const body = successBodies[`${method} ${path}`];
  return new Request(`http://localhost/api/guilds/${guildId}${path}${query}`, {
    method,
    ...(body ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {}),
  });
}

async function invoke(
  module: RouteModule,
  method: ApiMethod,
  path: string,
  guildId = GUILD_ID
): Promise<Response> {
  return getHandler(module, method)(
    makeRequest(method, path, guildId),
    { params: { guildId } }
  );
}

function makeRawPostRequest(path: string, body: string | undefined): Request {
  return new Request(`http://localhost/api/guilds/${GUILD_ID}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body }),
  });
}

async function assertNoGuildWrites(client: PrismaClient): Promise<void> {
  const counts = await Promise.all([
    client.guildConfig.count(),
    client.logConfig.count(),
    client.modConfig.count(),
    client.welcomeConfig.count(),
    client.levelConfig.count(),
    client.ticketConfig.count(),
    client.reactionRole.count(),
    client.ticket.count(),
    client.userLevel.count(),
    client.sanction.count(),
  ]);
  assert.deepEqual(counts, Array(counts.length).fill(0), "invalid POST must not write any guild data");
}

async function seedReactionRole(
  client: PrismaClient,
  id: string,
  guildId: string,
  label: string
): Promise<void> {
  await client.guildConfig.upsert({
    where: { id: guildId },
    create: { id: guildId, name: "Test guild" },
    update: {},
  });
  await client.reactionRole.create({
    data: {
      id,
      guildId,
      channelId: CHANNEL_ID,
      messageId: PANEL_MESSAGE_ID,
      roleId: ROLE_ID,
      label,
    },
  });
}

setDiscordMocks();

test("GET /api/guilds requires a session and returns manageable guilds for a valid session", async (t) => {
  const route = await import("../src/app/api/guilds/route");
  const previousSession = activeSession;
  const previousFetch = globalThis.fetch;
  t.after(() => {
    activeSession = previousSession;
    globalThis.fetch = previousFetch;
  });

  activeSession = null;
  const unauthorized = await route.GET();
  assert.equal(unauthorized.status, 401);

  await withTemporaryDatabase(async () => {
    activeSession = { accessToken: "test-only-session-token" };
    globalThis.fetch = async () =>
      jsonResponse([
        {
          id: GUILD_ID,
          name: "Authorized test guild",
          icon: null,
          permissions: String(ADMINISTRATOR),
          approximate_member_count: 4,
        },
      ]);

    const authorized = await route.GET();
    assert.equal(authorized.status, 200);
    assert.deepEqual(await authorized.json(), {
      guilds: [
        {
          id: GUILD_ID,
          name: "Authorized test guild",
          icon: null,
          approximateMemberCount: 4,
          botPresent: false,
        },
      ],
    });
  });
});

test("every /api/guilds/[guildId] route method enforces the authorization matrix", async (t) => {
  const [
    ticketRoutes,
    ticketPublishRoute,
    logRoutes,
    overviewRoute,
    reactionRoleRoutes,
    moderationRoutes,
    welcomeRoutes,
    serverRoute,
    levelRoutes,
    resourcesRoute,
  ] = await Promise.all([
    import("../src/app/api/guilds/[guildId]/tickets/route"),
    import("../src/app/api/guilds/[guildId]/tickets/publish/route"),
    import("../src/app/api/guilds/[guildId]/logs/route"),
    import("../src/app/api/guilds/[guildId]/overview/route"),
    import("../src/app/api/guilds/[guildId]/reaction-roles/route"),
    import("../src/app/api/guilds/[guildId]/moderation/route"),
    import("../src/app/api/guilds/[guildId]/welcome/route"),
    import("../src/app/api/guilds/[guildId]/server/route"),
    import("../src/app/api/guilds/[guildId]/levels/route"),
    import("../src/app/api/guilds/[guildId]/resources/route"),
  ]);
  const routes: Array<{ path: string; methods: Partial<Record<ApiMethod, RouteModule>> }> = [
    { path: "/tickets", methods: { GET: ticketRoutes, POST: ticketRoutes } },
    { path: "/tickets/publish", methods: { POST: ticketPublishRoute } },
    { path: "/logs", methods: { GET: logRoutes, POST: logRoutes } },
    { path: "/overview", methods: { GET: overviewRoute } },
    { path: "/reaction-roles", methods: { GET: reactionRoleRoutes, POST: reactionRoleRoutes, DELETE: reactionRoleRoutes } },
    { path: "/moderation", methods: { GET: moderationRoutes, POST: moderationRoutes } },
    { path: "/welcome", methods: { GET: welcomeRoutes, POST: welcomeRoutes } },
    { path: "/server", methods: { GET: serverRoute } },
    { path: "/levels", methods: { GET: levelRoutes, POST: levelRoutes } },
    { path: "/resources", methods: { GET: resourcesRoute } },
  ];

  for (const route of routes) {
    for (const [method, module] of Object.entries(route.methods) as Array<[ApiMethod, RouteModule]>) {
      const name = `${method} /api/guilds/[guildId]${route.path}`;
      await t.test(name, async () => {
        await withTemporaryDatabase(async (client) => {
          const handler = getHandler(module, method);
          activeSession = { accessToken: "test-only-session-token" };
          userPermissions = String(ADMINISTRATOR);
          botIsInGuild = true;

          const invalidGuild = await handler(
            makeRequest(method, route.path, "not-a-snowflake"),
            { params: { guildId: "not-a-snowflake" } }
          );
          assert.equal(invalidGuild.status, 400, "invalid guild IDs must be refused");

          activeSession = null;
          const unauthenticated = await invoke(module, method, route.path);
          assert.equal(unauthenticated.status, 401, "a missing session must be refused");

          activeSession = { accessToken: "test-only-session-token" };
          userPermissions = "0";
          const withoutPermission = await invoke(module, method, route.path);
          assert.equal(withoutPermission.status, 403, "a session without guild permissions must be refused");

          userPermissions = String(ADMINISTRATOR);
          botIsInGuild = false;
          const withoutBot = await invoke(module, method, route.path);
          assert.equal(withoutBot.status, 403, "a guild without the bot must be refused");
          botIsInGuild = true;

          if (method === "DELETE" && route.path === "/reaction-roles") {
            await seedReactionRole(client, "owned-reaction-role", GUILD_ID, "Owned role");
          }

          userPermissions = String(MANAGE_GUILD);
          const manageGuildAllowed = await invoke(module, method, route.path);
          assert.ok(
            manageGuildAllowed.status >= 200 && manageGuildAllowed.status < 300,
            `a ManageGuild member should be allowed, got HTTP ${manageGuildAllowed.status}`
          );

          if (method === "DELETE" && route.path === "/reaction-roles") {
            await seedReactionRole(client, "owned-reaction-role", GUILD_ID, "Owned role");
          }

          userPermissions = String(ADMINISTRATOR);
          const allowed = await invoke(module, method, route.path);
          assert.ok(
            allowed.status >= 200 && allowed.status < 300,
            `an administrator should be allowed, got HTTP ${allowed.status}`
          );

          if (method === "DELETE" && route.path === "/reaction-roles") {
            await seedReactionRole(
              client,
              "foreign-reaction-role",
              OTHER_GUILD_ID,
              "Foreign role"
            );
            const foreignDelete = await handler(
              new Request(
                `http://localhost/api/guilds/${GUILD_ID}/reaction-roles?id=foreign-reaction-role`,
                { method: "DELETE" }
              ),
              { params: { guildId: GUILD_ID } }
            );
            assert.equal(foreignDelete.status, 404, "an object from another guild must not be deletable");
            assert.ok(
              await client.reactionRole.findUnique({ where: { id: "foreign-reaction-role" } }),
              "the foreign guild's object must remain in the database"
            );
          }
        });

        test("configuration POST routes reject invalid payloads without writing to SQLite", async (t) => {
          const validationRoutes: Array<{
            path: string;
            module: RouteModule;
            valid: Record<string, unknown>;
            typeField: string;
            invalidSnowflakes: string[];
            foreignReferences: Array<{ key: string; value: string }>;
            outOfBounds?: Record<string, unknown>;
            inconsistentBounds?: Record<string, number>;
            missingRequired?: Record<string, unknown>;
          }> = [
            {
              path: "/logs",
              module: await import("../src/app/api/guilds/[guildId]/logs/route"),
              valid: { enabled: true },
              typeField: "enabled",
              invalidSnowflakes: ["modLogChannelId"],
              foreignReferences: [{ key: "modLogChannelId", value: "700000000000000001" }],
            },
            {
              path: "/moderation",
              module: await import("../src/app/api/guilds/[guildId]/moderation/route"),
              valid: { autoModAntiLink: true },
              typeField: "autoModAntiLink",
              invalidSnowflakes: ["modRoleId"],
              foreignReferences: [{ key: "modRoleId", value: "700000000000000002" }],
            },
            {
              path: "/welcome",
              module: await import("../src/app/api/guilds/[guildId]/welcome/route"),
              valid: { enabled: false },
              typeField: "enabled",
              invalidSnowflakes: ["channelId", "autoRoleId"],
              foreignReferences: [
                { key: "channelId", value: "700000000000000003" },
                { key: "autoRoleId", value: "700000000000000004" },
              ],
              outOfBounds: {
                message: "x".repeat(2001),
                embedTitle: "x".repeat(257),
                leaveMessage: "x".repeat(2001),
              },
            },
            {
              path: "/levels",
              module: await import("../src/app/api/guilds/[guildId]/levels/route"),
              valid: { enabled: true },
              typeField: "enabled",
              invalidSnowflakes: ["announceChannelId"],
              foreignReferences: [{ key: "announceChannelId", value: "700000000000000005" }],
              outOfBounds: {
                xpPerMessageMin: 0,
                xpPerMessageMax: 1001,
                cooldownSeconds: 86401,
              },
              inconsistentBounds: { xpPerMessageMin: 50, xpPerMessageMax: 49 },
            },
            {
              path: "/tickets",
              module: await import("../src/app/api/guilds/[guildId]/tickets/route"),
              valid: { enabled: false },
              typeField: "enabled",
              invalidSnowflakes: ["categoryId", "supportRoleId"],
              foreignReferences: [
                { key: "categoryId", value: "700000000000000006" },
                { key: "supportRoleId", value: "700000000000000007" },
              ],
              outOfBounds: {
                panelTitle: "x".repeat(257),
                panelDescription: "x".repeat(4001),
                buttonText: "x".repeat(81),
              },
            },
            {
              path: "/reaction-roles",
              module: await import("../src/app/api/guilds/[guildId]/reaction-roles/route"),
              valid: {
                channelId: CHANNEL_ID,
                targetRoleId: ROLE_ID,
                label: "Get role",
                emoji: "⭐",
              },
              typeField: "targetRoleId",
              invalidSnowflakes: ["channelId", "targetRoleId"],
              foreignReferences: [
                { key: "channelId", value: "700000000000000008" },
                { key: "targetRoleId", value: "700000000000000009" },
              ],
              outOfBounds: { label: "x".repeat(81), emoji: "x".repeat(33) },
              missingRequired: {
                channelId: CHANNEL_ID,
                targetRoleId: ROLE_ID,
                label: "Get role",
              },
            },
          ];

          for (const route of validationRoutes) {
            await t.test(`POST /api/guilds/[guildId]${route.path}`, async (t) => {
              await withTemporaryDatabase(async (client) => {
                activeSession = { accessToken: "test-only-session-token" };
                userPermissions = String(ADMINISTRATOR);
                botIsInGuild = true;

                const cases: Array<{ name: string; body: string | undefined }> = [
                  {
                    name: "unknown field",
                    body: JSON.stringify({ ...route.valid, unexpected: true }),
                  },
                  { name: "missing configuration body", body: "{}" },
                  { name: "wrong field type", body: JSON.stringify({ [route.typeField]: "not-a-valid-type" }) },
                  ...route.invalidSnowflakes.map((key) => ({
                    name: `invalid snowflake (${key})`,
                    body: JSON.stringify({ [key]: "invalid-id" }),
                  })),
                  { name: "empty body", body: undefined },
                  { name: "malformed JSON", body: "{not-json" },
                  ...route.foreignReferences.map(({ key, value }) => ({
                    name: `reference outside this guild (${key})`,
                    body: JSON.stringify({ [key]: value }),
                  })),
                ];

                if (route.outOfBounds) {
                  for (const [key, value] of Object.entries(route.outOfBounds)) {
                    cases.push({
                      name: `out-of-bounds value (${key})`,
                      body: JSON.stringify({ [key]: value }),
                    });
                  }
                }
                if (route.inconsistentBounds) {
                  cases.push({
                    name: "minimum XP exceeds maximum XP",
                    body: JSON.stringify(route.inconsistentBounds),
                  });
                }
                if (route.missingRequired) {
                  cases.push({
                    name: "missing required field",
                    body: JSON.stringify(route.missingRequired),
                  });
                }

                for (const invalidCase of cases) {
                  const response = await getHandler(route.module, "POST")(
                    makeRawPostRequest(route.path, invalidCase.body),
                    { params: { guildId: GUILD_ID } }
                  );
                  assert.equal(response.status, 400, `${invalidCase.name} must be rejected`);
                  await assertNoGuildWrites(client);
                }
              });
            });
          }
        });
      });
    }
  }
});
