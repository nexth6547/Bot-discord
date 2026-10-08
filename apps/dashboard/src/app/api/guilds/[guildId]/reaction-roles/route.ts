import { NextResponse } from "next/server";
import prisma from "@bot/database";
import {
  authorizeGuild,
  internalError,
  readJsonObject,
} from "@/lib/guild-access";

export async function GET(
  request: Request,
  { params }: { params: { guildId: string } }
) {
  const access = await authorizeGuild(params.guildId);
  if (!access.ok) return access.response;

  try {
    const roles = await prisma.reactionRole.findMany({
      where: { guildId: params.guildId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(roles);
  } catch (error) {
    return internalError(error, "Loading reaction roles");
  }
}

export async function POST(
  request: Request,
  { params }: { params: { guildId: string } }
) {
  const access = await authorizeGuild(params.guildId);
  if (!access.ok) return access.response;

  const body = await readJsonObject(request);
  if (!body) {
    return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });
  }

  return NextResponse.json(
    { error: "USE_BOT_COMMAND", message: "Create role panels with /reactionrole-setup." },
    { status: 501 }
  );
}

export async function DELETE(
  request: Request,
  { params }: { params: { guildId: string } }
) {
  const access = await authorizeGuild(params.guildId);
  if (!access.ok) return access.response;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id || id.length > 30) {
      return NextResponse.json({ error: "INVALID_ROLE_ID" }, { status: 400 });
    }

    const role = await prisma.reactionRole.findFirst({
      where: { id, guildId: params.guildId },
    });
    if (!role) {
      return NextResponse.json({ error: "ROLE_NOT_FOUND" }, { status: 404 });
    }

    const botToken = process.env.DISCORD_TOKEN;
    if (!botToken) {
      console.error("DISCORD_TOKEN is not configured for reaction role deletion.");
      return NextResponse.json({ error: "SERVICE_UNAVAILABLE" }, { status: 503 });
    }

    const messageResponse = await fetch(
      `https://discord.com/api/v10/channels/${role.channelId}/messages/${role.messageId}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bot ${botToken}` },
      }
    );
    if (!messageResponse.ok && messageResponse.status !== 404) {
      return NextResponse.json({ error: "DISCORD_UNAVAILABLE" }, { status: 502 });
    }

    await prisma.reactionRole.deleteMany({
      where: { id, guildId: params.guildId },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return internalError(error, "Deleting reaction role");
  }
}
