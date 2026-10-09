import { NextResponse } from "next/server";
import prisma from "@bot/database";
import {
  authorizeGuild,
  ensureGuildConfig,
  internalError,
  invalidConfig,
  readJsonObject,
  validateConfig,
  validateGuildReferences,
} from "@/lib/guild-access";

interface DiscordMessage {
  id: string;
}

const fields = {
  enabled: { type: "boolean" },
  categoryId: { type: "snowflake", nullable: true },
  supportRoleId: { type: "snowflake", nullable: true },
  panelChannelId: { type: "snowflake" },
  panelTitle: { type: "text", maxLength: 256 },
  panelDescription: { type: "text", maxLength: 4000 },
  buttonText: { type: "text", maxLength: 80 },
} as const;

function panelPayload(
  guildName: string,
  guildIcon: string | null,
  config: {
    panelTitle: string;
    panelDescription: string;
    buttonText: string;
  }
) {
  return {
    embeds: [
      {
        title: config.panelTitle,
        description: config.panelDescription,
        color: 0xf59e0b,
        footer: {
          text: guildName,
          ...(guildIcon ? { icon_url: guildIcon } : {}),
        },
      },
    ],
    components: [
      {
        type: 1,
        components: [
          {
            type: 2,
            style: 1,
            custom_id: "ticket_create",
            label: config.buttonText,
            emoji: { name: "📩" },
          },
        ],
      },
    ],
  };
}

export async function POST(
  request: Request,
  { params }: { params: { guildId: string } }
) {
  const access = await authorizeGuild(params.guildId);
  if (!access.ok) return access.response;

  const botToken = process.env.DISCORD_TOKEN;
  if (!botToken) {
    console.error("DISCORD_TOKEN is not configured for ticket panel publishing.");
    return NextResponse.json({ error: "SERVICE_UNAVAILABLE" }, { status: 503 });
  }

  try {
    await ensureGuildConfig(access.guild);
    const body = await readJsonObject(request);
    const data = body && validateConfig(body, fields);
    if (
      !data ||
      data.enabled !== true ||
      typeof data.panelChannelId !== "string" ||
      typeof data.panelTitle !== "string" ||
      !data.panelTitle.trim() ||
      typeof data.panelDescription !== "string" ||
      !data.panelDescription.trim() ||
      typeof data.buttonText !== "string" ||
      !data.buttonText.trim()
    ) {
      return invalidConfig();
    }
    const referenceError = await validateGuildReferences(params.guildId, data);
    if (referenceError) return referenceError;

    const currentConfig = await prisma.ticketConfig.findUnique({
      where: { guildId: params.guildId },
    });

    const payload = panelPayload(access.guild.name, access.guild.icon, {
      panelTitle: data.panelTitle,
      panelDescription: data.panelDescription,
      buttonText: data.buttonText,
    });
    const headers = {
      Authorization: `Bot ${botToken}`,
      "Content-Type": "application/json",
    };

    let messageId: string | null = null;
    let newlyCreated = false;
    if (
      currentConfig?.panelMessageId &&
      currentConfig.panelChannelId === data.panelChannelId
    ) {
      const updateResponse = await fetch(
        `https://discord.com/api/v10/channels/${data.panelChannelId}/messages/${currentConfig.panelMessageId}`,
        {
          method: "PATCH",
          headers,
          body: JSON.stringify(payload),
        }
      );
      if (updateResponse.ok) {
        const updated = (await updateResponse.json()) as DiscordMessage;
        messageId = updated.id;
      } else if (updateResponse.status !== 404) {
        console.error("Discord ticket panel update failed:", updateResponse.status);
        return NextResponse.json({ error: "DISCORD_MESSAGE_FAILED" }, { status: 502 });
      }
    }

    if (!messageId) {
      const createResponse = await fetch(
        `https://discord.com/api/v10/channels/${data.panelChannelId}/messages`,
        {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
        }
      );
      if (!createResponse.ok) {
        console.error("Discord ticket panel creation failed:", createResponse.status);
        return NextResponse.json({ error: "DISCORD_MESSAGE_FAILED" }, { status: 502 });
      }

      const created = (await createResponse.json()) as DiscordMessage;
      messageId = created.id;
      newlyCreated = true;
    }
    try {
      await prisma.ticketConfig.upsert({
        where: { guildId: params.guildId },
        create: {
          guildId: params.guildId,
          ...data,
          panelMessageId: messageId,
        },
        update: {
          ...data,
          panelMessageId: messageId,
        },
      });
    } catch (error) {
      if (newlyCreated) {
        const cleanupResponse = await fetch(
          `https://discord.com/api/v10/channels/${data.panelChannelId}/messages/${messageId}`,
          { method: "DELETE", headers: { Authorization: `Bot ${botToken}` } }
        );
        if (!cleanupResponse.ok && cleanupResponse.status !== 404) {
          console.error(
            "Failed to remove unregistered ticket panel:",
            cleanupResponse.status
          );
        }
      }
      throw error;
    }

    let cleanupWarning = false;
    if (
      newlyCreated &&
      currentConfig?.panelMessageId &&
      currentConfig.panelChannelId !== data.panelChannelId
    ) {
      const oldMessageResponse = await fetch(
        `https://discord.com/api/v10/channels/${currentConfig.panelChannelId}/messages/${currentConfig.panelMessageId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bot ${botToken}` },
        }
      );
      if (!oldMessageResponse.ok && oldMessageResponse.status !== 404) {
        cleanupWarning = true;
        console.error("Discord old ticket panel cleanup failed:", oldMessageResponse.status);
      }
    }

    return NextResponse.json({
      messageId,
      updated: !newlyCreated,
      cleanupWarning,
    }, { status: newlyCreated ? 201 : 200 });
  } catch (error) {
    return internalError(error, "Publishing ticket panel");
  }
}
