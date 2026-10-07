import { EmbedBuilder, Guild, TextChannel, User, GuildMember } from "discord.js";
import prisma from "@bot/database";

export class LogService {
  /**
   * Envoie un embed dans le salon de logs approprié
   */
  public static async sendLog(
    guild: Guild,
    type: "mod" | "message" | "member" | "voice" | "role",
    embed: EmbedBuilder
  ) {
    try {
      const config = await prisma.logConfig.findUnique({
        where: { guildId: guild.id },
      });

      if (!config || !config.enabled) return;

      let channelId: string | null = null;
      switch (type) {
        case "mod":
          channelId = config.modLogChannelId;
          break;
        case "message":
          channelId = config.messageLogChannelId;
          break;
        case "member":
          channelId = config.memberLogChannelId;
          break;
        case "voice":
          channelId = config.voiceLogChannelId;
          break;
        case "role":
          channelId = config.roleLogChannelId;
          break;
      }

      if (!channelId) return;

      const channel = guild.channels.cache.get(channelId) as TextChannel;
      if (channel && channel.isTextBased()) {
        await channel.send({ embeds: [embed] });
      }
    } catch (err) {
      console.error(`[LogService] Erreur lors de l'envoi du log (${type}):`, err);
    }
  }

  /**
   * Log d'une sanction de modération
   */
  public static async logSanction(
    guild: Guild,
    target: User,
    moderator: User,
    type: "WARN" | "MUTE" | "KICK" | "BAN",
    reason: string,
    duration?: string
  ) {
    const colors: Record<string, number> = {
      WARN: 0xFEE75C, // Jaune
      MUTE: 0xEB459E, // Fuchsia
      KICK: 0xE67E22, // Orange
      BAN: 0xED4245,  // Rouge
    };

    const embed = new EmbedBuilder()
      .setTitle(`Sanction : ${type}`)
      .setColor(colors[type] || 0x5865F2)
      .addFields(
        { name: "Membre sanctionné", value: `${target.tag} (\`${target.id}\`)`, inline: true },
        { name: "Modérateur", value: `${moderator.tag} (\`${moderator.id}\`)`, inline: true },
        { name: "Raison", value: reason || "Non spécifiée", inline: false }
      )
      .setThumbnail(target.displayAvatarURL())
      .setTimestamp();

    if (duration) {
      embed.addFields({ name: "Durée", value: duration, inline: true });
    }

    await this.sendLog(guild, "mod", embed);
  }
}
