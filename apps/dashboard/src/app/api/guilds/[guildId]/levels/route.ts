import { NextResponse } from "next/server";
import prisma from "@bot/database";
import {
  authorizeGuild,
  ensureGuildConfig,
  internalError,
  invalidConfig,
  readJsonObject,
  validateGuildReferences,
  validateConfig,
} from "@/lib/guild-access";

const fields = {
  enabled: { type: "boolean" },
  xpPerMessageMin: { type: "integer", min: 1, max: 1000 },
  xpPerMessageMax: { type: "integer", min: 1, max: 1000 },
  cooldownSeconds: { type: "integer", min: 0, max: 86400 },
  announceChannelId: { type: "snowflake", nullable: true },
  announceMessage: { type: "text", maxLength: 2000 },
  ignoredChannelIds: { type: "snowflakes" },
} as const;

export async function GET(
  request: Request,
  { params }: { params: { guildId: string } }
) {
  const access = await authorizeGuild(params.guildId);
  if (!access.ok) return access.response;

  try {
    await ensureGuildConfig(access.guild);
    const config = await prisma.levelConfig.findUnique({
      where: { guildId: params.guildId },
    });

    const leaderboard = await prisma.userLevel.findMany({
      where: { guildId: params.guildId },
      orderBy: { xp: "desc" },
      take: 50,
    });

    return NextResponse.json({
      config: config || {
        enabled: true,
        xpPerMessageMin: 15,
        xpPerMessageMax: 25,
        cooldownSeconds: 60,
        announceChannelId: null,
        announceMessage: "Bravo {user} ! Tu as atteint le niveau **{level}** ! 🎉",
      },
      leaderboard,
    });
  } catch (error) {
    return internalError(error, "Loading level settings");
  }
}

export async function POST(
  request: Request,
  { params }: { params: { guildId: string } }
) {
  const access = await authorizeGuild(params.guildId);
  if (!access.ok) return access.response;

  try {
    await ensureGuildConfig(access.guild);
    const body = await readJsonObject(request);
    const data = body && validateConfig(body, fields);
    if (!data) return invalidConfig();
    const referenceError = await validateGuildReferences(params.guildId, data);
    if (referenceError) return referenceError;

    const current = await prisma.levelConfig.findUnique({
      where: { guildId: params.guildId },
    });
    const min = data.xpPerMessageMin ?? current?.xpPerMessageMin ?? 15;
    const max = data.xpPerMessageMax ?? current?.xpPerMessageMax ?? 25;
    if (typeof min !== "number" || typeof max !== "number" || min > max) {
      return invalidConfig();
    }

    const updated = await prisma.levelConfig.upsert({
      where: { guildId: params.guildId },
      create: {
        guildId: params.guildId,
        ...data,
      },
      update: data,
    });

    return NextResponse.json(updated);
  } catch (error) {
    return internalError(error, "Saving level settings");
  }
}
