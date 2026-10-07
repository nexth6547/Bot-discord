import { Guild } from "discord.js";
import prisma from "@bot/database";

export async function onGuildCreate(guild: Guild) {
  console.log(`📥 Le bot a rejoint un nouveau serveur : ${guild.name} (${guild.id})`);

  try {
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
    console.log(`✅ Configuration initialisée en base pour le serveur ${guild.name}`);
  } catch (err) {
    console.error(`❌ Erreur lors de l'initialisation du serveur ${guild.id}:`, err);
  }
}
