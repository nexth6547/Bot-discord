import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, ChannelType } from "discord.js";
import { Command, BotClient } from "../../client";

export const serverinfoCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("serverinfo")
    .setDescription("Afficher les informations détaillées du serveur"),

  async execute(interaction: ChatInputCommandInteraction, client: BotClient) {
    const guild = interaction.guild;
    if (!guild) return;

    await interaction.deferReply();

    const owner = await guild.fetchOwner();
    const channels = guild.channels.cache;
    const textChannels = channels.filter((c) => c.type === ChannelType.GuildText).size;
    const voiceChannels = channels.filter((c) => c.type === ChannelType.GuildVoice).size;
    const rolesCount = guild.roles.cache.size;

    const embed = new EmbedBuilder()
      .setTitle(`ℹ️ Informations : ${guild.name}`)
      .setThumbnail(guild.iconURL({ size: 256 }))
      .setColor(0x5865F2)
      .addFields(
        { name: "Propriétaire", value: `${owner.user.tag} (\`${owner.id}\`)`, inline: true },
        { name: "Créé le", value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:D>`, inline: true },
        { name: "Membres", value: `👥 **${guild.memberCount}** membres`, inline: true },
        { name: "Salons", value: `💬 ${textChannels} textuels | 🔊 ${voiceChannels} vocaux`, inline: true },
        { name: "Rôles", value: `🏷️ ${rolesCount} rôles`, inline: true },
        { name: "Niveau de Boost", value: `🚀 Niveau ${guild.premiumTier} (${guild.premiumSubscriptionCount || 0} boosts)`, inline: true }
      )
      .setFooter({ text: `ID du serveur : ${guild.id}` })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};
