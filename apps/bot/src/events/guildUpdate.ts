import { Guild } from "discord.js";
import { syncGuildConfig } from "../services/guildConfigService";

export async function onGuildUpdate(_oldGuild: Guild, newGuild: Guild) {
  try {
    await syncGuildConfig(newGuild);
  } catch (err) {
    console.error(
      `❌ Erreur lors de la synchronisation du serveur ${newGuild.id}:`,
      err
    );
  }
}
