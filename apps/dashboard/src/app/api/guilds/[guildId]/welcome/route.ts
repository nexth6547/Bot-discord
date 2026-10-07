import { NextResponse } from "next/server";
import prisma from "@bot/database";

export async function GET(
  request: Request,
  { params }: { params: { guildId: string } }
) {
  try {
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
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: { guildId: string } }
) {
  try {
    const body = await request.json();

    const updated = await prisma.welcomeConfig.upsert({
      where: { guildId: params.guildId },
      create: {
        guildId: params.guildId,
        ...body,
      },
      update: body,
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
