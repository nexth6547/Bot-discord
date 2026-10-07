import { Message, PartialMessage, EmbedBuilder } from "discord.js";
import { LogService } from "../services/logService";

export async function onMessageDelete(message: Message | PartialMessage) {
  if (!message.guild || message.author?.bot) return;

  const content = message.content ? message.content.slice(0, 1024) : "*Contenu indisponible (message ancien ou média uniquement)*";

  const embed = new EmbedBuilder()
    .setTitle("🗑️ Message supprimé")
    .setColor(0xED4245)
    .addFields(
      { name: "Auteur", value: message.author ? `${message.author.tag} (<@${message.author.id}>)` : "Inconnu", inline: true },
      { name: "Salon", value: `<#${message.channel.id}>`, inline: true },
      { name: "Contenu", value: content, inline: false }
    )
    .setTimestamp();

  await LogService.sendLog(message.guild, "message", embed);
}
