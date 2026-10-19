import { NextResponse } from "next/server";
import {
  authorizeGuild,
  logDiscordException,
  logDiscordHttpFailure,
} from "@/lib/guild-access";
import { discordGuildBotMemberUrl, requestDiscord } from "@/lib/discord-api";

interface DiscordChannel {
  id: string;
  name: string;
  type: number;
}

interface DiscordRole {
  id: string;
  name: string;
  position: number;
  managed: boolean;
  permissions: string;
}

interface DiscordMember {
  roles: string[];
}

export async function GET(
  request: Request,
  { params }: { params: { guildId: string } }
) {
  const access = await authorizeGuild(params.guildId);
  if (!access.ok) return access.response;

  const botToken = process.env.DISCORD_TOKEN;
  if (!botToken) {
    console.error("DISCORD_TOKEN is not configured for guild resource loading.");
    return NextResponse.json({ error: "SERVICE_UNAVAILABLE" }, { status: 503 });
  }

  try {
    const headers = { Authorization: `Bot ${botToken}` };
    const [channelsResponse, rolesResponse, memberResponse] = await Promise.all([
      requestDiscord(`https://discord.com/api/v10/guilds/${params.guildId}/channels`, {
        headers,
        cache: "no-store",
      }, { cacheTtlMs: 15_000 }),
      requestDiscord(`https://discord.com/api/v10/guilds/${params.guildId}/roles`, {
        headers,
        cache: "no-store",
      }, { cacheTtlMs: 15_000 }),
      requestDiscord(discordGuildBotMemberUrl(params.guildId), {
        headers,
        cache: "no-store",
      }, { cacheTtlMs: 15_000 }),
    ]);

    if (!channelsResponse.ok || !rolesResponse.ok || !memberResponse.ok) {
      for (const [name, response] of [
        ["channels", channelsResponse],
        ["roles", rolesResponse],
        ["member", memberResponse],
      ] as const) {
        if (!response.ok) {
          await logDiscordHttpFailure(
            `GET /api/guilds/[guildId]/resources ${name}`,
            response,
            [botToken]
          );
        }
      }
      return NextResponse.json({ error: "DISCORD_UNAVAILABLE" }, { status: 502 });
    }

    const [channels, roles, botMember] = await Promise.all([
      channelsResponse.json() as Promise<DiscordChannel[]>,
      rolesResponse.json() as Promise<DiscordRole[]>,
      memberResponse.json() as Promise<DiscordMember>,
    ]);
    const botRoleIds = new Set(botMember.roles);
    const botPermissions = roles
      .filter((role) => botRoleIds.has(role.id) || role.id === params.guildId)
      .reduce((permissions, role) => permissions | BigInt(role.permissions), 0n);
    const highestBotRolePosition = Math.max(
      0,
      ...roles.filter((role) => botRoleIds.has(role.id)).map((role) => role.position)
    );
    const canManageRoles =
      (botPermissions & ((1n << 28n) | (1n << 3n))) !== 0n;

    return NextResponse.json({
      channels: channels
        .filter((channel) => [0, 5, 4].includes(channel.type))
        .map(({ id, name, type }) => ({ id, name, type })),
      roles: canManageRoles
        ? roles
            .filter(
              (role) =>
                role.id !== params.guildId &&
                !role.managed &&
                role.position < highestBotRolePosition
            )
            .map(({ id, name, position }) => ({ id, name, position }))
        : [],
    });
  } catch (error) {
    logDiscordException("GET /api/guilds/[guildId]/resources", error, [botToken]);
    return NextResponse.json({ error: "DISCORD_UNAVAILABLE" }, { status: 502 });
  }
}
