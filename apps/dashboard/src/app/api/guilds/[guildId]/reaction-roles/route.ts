import { NextResponse } from "next/server";
import prisma from "@bot/database";

export async function GET(
  request: Request,
  { params }: { params: { guildId: string } }
) {
  try {
    const roles = await prisma.reactionRole.findMany({
      where: { guildId: params.guildId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(roles);
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

    const created = await prisma.reactionRole.create({
      data: {
        guildId: params.guildId,
        channelId: body.channelId,
        messageId: body.messageId || "pending",
        roleId: body.roleId,
        roleName: body.roleName || null,
        emoji: body.emoji || "✨",
        label: body.label || "Obtenir le rôle",
      },
    });

    return NextResponse.json(created);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing role id" }, { status: 400 });
    }

    await prisma.reactionRole.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
