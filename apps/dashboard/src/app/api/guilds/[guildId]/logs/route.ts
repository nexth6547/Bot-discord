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
  modLogChannelId: { type: "snowflake", nullable: true },
  messageLogChannelId: { type: "snowflake", nullable: true },
  memberLogChannelId: { type: "snowflake", nullable: true },
  voiceLogChannelId: { type: "snowflake", nullable: true },
  roleLogChannelId: { type: "snowflake", nullable: true },
} as const;

export async function GET(
  request: Request,
  { params }: { params: { guildId: string } }
) {
  const access = await authorizeGuild(params.guildId);
  if (!access.ok) return access.response;

  try {
    await ensureGuildConfig(access.guild);
    const config = await prisma.logConfig.findUnique({
      where: { guildId: params.guildId },
    });

    return NextResponse.json(
      config || {
        enabled: false,
        modLogChannelId: null,
        messageLogChannelId: null,
        memberLogChannelId: null,
        voiceLogChannelId: null,
        roleLogChannelId: null,
      }
    );
  } catch (error) {
    return internalError(error, "Loading logging settings");
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

    const updated = await prisma.logConfig.upsert({
      where: { guildId: params.guildId },
      create: {
        guildId: params.guildId,
        ...data,
      },
      update: data,
    });

    return NextResponse.json(updated);
  } catch (error) {
    return internalError(error, "Saving logging settings");
  }
}
