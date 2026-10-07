import { NextResponse } from "next/server";
import prisma from "@bot/database";

export async function GET(
  request: Request,
  { params }: { params: { guildId: string } }
) {
  try {
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

    const updated = await prisma.levelConfig.upsert({
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
