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
  categoryId: { type: "snowflake", nullable: true },
  supportRoleId: { type: "snowflake", nullable: true },
  panelTitle: { type: "text", maxLength: 256 },
  panelDescription: { type: "text", maxLength: 4000 },
  buttonText: { type: "text", maxLength: 80 },
} as const;

export async function GET(
  request: Request,
  { params }: { params: { guildId: string } }
) {
  const access = await authorizeGuild(params.guildId);
  if (!access.ok) return access.response;

  try {
    await ensureGuildConfig(access.guild);
    const config = await prisma.ticketConfig.findUnique({
      where: { guildId: params.guildId },
    });

    const activeTickets = await prisma.ticket.findMany({
      where: { guildId: params.guildId, status: "OPEN" },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      config: config || {
        enabled: false,
        categoryId: null,
        supportRoleId: null,
        panelTitle: "Assistance & Support",
        panelDescription: "Cliquez ci-dessous pour ouvrir un ticket.",
        buttonText: "📩 Ouvrir un ticket",
      },
      activeTickets,
    });
  } catch (error) {
    return internalError(error, "Loading ticket settings");
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

    const updated = await prisma.ticketConfig.upsert({
      where: { guildId: params.guildId },
      create: {
        guildId: params.guildId,
        ...data,
      },
      update: data,
    });

    return NextResponse.json(updated);
  } catch (error) {
    return internalError(error, "Saving ticket settings");
  }
}
