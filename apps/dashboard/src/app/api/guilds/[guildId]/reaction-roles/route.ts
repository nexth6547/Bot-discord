import { NextResponse } from "next/server";
import prisma from "@bot/database";
import {
  authorizeGuild,
  internalError,
  readJsonObject,
  validateConfig,
  validateGuildReferences,
} from "@/lib/guild-access";

const fields = {
  channelId: { type: "snowflake" },
  targetRoleId: { type: "snowflake" },
  label: { type: "text", maxLength: 80 },
  emoji: { type: "text", maxLength: 32 },
} as const;

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

  try {
    const body = await readJsonObject(request);
    const data = body && validateConfig(body, fields);
    if (
      !data ||
      typeof data.channelId !== "string" ||
      typeof data.targetRoleId !== "string" ||
      typeof data.label !== "string" ||
      !data.label.trim() ||
      typeof data.emoji !== "string" ||
      !data.emoji.trim() ||
      /<a?:\w+:\d+>/.test(data.emoji)
    ) {
      return NextResponse.json({ error: "INVALID_CONFIG" }, { status: 400 });
    }

    const referenceError = await validateGuildReferences(params.guildId, {
      channelId: data.channelId,
      targetRoleId: data.targetRoleId,
    });
    if (referenceError) return referenceError;

    const botToken = process.env.DISCORD_TOKEN;
    if (!botToken) {
      console.error("DISCORD_TOKEN is not configured for reaction role creation.");
      return NextResponse.json({ error: "SERVICE_UNAVAILABLE" }, { status: 503 });
    }

    const messageResponse = await fetch(
      `https://discord.com/api/v10/channels/${data.channelId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bot ${botToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          embeds: [
            {
              title: "🎭 Sélection de rôle",
              description: `Cliquez sur le bouton ci-dessous pour obtenir ou retirer le rôle <@&${data.targetRoleId}>.`,
              color: 0xF59E0B,
            },
          ],
          components: [
            {
              type: 1,
              components: [
                {
                  type: 2,
                  style: 1,
                  custom_id: `reaction_role_${data.targetRoleId}`,
                  label: data.label.trim(),
                  emoji: { name: data.emoji.trim() },
                },
              ],
            },
          ],
        }),
      }
    );

    if (!messageResponse.ok) {
      console.error("Discord reaction role message creation failed:", messageResponse.status);
      return NextResponse.json({ error: "DISCORD_MESSAGE_FAILED" }, { status: 502 });
    }

    const message = (await messageResponse.json()) as { id: string };
    try {
      const panel = await prisma.reactionRole.create({
        data: {
          guildId: params.guildId,
          channelId: data.channelId,
          messageId: message.id,
          roleId: data.targetRoleId,
          label: data.label.trim(),
          emoji: data.emoji.trim(),
        },
      });
      return NextResponse.json(panel, { status: 201 });
    } catch (error) {
      const cleanupResponse = await fetch(
        `https://discord.com/api/v10/channels/${data.channelId}/messages/${message.id}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bot ${botToken}` },
        }
      );
      if (!cleanupResponse.ok && cleanupResponse.status !== 404) {
        console.error(
          "Failed to remove an unregistered reaction role message:",
          cleanupResponse.status
        );
      }
      throw error;
    }
  } catch (error) {
    return internalError(error, "Creating reaction role panel");
  }
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
