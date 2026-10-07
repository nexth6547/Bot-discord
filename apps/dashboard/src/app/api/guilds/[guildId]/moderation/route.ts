import { NextResponse } from "next/server";
import prisma from "@bot/database";

export async function GET(
  request: Request,
  { params }: { params: { guildId: string } }
) {
  try {
    const config = await prisma.modConfig.findUnique({
      where: { guildId: params.guildId },
    });

    const sanctions = await prisma.sanction.findMany({
      where: { guildId: params.guildId },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return NextResponse.json({
      config: config || {
        modRoleId: null,
        adminRoleId: null,
        muteRoleId: null,
        autoModAntiSpam: false,
        autoModAntiLink: false,
      },
      sanctions,
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

    const updated = await prisma.modConfig.upsert({
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
