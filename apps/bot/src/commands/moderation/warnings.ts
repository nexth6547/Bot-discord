import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  EmbedBuilder,
} from "discord.js";
import { Command, BotClient } from "../../client";
import prisma from "@bot/database";

export const warningsCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("warnings")
    .setDescription("Consulter l'historique des avertissements d'un membre")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((option) =>
      option
        .setName("cible")
        .setDescription("Le membre concerné")
        .setRequired(true)
    ),

  async execute(interaction: ChatInputCommandInteraction, client: BotClient) {
    if (!interaction.guild) return;

    const targetUser = interaction.options.getUser("cible", true);

    try {
      const warns = await prisma.sanction.findMany({
        where: {
          guildId: interaction.guild.id,
          userId: targetUser.id,
          type: "WARN",
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      });

      if (warns.length === 0) {
        await interaction.reply({
          content: `✅ **${targetUser.tag}** n'a aucun avertissement enregistré.`,
          ephemeral: true,
        });
        return;
      }

      const embed = new EmbedBuilder()
        .setTitle(`Avertissements de ${targetUser.tag}`)
        .setDescription(`Total : **${warns.length}** avertissement(s) récent(s)`)
        .setColor(0xFEE75C)
        .setThumbnail(targetUser.displayAvatarURL())
        .setTimestamp();

      warns.forEach((warn, index) => {
        embed.addFields({
          name: `#${index + 1} - ${warn.createdAt.toLocaleDateString("fr-FR")}`,
          value: `**Modérateur :** <@${warn.moderatorId}>\n**Raison :** ${warn.reason}`,
        });
      });

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      await interaction.reply({
        content: "❌ Erreur lors de la récupération des avertissements.",
        ephemeral: true,
      });
    }
  },
};
