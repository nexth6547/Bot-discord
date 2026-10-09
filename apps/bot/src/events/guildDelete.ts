import { Guild } from "discord.js";

export function onGuildDelete(guild: Guild) {
  console.warn(
    `⚠️ Le bot n'a plus accès au serveur ${guild.name} (${guild.id}). Les données du serveur sont conservées.`
  );
}
