import { GuildMember, EmbedBuilder, TextChannel } from "discord.js";
import prisma from "@bot/database";
import { LogService } from "../services/logService";

export async function onGuildMemberAdd(member: GuildMember) {
  const guild = member.guild;

  try {
    const welcomeConfig = await prisma.welcomeConfig.findUnique({
      where: { guildId: guild.id },
    });

    // 1. Attribution automatique d'un rôle (Auto-role)
    if (welcomeConfig?.autoRoleId) {
      const autoRole = guild.roles.cache.get(welcomeConfig.autoRoleId);
      if (autoRole) {
        await member.roles.add(autoRole).catch((err) => {
          console.warn(`[AutoRole] Impossible d'attribuer le rôle ${autoRole.name}:`, err.message);
        });
      }
    }

    // 2. Envoi du message de bienvenue
    if (welcomeConfig?.enabled && welcomeConfig.channelId) {
      const channel = guild.channels.cache.get(welcomeConfig.channelId) as TextChannel;
      if (channel && channel.isTextBased()) {
        const formattedMsg = welcomeConfig.message
          .replace(/{user}/g, `<@${member.id}>`)
          .replace(/{server}/g, guild.name)
          .replace(/{count}/g, guild.memberCount.toString());

        if (welcomeConfig.useEmbed) {
          const embed = new EmbedBuilder()
            .setTitle(welcomeConfig.embedTitle || "Bienvenue !")
            .setDescription(formattedMsg)
            .setColor((welcomeConfig.embedColor as any) || 0x5865F2)
            .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
            .setFooter({ text: `Nous sommes maintenant ${guild.memberCount} membres !` })
            .setTimestamp();

          await channel.send({ content: `<@${member.id}>`, embeds: [embed] });
        } else {
          await channel.send({ content: formattedMsg });
        }
      }
    }

    // 3. Journalisation dans le salon de log membres
    const logEmbed = new EmbedBuilder()
      .setTitle("📥 Nouveau membre")
      .setColor(0x57F287) // Vert
      .setThumbnail(member.user.displayAvatarURL())
      .addFields(
        { name: "Membre", value: `${member.user.tag} (<@${member.id}>)`, inline: true },
        { name: "ID", value: `\`${member.id}\``, inline: true },
        { name: "Création du compte", value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: false }
      )
      .setFooter({ text: `Total de membres : ${guild.memberCount}` })
      .setTimestamp();

    await LogService.sendLog(guild, "member", logEmbed);
  } catch (err) {
    console.error("[guildMemberAdd] Erreur :", err);
  }
}
