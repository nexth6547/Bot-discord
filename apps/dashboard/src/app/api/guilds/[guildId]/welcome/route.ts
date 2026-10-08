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
  channelId: { type: "snowflake", nullable: true },
  message: { type: "text", maxLength: 2000 },
  useEmbed: { type: "boolean" },
  embedColor: { type: "color" },
  embedTitle: { type: "text", maxLength: 256 },
  autoRoleId: { type: "snowflake", nullable: true },
  leaveEnabled: { type: "boolean" },
  leaveChannelId: { type: "snowflake", nullable: true },
  leaveMessage: { type: "text", maxLength: 2000 },
} as const;

export async function GET(
  request: Request,
  { params }: { params: { guildId: string } }
) {
  const access = await authorizeGuild(params.guildId);
  if (!access.ok) return access.response;

  try {
    await ensureGuildConfig(access.guild);
    const config = await prisma.welcomeConfig.findUnique({
      where: { guildId: params.guildId },
    });

    return NextResponse.json(
      config || {
        enabled: false,
        channelId: null,
        message: "Bienvenue {user} sur **{server}** !",
        useEmbed: true,
        embedColor: "#F59E0B",
        embedTitle: "Bienvenue !",
        autoRoleId: null,
        leaveEnabled: false,
        leaveChannelId: null,
        leaveMessage: "Au revoir {user}...",
      }
    );
  } catch (error) {
    return internalError(error, "Loading welcome settings");
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

    const updated = await prisma.welcomeConfig.upsert({
      where: { guildId: params.guildId },
      create: {
        guildId: params.guildId,
        ...data,
      },
      update: data,
    });

    return NextResponse.json(updated);
  } catch (error) {
    return internalError(error, "Saving welcome settings");
  }
}
