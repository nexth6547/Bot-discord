import { Message, PartialMessage, EmbedBuilder } from "discord.js";
import { LogService } from "../services/logService";

export async function onMessageUpdate(
  oldMessage: Message | PartialMessage,
  newMessage: Message | PartialMessage
) {
  if (!newMessage.guild || newMessage.author?.bot) return;
  if (oldMessage.content === newMessage.content) return; // Embed loaded or pin

  const oldContent = oldMessage.content ? oldMessage.content.slice(0, 1000) : "*Contenu non chargé en cache*";
  const newContent = newMessage.content ? newMessage.content.slice(0, 1000) : "*Aucun contenu texte*";

  const embed = new EmbedBuilder()
    .setTitle("✏️ Message modifié")
    .setColor(0xFEE75C)
    .addFields(
      { name: "Auteur", value: `${newMessage.author?.tag} (<@${newMessage.author?.id}>)`, inline: true },
      { name: "Salon", value: `<#${newMessage.channel.id}>`, inline: true },
      { name: "Lien", value: `[Aller au message](${newMessage.url})`, inline: true },
      { name: "Avant", value: oldContent, inline: false },
      { name: "Après", value: newContent, inline: false }
    )
    .setTimestamp();

  await LogService.sendLog(newMessage.guild, "message", embed);
}
