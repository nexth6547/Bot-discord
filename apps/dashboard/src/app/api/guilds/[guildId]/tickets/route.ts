import { NextResponse } from "next/server";
import prisma from "@bot/database";

export async function GET(
  request: Request,
  { params }: { params: { guildId: string } }
) {
  try {
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

    const updated = await prisma.ticketConfig.upsert({
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
