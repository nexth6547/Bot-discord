import { NextResponse } from "next/server";
import {
  authorizeGuild,
  ensureGuildConfig,
  internalError,
  logDiscordHttpFailure,
} from "@/lib/guild-access";
import { requestDiscord } from "@/lib/discord-api";

interface DiscordChannel {
  id: string;
  name: string;
  type: number;
  parent_id?: string | null;
  position: number;
}

interface DiscordRole {
  id: string;
  name: string;
  position: number;
  managed: boolean;
  permissions: string;
}

export async function GET(
  _request: Request,
  { params }: { params: { guildId: string } }
) {
  const access = await authorizeGuild(params.guildId);
  if (!access.ok) return access.response;

  const botToken = process.env.DISCORD_TOKEN;
  if (!botToken) {
    console.error("DISCORD_TOKEN is not configured for guild metadata lookup.");
    return NextResponse.json({ error: "SERVICE_UNAVAILABLE" }, { status: 503 });
  }

  try {
    await ensureGuildConfig(access.guild);

    const [channelsResponse, rolesResponse] = await Promise.all([
      requestDiscord(`https://discord.com/api/v10/guilds/${params.guildId}/channels`, {
        headers: { Authorization: `Bot ${botToken}` },
        cache: "no-store",
      }, { cacheTtlMs: 15_000 }),
      requestDiscord(`https://discord.com/api/v10/guilds/${params.guildId}/roles`, {
        headers: { Authorization: `Bot ${botToken}` },
        cache: "no-store",
      }, { cacheTtlMs: 15_000 }),
    ]);

    if (!channelsResponse.ok || !rolesResponse.ok) {
      for (const [name, response] of [
        ["channels", channelsResponse],
        ["roles", rolesResponse],
      ] as const) {
        if (!response.ok) {
          await logDiscordHttpFailure(
            `GET /api/guilds/[guildId]/server ${name}`,
            response,
            [botToken]
          );
        }
      }
      return NextResponse.json({ error: "DISCORD_UNAVAILABLE" }, { status: 502 });
    }

    const channels = (await channelsResponse.json()) as DiscordChannel[];
    const roles = (await rolesResponse.json()) as DiscordRole[];

    const mappedChannels = channels
      .filter((channel) =>
        [0, 2, 4, 5, 10, 11, 12, 13, 15].includes(channel.type)
      )
      .map((channel) => ({
        id: channel.id,
        name: channel.name,
        type: channel.type,
        parentId: channel.parent_id ?? null,
        position: channel.position,
      }))
      .sort((a, b) => a.position - b.position);

    const mappedRoles = roles
      .filter((role) => role.id !== params.guildId && !role.managed)
      .map((role) => ({
        id: role.id,
        name: role.name,
        position: role.position,
        managed: role.managed,
      }))
      .sort((a, b) => b.position - a.position);

    return NextResponse.json({
      guildId: params.guildId,
      channels: mappedChannels,
      roles: mappedRoles,
      categories: mappedChannels.filter((channel) => channel.type === 4),
      textChannels: mappedChannels.filter((channel) => channel.type === 0 || channel.type === 5),
      voiceChannels: mappedChannels.filter((channel) => channel.type === 2 || channel.type === 13),
    });
  } catch (error) {
    return internalError(error, "Loading guild server metadata");
  }
}
