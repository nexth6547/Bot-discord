import { NextResponse } from "next/server";
import prisma from "@bot/database";

export async function GET(
  request: Request,
  { params }: { params: { guildId: string } }
) {
  try {
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

    const updated = await prisma.logConfig.upsert({
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
