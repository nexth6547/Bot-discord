import { Guild } from "discord.js";
import prisma from "@bot/database";

export async function syncGuildConfig(guild: Guild) {
  await prisma.guildConfig.upsert({
    where: { id: guild.id },
    create: {
      id: guild.id,
      name: guild.name,
      icon: guild.iconURL() || null,
      welcomeConfig: { create: {} },
      modConfig: { create: {} },
      logConfig: { create: {} },
      ticketConfig: { create: {} },
      levelConfig: { create: {} },
    },
    update: {
      name: guild.name,
      icon: guild.iconURL() || null,
    },
  });
}
