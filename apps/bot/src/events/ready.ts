import { REST, Routes, ActivityType } from "discord.js";
import { BotClient } from "../client";
import { config } from "../config";
import { syncGuildConfig } from "../services/guildConfigService";

export async function onReady(client: BotClient) {
  console.log(`🤖 Bot connecté en tant que ${client.user?.tag} (${client.user?.id})`);

  for (const guild of client.guilds.cache.values()) {
    try {
      await syncGuildConfig(guild);
    } catch (err) {
      console.error(
        `❌ Erreur lors de la synchronisation du serveur ${guild.id} au démarrage :`,
        err
      );
    }
  }

  // Définir le statut du bot
  client.user?.setPresence({
    activities: [
      {
        name: `/help | Dashboard web`,
        type: ActivityType.Listening,
      },
    ],
    status: "online",
  });

  // Enregistrement des commandes slash
  if (config.token && config.clientId) {
    try {
      const rest = new REST({ version: "10" }).setToken(config.token);
      const commandsData = client.commands.map((cmd) => cmd.data.toJSON());

      console.log(`🔄 Enregistrement de ${commandsData.length} commandes slash...`);

      await rest.put(Routes.applicationCommands(config.clientId), {
        body: commandsData,
      });

      console.log(`✅ ${commandsData.length} commandes slash enregistrées avec succès !`);
    } catch (err) {
      console.error("❌ Erreur lors de l'enregistrement des commandes slash :", err);
    }
  } else {
    console.warn("⚠️ Token ou Client ID manquant. Les commandes slash n'ont pas été enregistrées sur Discord.");
  }
}
