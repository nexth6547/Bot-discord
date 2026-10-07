import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import prisma from "@bot/database";
import { authOptions } from "@/lib/auth";

interface DiscordGuild {
  id: string;
  name: string;
  icon: string | null;
  permissions: string;
  approximate_member_count?: number;
}

const ADMINISTRATOR = 1n << 3n;
const MANAGE_GUILD = 1n << 5n;

export async function GET() {
  const session = await getServerSession(authOptions);
  const accessToken = (session as (typeof session & { accessToken?: string }) | null)
    ?.accessToken;

  if (!accessToken) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  try {
    const discordResponse = await fetch(
      "https://discord.com/api/users/@me/guilds?with_counts=true",
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
      }
    );

    if (discordResponse.status === 401) {
      return NextResponse.json({ error: "SESSION_EXPIRED" }, { status: 401 });
    }
    if (!discordResponse.ok) {
      return NextResponse.json({ error: "DISCORD_UNAVAILABLE" }, { status: 502 });
    }

    const discordGuilds = (await discordResponse.json()) as DiscordGuild[];
    const manageableGuilds = discordGuilds.filter((guild) => {
      const permissions = BigInt(guild.permissions);
      return Boolean(permissions & (ADMINISTRATOR | MANAGE_GUILD));
    });
    const configuredGuilds = await prisma.guildConfig.findMany({ select: { id: true } });
    const configuredGuildIds = new Set(configuredGuilds.map((guild) => guild.id));

    return NextResponse.json({
      guilds: manageableGuilds.map((guild) => ({
        id: guild.id,
        name: guild.name,
        icon: guild.icon
          ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.${guild.icon.startsWith("a_") ? "gif" : "png"}?size=128`
          : null,
        approximateMemberCount: guild.approximate_member_count ?? null,
        botPresent: configuredGuildIds.has(guild.id),
      })),
    });
  } catch {
    return NextResponse.json({ error: "GUILDS_UNAVAILABLE" }, { status: 502 });
  }
}