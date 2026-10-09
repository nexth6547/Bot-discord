import { NextResponse } from "next/server";
import prisma from "@bot/database";
import {
  authorizeGuild,
  ensureGuildConfig,
  internalError,
} from "@/lib/guild-access";

interface DiscordGuildCounts {
  approximate_member_count?: number;
}

export async function GET(
  request: Request,
  { params }: { params: { guildId: string } }
) {
  const access = await authorizeGuild(params.guildId);
  if (!access.ok) return access.response;

  const botToken = process.env.DISCORD_TOKEN;
  if (!botToken) {
    console.error("DISCORD_TOKEN is not configured for guild overview.");
    return NextResponse.json({ error: "SERVICE_UNAVAILABLE" }, { status: 503 });
  }

  try {
    await ensureGuildConfig(access.guild);
    const [sanctions, openTickets, membersWithXp, discordResponse] = await Promise.all([
      prisma.sanction.count({ where: { guildId: params.guildId } }),
      prisma.ticket.count({ where: { guildId: params.guildId, status: "OPEN" } }),
      prisma.userLevel.count({ where: { guildId: params.guildId } }),
      fetch(`https://discord.com/api/v10/guilds/${params.guildId}?with_counts=true`, {
        headers: { Authorization: `Bot ${botToken}` },
        cache: "no-store",
      }),
    ]);

    if (!discordResponse.ok) {
      console.error("Discord guild count request failed:", discordResponse.status);
      return NextResponse.json({ error: "DISCORD_UNAVAILABLE" }, { status: 502 });
    }

    const guildCounts = (await discordResponse.json()) as DiscordGuildCounts;
    return NextResponse.json({
      stats: {
        approximateMembers: guildCounts.approximate_member_count ?? null,
        sanctions,
        openTickets,
        membersWithXp,
      },
      sources: {
        approximateMembers: "Discord (estimation)",
        sanctions: "Prisma / SQLite",
        openTickets: "Prisma / SQLite, statut OPEN",
        membersWithXp: "Prisma / SQLite",
      },
      refreshedAt: new Date().toISOString(),
    });
  } catch (error) {
    return internalError(error, "Loading guild overview");
  }
}
