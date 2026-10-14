import assert from "node:assert/strict";
import { mock, test } from "node:test";
import type { GuildMember, Message, PartialGuildMember } from "discord.js";

const GUILD_ID = "100000000000000001";
const MEMBER_ID = "600000000000000001";
const CHANNEL_ID = "200000000000000001";

const sentMessages: Array<{ channelId: string; payload: Record<string, unknown> }> = [];
let welcomeConfig: Record<string, unknown> | null = null;
let levelConfig: Record<string, unknown> | null = null;

const prismaMock = {
  welcomeConfig: {
    findUnique: async () => welcomeConfig,
  },
  levelConfig: {
    findUnique: async () => levelConfig,
  },
  userLevel: {
    findUnique: async () => null,
    upsert: async () => ({}),
  },
  logConfig: {
    findUnique: async () => null,
  },
};

mock.module("@bot/database", {
  exports: { default: prismaMock },
});

function makeGuildAndChannel() {
  const channel = {
    isTextBased: () => true,
    send: async (payload: Record<string, unknown>) => {
      sentMessages.push({ channelId: CHANNEL_ID, payload });
    },
  };
  const guild = {
    id: GUILD_ID,
    name: "Mention test guild",
    memberCount: 3,
    channels: { cache: new Map([[CHANNEL_ID, channel]]) },
    roles: { cache: new Map() },
  };
  return { guild, channel };
}

function makeUser() {
  return {
    id: MEMBER_ID,
    tag: "member#0001",
    createdTimestamp: 1_700_000_000_000,
    displayAvatarURL: () => "https://example.invalid/avatar.png",
  };
}

test("welcome mentions are limited to the joining member", async () => {
  const { onGuildMemberAdd } = await import("../src/events/guildMemberAdd");
  for (const useEmbed of [false, true]) {
    sentMessages.length = 0;
    const { guild } = makeGuildAndChannel();
    welcomeConfig = {
      enabled: true,
      channelId: CHANNEL_ID,
      message: "Hello {user} <@&700000000000000001>",
      useEmbed,
      embedColor: "#F59E0B",
      embedTitle: "Welcome",
      autoRoleId: null,
      leaveEnabled: false,
      leaveChannelId: null,
      leaveMessage: "Goodbye",
    };
    const member = {
      id: MEMBER_ID,
      guild,
      user: makeUser(),
      roles: { add: async () => undefined },
    } as unknown as GuildMember;

    await onGuildMemberAdd(member);

    const welcome = sentMessages.find(({ payload }) => "allowedMentions" in payload);
    assert.ok(welcome, `welcome message (embed=${useEmbed}) should be sent`);
    assert.deepEqual(welcome.payload.allowedMentions, {
      parse: [],
      users: [MEMBER_ID],
    });
  }
});

test("departure messages do not enable any mentions", async () => {
  const { onGuildMemberRemove } = await import("../src/events/guildMemberRemove");
  sentMessages.length = 0;
  const { guild } = makeGuildAndChannel();
  welcomeConfig = {
    leaveEnabled: true,
    leaveChannelId: CHANNEL_ID,
    leaveMessage: "Bye {user} <@everyone> <@&700000000000000001>",
  };
  const member = {
    id: MEMBER_ID,
    guild,
    user: makeUser(),
  } as unknown as GuildMember | PartialGuildMember;

  await onGuildMemberRemove(member);

  const departure = sentMessages.find(({ payload }) => "allowedMentions" in payload);
  assert.ok(departure, "departure message should be sent");
  assert.deepEqual(departure.payload.allowedMentions, { parse: [] });
});

test("level-up announcements allow only the member earning XP", async () => {
  const { LevelService } = await import("../src/services/levelService");
  sentMessages.length = 0;
  const { guild, channel } = makeGuildAndChannel();
  levelConfig = {
    enabled: true,
    xpPerMessageMin: 155,
    xpPerMessageMax: 155,
    cooldownSeconds: 0,
    announceChannelId: null,
    announceMessage: "Bravo {user}, pas <@&700000000000000001> ! Niveau {level}",
    ignoredChannelIds: "[]",
  };
  const message = {
    guild,
    author: {
      id: MEMBER_ID,
      bot: false,
      tag: "member#0001",
      displayAvatarURL: () => "https://example.invalid/avatar.png",
    },
    channel: { ...channel, id: CHANNEL_ID },
  } as unknown as Message;

  await LevelService.handleMessage(message);

  const announcement = sentMessages.find(({ payload }) => "allowedMentions" in payload);
  assert.ok(announcement, "level-up announcement should be sent");
  assert.deepEqual(announcement.payload.allowedMentions, {
    parse: [],
    users: [MEMBER_ID],
  });
});
