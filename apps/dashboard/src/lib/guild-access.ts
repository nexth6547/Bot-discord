import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@bot/database";
import { authOptions } from "@/lib/auth";

const ADMINISTRATOR = 1n << 3n;
const MANAGE_GUILD = 1n << 5n;
const SNOWFLAKE_PATTERN = /^\d{17,20}$/;

interface DiscordGuild {
  id: string;
  name: string;
  icon: string | null;
  permissions: string;
  owner?: boolean;
  owner_id?: string;
}

interface DiscordChannel {
  id: string;
  type: number;
}

interface DiscordRole {
  id: string;
  position: number;
  managed: boolean;
  permissions: string;
}

interface DiscordMember {
  roles: string[];
}

type GuildAccess =
  | { ok: true; guild: DiscordGuild }
  | { ok: false; response: NextResponse };

export async function authorizeGuild(guildId: string): Promise<GuildAccess> {
  if (!SNOWFLAKE_PATTERN.test(guildId)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "INVALID_GUILD_ID" }, { status: 400 }),
    };
  }

  const session = await getServerSession(authOptions);
  if (!session?.accessToken || session.accessTokenError) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: session?.accessTokenError ? "SESSION_EXPIRED" : "UNAUTHORIZED" },
        { status: 401 }
      ),
    };
  }

  const botToken = process.env.DISCORD_TOKEN;
  if (!botToken) {
    console.error("DISCORD_TOKEN is not configured for guild authorization.");
    return {
      ok: false,
      response: NextResponse.json({ error: "SERVICE_UNAVAILABLE" }, { status: 503 }),
    };
  }

  try {
    const userGuildsResponse = await fetch(
      "https://discord.com/api/v10/users/@me/guilds",
      {
        headers: { Authorization: `Bearer ${session.accessToken}` },
        cache: "no-store",
      }
    );

    if (userGuildsResponse.status === 401) {
      return {
        ok: false,
        response: NextResponse.json({ error: "SESSION_EXPIRED" }, { status: 401 }),
      };
    }
    if (!userGuildsResponse.ok) {
      return {
        ok: false,
        response: NextResponse.json({ error: "DISCORD_UNAVAILABLE" }, { status: 502 }),
      };
    }

    const guilds = (await userGuildsResponse.json()) as DiscordGuild[];
    const guild = guilds.find((entry) => entry.id === guildId);
    if (!guild) {
      return {
        ok: false,
        response: NextResponse.json({ error: "FORBIDDEN" }, { status: 403 }),
      };
    }

    let permissions: bigint;
    try {
      permissions = BigInt(guild.permissions);
    } catch {
      return {
        ok: false,
        response: NextResponse.json({ error: "DISCORD_UNAVAILABLE" }, { status: 502 }),
      };
    }

    if (
      !guild.owner &&
      (permissions & (ADMINISTRATOR | MANAGE_GUILD)) === 0n
    ) {
      return {
        ok: false,
        response: NextResponse.json({ error: "FORBIDDEN" }, { status: 403 }),
      };
    }

    const botGuildResponse = await fetch(
      `https://discord.com/api/v10/guilds/${guildId}`,
      {
        headers: { Authorization: `Bot ${botToken}` },
        cache: "no-store",
      }
    );

    if (botGuildResponse.status === 404 || botGuildResponse.status === 403) {
      return {
        ok: false,
        response: NextResponse.json({ error: "BOT_NOT_IN_GUILD" }, { status: 403 }),
      };
    }
    if (!botGuildResponse.ok) {
      return {
        ok: false,
        response: NextResponse.json({ error: "DISCORD_UNAVAILABLE" }, { status: 502 }),
      };
    }

    return { ok: true, guild };
  } catch (error) {
    console.error("Discord guild authorization failed:", error);
    return {
      ok: false,
      response: NextResponse.json({ error: "DISCORD_UNAVAILABLE" }, { status: 502 }),
    };
  }
}

export function invalidRequest(): NextResponse {
  return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });
}

export function invalidConfig(): NextResponse {
  return NextResponse.json({ error: "INVALID_CONFIG" }, { status: 400 });
}

export function internalError(error: unknown, operation: string): NextResponse {
  console.error(`${operation} failed:`, error);
  return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
}

export async function readJsonObject(
  request: Request
): Promise<Record<string, unknown> | null> {
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) return null;
    return body as Record<string, unknown>;
  } catch {
    return null;
  }
}

export type ConfigField =
  | { type: "boolean" }
  | { type: "snowflake"; nullable?: boolean }
  | { type: "text"; maxLength: number }
  | { type: "color" }
  | { type: "snowflakes" }
  | { type: "integer"; min: number; max: number };

export function validateConfig(
  body: Record<string, unknown>,
  fields: Record<string, ConfigField>
): Record<string, string | number | boolean | null> | null {
  const entries = Object.entries(body);
  if (entries.length === 0) return null;

  const validated: Record<string, string | number | boolean | null> = {};
  for (const [key, value] of entries) {
    const field = fields[key];
    if (!field) return null;

    if (field.type === "boolean") {
      if (typeof value !== "boolean") return null;
      validated[key] = value;
    } else if (field.type === "snowflake") {
      if (value === null && field.nullable) {
        validated[key] = null;
      } else if (typeof value === "string" && SNOWFLAKE_PATTERN.test(value)) {
        validated[key] = value;
      } else {
        return null;
      }
    } else if (field.type === "text") {
      if (typeof value !== "string" || value.length > field.maxLength) return null;
      validated[key] = value;
    } else if (field.type === "color") {
      if (typeof value !== "string" || !/^#[\da-fA-F]{6}$/.test(value)) return null;
      validated[key] = value;
    } else if (field.type === "snowflakes") {
      if (typeof value !== "string" || value.length > 2000) return null;
      try {
        const ids: unknown = JSON.parse(value);
        if (
          !Array.isArray(ids) ||
          ids.length > 100 ||
          !ids.every((id) => typeof id === "string" && SNOWFLAKE_PATTERN.test(id))
        ) {
          return null;
        }
        validated[key] = JSON.stringify([...new Set(ids)]);
      } catch {
        return null;
      }
    } else {
      if (
        typeof value !== "number" ||
        !Number.isInteger(value) ||
        value < field.min ||
        value > field.max
      ) {
        return null;
      }
      validated[key] = value;
    }
  }
  return validated;
}

export async function validateGuildReferences(
  guildId: string,
  values: Record<string, string | number | boolean | null>
): Promise<NextResponse | null> {
  const channelReferences: Array<[string, string | number | boolean | null]> =
    Object.entries(values).filter(
    ([key, value]) =>
      typeof value === "string" &&
      (key === "channelId" || key === "categoryId" || key.endsWith("ChannelId"))
  );
  const roleReferences = Object.entries(values).filter(
    ([key, value]) => typeof value === "string" && key.endsWith("RoleId")
  );
  const ignoredChannels = values.ignoredChannelIds;
  if (typeof ignoredChannels === "string") {
    const ids = JSON.parse(ignoredChannels) as string[];
    for (const id of ids) channelReferences.push(["ignoredChannelIds", id]);
  }

  if (channelReferences.length === 0 && roleReferences.length === 0) return null;

  const botToken = process.env.DISCORD_TOKEN;
  if (!botToken) {
    console.error("DISCORD_TOKEN is not configured for Discord reference validation.");
    return NextResponse.json({ error: "SERVICE_UNAVAILABLE" }, { status: 503 });
  }

  try {
    const uniqueChannelIds = [...new Set(channelReferences.map(([, id]) => id as string))];
    const uniqueRoleIds = [...new Set(roleReferences.map(([, id]) => id as string))];
    const [channelsResponse, rolesResponse, memberResponse] = await Promise.all([
      uniqueChannelIds.length
        ? fetch(`https://discord.com/api/v10/guilds/${guildId}/channels`, {
            headers: { Authorization: `Bot ${botToken}` },
            cache: "no-store",
          })
        : Promise.resolve(null),
      uniqueRoleIds.length
        ? fetch(`https://discord.com/api/v10/guilds/${guildId}/roles`, {
            headers: { Authorization: `Bot ${botToken}` },
            cache: "no-store",
          })
        : Promise.resolve(null),
      uniqueRoleIds.length
        ? fetch(`https://discord.com/api/v10/guilds/${guildId}/members/@me`, {
            headers: { Authorization: `Bot ${botToken}` },
            cache: "no-store",
          })
        : Promise.resolve(null),
    ]);

    if (
      channelsResponse && !channelsResponse.ok ||
      rolesResponse && !rolesResponse.ok ||
      memberResponse && !memberResponse.ok
    ) {
      return NextResponse.json({ error: "DISCORD_UNAVAILABLE" }, { status: 502 });
    }

    const channels = channelsResponse
      ? ((await channelsResponse.json()) as DiscordChannel[])
      : [];
    const roles = rolesResponse ? ((await rolesResponse.json()) as DiscordRole[]) : [];
    const botMember = memberResponse
      ? ((await memberResponse.json()) as DiscordMember)
      : null;

    const channelsById = new Map(channels.map((channel) => [channel.id, channel]));
    for (const [key, rawId] of channelReferences) {
      const channel = channelsById.get(rawId as string);
      if (!channel) return NextResponse.json({ error: "INVALID_CHANNEL_ID" }, { status: 400 });
      const expectedType = key === "categoryId" ? 4 : undefined;
      if (
        expectedType !== undefined
          ? channel.type !== expectedType
          : channel.type !== 0 && channel.type !== 5
      ) {
        return NextResponse.json({ error: "INVALID_CHANNEL_TYPE" }, { status: 400 });
      }
    }

    const rolesById = new Map(roles.map((role) => [role.id, role]));
    for (const [, rawId] of roleReferences) {
      if (!rolesById.has(rawId as string)) {
        return NextResponse.json({ error: "INVALID_ROLE_ID" }, { status: 400 });
      }
    }

    const autoRoleId = values.autoRoleId;
    if (typeof autoRoleId === "string") {
      const botRoles = new Set(botMember?.roles ?? []);
      const highestBotPosition = Math.max(
        0,
        ...roles.filter((role) => botRoles.has(role.id)).map((role) => role.position)
      );
      const autoRole = rolesById.get(autoRoleId);
      const hasManageRoles = roles
        .filter((role) => role.id === guildId || botRoles.has(role.id))
        .some(
          (role) =>
            (BigInt(role.permissions) & ((1n << 28n) | (1n << 3n))) !== 0n
        );

      if (!autoRole || autoRole.managed || autoRole.position >= highestBotPosition || !hasManageRoles) {
        return NextResponse.json({ error: "BOT_CANNOT_ASSIGN_ROLE" }, { status: 400 });
      }
    }

    return null;
  } catch (error) {
    console.error("Discord reference validation failed:", error);
    return NextResponse.json({ error: "DISCORD_UNAVAILABLE" }, { status: 502 });
  }
}

export async function ensureGuildConfig(guild: DiscordGuild): Promise<void> {
  await prisma.guildConfig.upsert({
    where: { id: guild.id },
    create: {
      id: guild.id,
      name: guild.name,
      icon: guild.icon,
    },
    update: {
      name: guild.name,
      icon: guild.icon,
    },
  });
}
