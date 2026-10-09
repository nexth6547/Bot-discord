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
  modRoleId: { type: "snowflake", nullable: true },
  autoModAntiLink: { type: "boolean" },
} as const;

export async function GET(
  request: Request,
  { params }: { params: { guildId: string } }
) {
  const access = await authorizeGuild(params.guildId);
  if (!access.ok) return access.response;

  try {
    await ensureGuildConfig(access.guild);
    const config = await prisma.modConfig.findUnique({
      where: { guildId: params.guildId },
      select: {
        modRoleId: true,
        autoModAntiLink: true,
      },
    });

    const sanctions = await prisma.sanction.findMany({
      where: { guildId: params.guildId },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return NextResponse.json({
      config: config || {
        modRoleId: null,
        autoModAntiLink: false,
      },
      sanctions,
    });
  } catch (error) {
    return internalError(error, "Loading moderation settings");
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

    const updated = await prisma.modConfig.upsert({
      where: { guildId: params.guildId },
      create: {
        guildId: params.guildId,
        ...data,
      },
      update: data,
    });

    return NextResponse.json(updated);
  } catch (error) {
    return internalError(error, "Saving moderation settings");
  }
}
