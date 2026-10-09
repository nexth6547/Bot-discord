import { EmbedBuilder, VoiceState } from "discord.js";
import { LogService } from "../services/logService";

export async function onVoiceStateUpdate(oldState: VoiceState, newState: VoiceState) {
  if (oldState.channelId === newState.channelId) return;

  const member = newState.member ?? oldState.member;
  const userId = newState.id;
  const title =
    oldState.channelId === null
      ? "🔊 Connexion à un salon vocal"
      : newState.channelId === null
        ? "🔇 Déconnexion d'un salon vocal"
        : "🔀 Déplacement entre salons vocaux";

  const embed = new EmbedBuilder()
    .setTitle(title)
    .setColor(0x9B59B6)
    .addFields(
      { name: "Membre", value: member ? `${member.user.tag} (<@${userId}>)` : `<@${userId}>`, inline: true },
      {
        name: "Salon",
        value: oldState.channelId
          ? `<#${oldState.channelId}>${newState.channelId ? ` → <#${newState.channelId}>` : ""}`
          : newState.channelId
            ? `<#${newState.channelId}>`
            : "Inconnu",
        inline: true,
      }
    )
    .setTimestamp();

  await LogService.sendLog(newState.guild, "voice", embed);
}
