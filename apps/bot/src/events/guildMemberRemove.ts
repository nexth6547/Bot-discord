import { GuildMember, PartialGuildMember, EmbedBuilder, TextChannel } from "discord.js";
import prisma from "@bot/database";
import { LogService } from "../services/logService";

export async function onGuildMemberRemove(member: GuildMember | PartialGuildMember) {
  const guild = member.guild;

  try {
    const welcomeConfig = await prisma.welcomeConfig.findUnique({
      where: { guildId: guild.id },
    });

    // Message de départ
    if (welcomeConfig?.leaveEnabled && welcomeConfig.leaveChannelId) {
      const channel = guild.channels.cache.get(welcomeConfig.leaveChannelId) as TextChannel;
      if (channel && channel.isTextBased()) {
        const formattedMsg = welcomeConfig.leaveMessage
          .replace(/{user}/g, `**${member.user?.tag || "Un membre"}**`)
          .replace(/{server}/g, guild.name)
          .replace(/{count}/g, guild.memberCount.toString());

        await channel.send({ content: formattedMsg });
      }
    }

    // Journalisation dans les logs
    const logEmbed = new EmbedBuilder()
      .setTitle("📤 Départ d'un membre")
      .setColor(0xED4245) // Rouge
      .setThumbnail(member.user?.displayAvatarURL() || null)
      .addFields(
        { name: "Membre", value: `${member.user?.tag || "Inconnu"} (\`${member.id}\`)`, inline: true },
        { name: "Membres restants", value: `\`${guild.memberCount}\``, inline: true }
      )
      .setTimestamp();

    await LogService.sendLog(guild, "member", logEmbed);
  } catch (err) {
    console.error("[guildMemberRemove] Erreur :", err);
  }
}
