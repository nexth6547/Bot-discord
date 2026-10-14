import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { mock, test } from "node:test";
import type { ButtonInteraction } from "discord.js";
import { PrismaClient } from "@bot/database";

const GUILD_ID = "100000000000000001";
const MEMBER_ID = "600000000000000001";
const SUPPORT_ROLE_ID = "300000000000000001";
const MANAGE_GUILD = 1n << 5n;
const ADMINISTRATOR = 1n << 3n;

let activePrisma: PrismaClient | undefined;
let failTicketCreate = false;

const prismaProxy = new Proxy(
  {},
  {
    get(_target, property) {
      if (!activePrisma) return undefined;
      const delegate = Reflect.get(activePrisma, property);
      if (property === "ticket" && delegate) {
        return new Proxy(delegate, {
          get(target, method) {
            if (method === "create" && failTicketCreate) {
              return async () => {
                throw new Error("Injected SQLite insert failure");
              };
            }
            const value = Reflect.get(target, method);
            return typeof value === "function" ? value.bind(target) : value;
          },
        });
      }
      return typeof delegate === "function" ? delegate.bind(activePrisma) : delegate;
    },
  }
);

mock.module("@bot/database", {
  exports: { default: prismaProxy },
});

interface MockChannel {
  id: string;
  name: string;
  deleted: boolean;
  delete: (reason?: string) => Promise<void>;
  send: (payload: unknown) => Promise<void>;
}

function makeGuild() {
  const channels = new Map<string, MockChannel>();
  let nextChannelId = 0;
  let createCount = 0;
  let deleteCount = 0;
  let failChannelCreate = false;
  let failChannelDelete = false;

  const guild = {
    id: GUILD_ID,
    name: "Ticket service test guild",
    roles: { everyone: { id: GUILD_ID } },
    channels: {
      create: async () => {
        createCount++;
        if (failChannelCreate) throw new Error("Injected Discord channel creation failure");
        nextChannelId++;
        const channel: MockChannel = {
          id: `${String(200000000000000000n + BigInt(nextChannelId))}`,
          name: `ticket-${nextChannelId}`,
          deleted: false,
          delete: async () => {
            deleteCount++;
            if (failChannelDelete) throw new Error("Injected Discord channel deletion failure");
            channel.deleted = true;
            channels.delete(channel.id);
          },
          send: async () => undefined,
        };
        channels.set(channel.id, channel);
        return channel;
      },
      fetch: async (channelId: string) => channels.get(channelId) ?? null,
    },
    members: {
      fetch: async (userId: string) => makeMember(userId, 0n, new Set()),
    },
  };

  return {
    guild,
    channels,
    createCount: () => createCount,
    deleteCount: () => deleteCount,
    failCreate: () => { failChannelCreate = true; },
    failDelete: () => { failChannelDelete = true; },
  };
}

function makeMember(
  userId: string,
  permissions: bigint,
  roles: Set<string>
) {
  return {
    permissions: { has: (flag: bigint) => (permissions & flag) === flag },
    roles: { cache: { has: (roleId: string) => roles.has(roleId) } },
    user: { id: userId },
  };
}

function makeInteraction(
  fixture: ReturnType<typeof makeGuild>,
  options: {
    userId?: string;
    username?: string;
    permissions?: bigint;
    roles?: Set<string>;
    channel?: MockChannel;
  } = {}
) {
  const replies: Array<Record<string, unknown>> = [];
  const userId = options.userId ?? MEMBER_ID;
  const member = makeMember(userId, options.permissions ?? 0n, options.roles ?? new Set());
  const interaction = {
    guild: fixture.guild,
    channel: options.channel ?? null,
    user: { id: userId, username: options.username ?? "Test User", tag: "Test#0001" },
    client: { user: { id: "700000000000000001" } },
    deferReply: async () => undefined,
    editReply: async (payload: Record<string, unknown>) => {
      replies.push(payload);
      return payload;
    },
    reply: async (payload: Record<string, unknown>) => {
      replies.push(payload);
      return payload;
    },
  };
  fixture.guild.members.fetch = async () => member;
  return {
    interaction: interaction as unknown as ButtonInteraction,
    replies,
  };
}

async function withTemporaryDatabase<T>(
  run: (client: PrismaClient) => Promise<T>
): Promise<T> {
  const directory = mkdtempSync(join(tmpdir(), "bloomera-ticket-service-test-"));
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
    failTicketCreate = false;
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

async function seedTicketConfig(client: PrismaClient): Promise<void> {
  await client.guildConfig.create({
    data: {
      id: GUILD_ID,
      name: "Ticket service test guild",
      ticketConfig: {
        create: {
          enabled: true,
          supportRoleId: SUPPORT_ROLE_ID,
        },
      },
    },
  });
}

async function seedTicket(client: PrismaClient, channelId: string): Promise<void> {
  await client.ticket.create({
    data: {
      guildId: GUILD_ID,
      channelId,
      userId: MEMBER_ID,
      userTag: "Test#0001",
      status: "OPEN",
      openTicketKey: `${GUILD_ID}:${MEMBER_ID}`,
    },
  });
}

function withImmediateCloseDelay(): () => void {
  const original = globalThis.setTimeout;
  globalThis.setTimeout = ((callback: () => void) => {
    callback();
    return 0 as unknown as ReturnType<typeof setTimeout>;
  }) as typeof setTimeout;
  return () => { globalThis.setTimeout = original; };
}

test("sequential double-click creates only one active ticket", async () => {
  const { TicketService } = await import("../src/services/ticketService");
  await withTemporaryDatabase(async (client) => {
    await seedTicketConfig(client);
    const fixture = makeGuild();
    const first = makeInteraction(fixture);
    const second = makeInteraction(fixture);

    await TicketService.handleOpenTicket(first.interaction);
    await TicketService.handleOpenTicket(second.interaction);

    assert.equal(fixture.createCount(), 1);
    assert.equal(await client.ticket.count({ where: { status: "OPEN" } }), 1);
    assert.match(String(second.replies.at(-1)?.content), /déjà un ticket ouvert/i);
  });
});

test("simultaneous clicks honor the unique open-ticket key and clean up the loser channel", async () => {
  const { TicketService } = await import("../src/services/ticketService");
  await withTemporaryDatabase(async (client) => {
    await seedTicketConfig(client);
    const fixture = makeGuild();
    let created = 0;
    let releaseCreation: (() => void) | undefined;
    const bothCreating = new Promise<void>((resolvePromise) => {
      releaseCreation = resolvePromise;
    });
    const originalCreate = fixture.guild.channels.create;
    fixture.guild.channels.create = async () => {
      created++;
      if (created === 2) releaseCreation?.();
      await bothCreating;
      return originalCreate();
    };

    const first = makeInteraction(fixture);
    const second = makeInteraction(fixture);
    await Promise.all([
      TicketService.handleOpenTicket(first.interaction),
      TicketService.handleOpenTicket(second.interaction),
    ]);

    const activeTickets = await client.ticket.findMany({
      where: { guildId: GUILD_ID, status: { in: ["OPEN", "CLOSING"] } },
    });
    assert.equal(created, 2, "barrier ensures both requests passed the initial active-ticket lookup");
    assert.equal(activeTickets.length, 1, "database uniqueness must allow only one active ticket");
    assert.equal(fixture.createCount(), 2);
    assert.equal(fixture.deleteCount(), 1, "the channel from the losing insert must be deleted");
    assert.equal(fixture.channels.size, 1);
  });
});

test("Discord channel creation failure leaves no ticket record", async () => {
  const { TicketService } = await import("../src/services/ticketService");
  await withTemporaryDatabase(async (client) => {
    await seedTicketConfig(client);
    const fixture = makeGuild();
    fixture.failCreate();
    const { interaction, replies } = makeInteraction(fixture);

    await TicketService.handleOpenTicket(interaction);

    assert.equal(await client.ticket.count(), 0);
    assert.match(String(replies.at(-1)?.content), /erreur/i);
  });
});

test("database insertion failure after Discord channel creation cleans up the channel", async () => {
  const { TicketService } = await import("../src/services/ticketService");
  await withTemporaryDatabase(async (client) => {
    await seedTicketConfig(client);
    const fixture = makeGuild();
    failTicketCreate = true;
    const { interaction, replies } = makeInteraction(fixture);

    await TicketService.handleOpenTicket(interaction);

    assert.equal(fixture.createCount(), 1);
    assert.equal(fixture.deleteCount(), 1);
    assert.equal(fixture.channels.size, 0);
    assert.equal(await client.ticket.count(), 0);
    assert.match(String(replies.at(-1)?.content), /erreur/i);
  });
});

test("closing a ticket twice performs one Discord deletion and closes one row", async () => {
  const { TicketService } = await import("../src/services/ticketService");
  await withTemporaryDatabase(async (client) => {
    await seedTicketConfig(client);
    const fixture = makeGuild();
    const channel = {
      id: "800000000000000001",
      name: "ticket",
      deleted: false,
      delete: async () => undefined,
      send: async () => undefined,
    };
    await seedTicket(client, channel.id);

    let releaseDelete: (() => void) | undefined;
    let deleteStarted: (() => void) | undefined;
    const deletionGate = new Promise<void>((resolvePromise) => {
      releaseDelete = resolvePromise;
    });
    const didStartDelete = new Promise<void>((resolvePromise) => {
      deleteStarted = resolvePromise;
    });
    let deleteCalls = 0;
    channel.delete = async () => {
      deleteCalls++;
      deleteStarted?.();
      await deletionGate;
    };
    const restoreTimeout = withImmediateCloseDelay();
    try {
      const first = makeInteraction(fixture, { channel, userId: MEMBER_ID });
      const second = makeInteraction(fixture, { channel, userId: MEMBER_ID });
      const firstClose = TicketService.handleCloseTicket(first.interaction);
      await didStartDelete;
      await TicketService.handleCloseTicket(second.interaction);
      releaseDelete?.();
      await firstClose;

      assert.equal(deleteCalls, 1);
      assert.equal((await client.ticket.findUnique({ where: { channelId: channel.id } }))?.status, "CLOSED");
      assert.match(String(second.replies.at(-1)?.content), /déjà en cours/i);
    } finally {
      restoreTimeout();
    }
  });
});

test("Discord deletion failure restores the ticket to OPEN", async () => {
  const { TicketService } = await import("../src/services/ticketService");
  await withTemporaryDatabase(async (client) => {
    await seedTicketConfig(client);
    const fixture = makeGuild();
    fixture.failDelete();
    const channel = {
      id: "800000000000000002",
      name: "ticket",
      deleted: false,
      delete: async () => { throw new Error("Injected Discord delete failure"); },
      send: async () => undefined,
    };
    await seedTicket(client, channel.id);
    const { interaction, replies } = makeInteraction(fixture, { channel });
    const restoreTimeout = withImmediateCloseDelay();
    try {
      await TicketService.handleCloseTicket(interaction);
    } finally {
      restoreTimeout();
    }

    const ticket = await client.ticket.findUnique({ where: { channelId: channel.id } });
    assert.equal(ticket?.status, "OPEN");
    assert.equal(ticket?.closedBy, null);
    assert.equal(ticket?.openTicketKey, `${GUILD_ID}:${MEMBER_ID}`);
    assert.match(String(replies.at(-1)?.content), /reste ouvert/i);
  });
});

test("member without permissions cannot close another member's ticket", async () => {
  const { TicketService } = await import("../src/services/ticketService");
  await withTemporaryDatabase(async (client) => {
    await seedTicketConfig(client);
    const fixture = makeGuild();
    const channel = {
      id: "800000000000000003",
      name: "ticket",
      deleted: false,
      delete: async () => undefined,
      send: async () => undefined,
    };
    await seedTicket(client, channel.id);
    const { interaction, replies } = makeInteraction(fixture, {
      channel,
      userId: "600000000000000002",
      permissions: 0n,
    });

    await TicketService.handleCloseTicket(interaction);

    assert.equal(fixture.deleteCount(), 0);
    assert.equal((await client.ticket.findUnique({ where: { channelId: channel.id } }))?.status, "OPEN");
    assert.match(String(replies.at(-1)?.content), /auteur du ticket/i);
  });
});

test("member without permissions cannot claim a ticket; claim action is not implemented", async () => {
  const { onInteractionCreate } = await import("../src/events/interactionCreate");
  await withTemporaryDatabase(async (client) => {
    await seedTicketConfig(client);
    const fixture = makeGuild();
    const channel = {
      id: "800000000000000004",
      name: "ticket",
      deleted: false,
      delete: async () => undefined,
      send: async () => undefined,
    };
    await seedTicket(client, channel.id);
    const { interaction, replies } = makeInteraction(fixture, {
      channel,
      userId: "600000000000000002",
      permissions: 0n,
    });
    Object.assign(interaction, {
      customId: "ticket_claim",
      isChatInputCommand: () => false,
      isButton: () => true,
    });

    await onInteractionCreate(interaction, { commands: new Map() } as never);

    assert.equal((await client.ticket.findUnique({ where: { channelId: channel.id } }))?.status, "OPEN");
    assert.equal(replies.length, 0, "no claim handler or claim action is registered");
  });
});

test("ticket owner, support role, and guild moderators can close tickets", async (t) => {
  const { TicketService } = await import("../src/services/ticketService");
  for (const access of [
    { name: "owner", userId: MEMBER_ID, permissions: 0n, roles: new Set<string>() },
    { name: "support role", userId: "600000000000000002", permissions: 0n, roles: new Set([SUPPORT_ROLE_ID]) },
    { name: "ManageGuild", userId: "600000000000000003", permissions: MANAGE_GUILD, roles: new Set<string>() },
    { name: "Administrator", userId: "600000000000000004", permissions: ADMINISTRATOR, roles: new Set<string>() },
  ]) {
    await t.test(access.name, async () => {
      await withTemporaryDatabase(async (client) => {
        await seedTicketConfig(client);
        const fixture = makeGuild();
        const channel = {
          id: `80000000000000000${String(access.name.length % 10)}`,
          name: "ticket",
          deleted: false,
          delete: async () => undefined,
          send: async () => undefined,
        };
        await seedTicket(client, channel.id);
        const { interaction } = makeInteraction(fixture, { ...access, channel });
        const restoreTimeout = withImmediateCloseDelay();
        try {
          await TicketService.handleCloseTicket(interaction);
        } finally {
          restoreTimeout();
        }
        assert.equal((await client.ticket.findUnique({ where: { channelId: channel.id } }))?.status, "CLOSED");
      });
    });
  }
});
