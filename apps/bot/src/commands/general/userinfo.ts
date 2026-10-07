import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import { Command, BotClient } from "../../client";

export const userinfoCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("userinfo")
    .setDescription("Afficher les informations d'un utilisateur")
    .addUserOption((option) =>
      option.setName("utilisateur").setDescription("L'utilisateur ciblé").setRequired(false)
    ),

  async execute(interaction: ChatInputCommandInteraction, client: BotClient) {
    if (!interaction.guild) return;

    const user = interaction.options.getUser("utilisateur") || interaction.user;
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);

    const embed = new EmbedBuilder()
      .setTitle(`Profil de ${user.tag}`)
      .setThumbnail(user.displayAvatarURL({ size: 256 }))
      .setColor(member?.displayColor || 0x5865F2)
      .addFields(
        { name: "Identifiant", value: `\`${user.id}\``, inline: true },
        { name: "Bot ?", value: user.bot ? "Oui" : "Non", inline: true },
        { name: "Création du compte", value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true }
      );

    if (member) {
      const roles = member.roles.cache
        .filter((r) => r.id !== interaction.guild!.id)
        .map((r) => `<@&${r.id}>`)
        .slice(0, 15)
        .join(" ");

      embed.addFields(
        {
          name: "A rejoint le serveur",
          value: member.joinedTimestamp ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : "Inconnu",
          inline: true,
        },
        {
          name: `Rôles [${member.roles.cache.size - 1}]`,
          value: roles || "Aucun rôle spécifique",
          inline: false,
        }
      );
    }

    embed.setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
