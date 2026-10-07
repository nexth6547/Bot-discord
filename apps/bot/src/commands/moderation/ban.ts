import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  EmbedBuilder,
} from "discord.js";
import { Command, BotClient } from "../../client";
import { LogService } from "../../services/logService";
import prisma from "@bot/database";

export const banCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("ban")
    .setDescription("Bannir un membre du serveur")
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption((option) =>
      option
        .setName("cible")
        .setDescription("Le membre à bannir")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("raison")
        .setDescription("La raison du bannissement")
        .setRequired(false)
    ),

  async execute(interaction: ChatInputCommandInteraction, client: BotClient) {
    if (!interaction.guild) return;

    const targetUser = interaction.options.getUser("cible", true);
    const reason = interaction.options.getString("raison") || "Aucune raison fournie";
    const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

    if (member && !member.bannable) {
      await interaction.reply({
        content: "❌ Je n'ai pas les permissions nécessaires pour bannir ce membre (rôle supérieur ou égal).",
        ephemeral: true,
      });
      return;
    }

    try {
      await interaction.guild.members.ban(targetUser.id, { reason });

      // Enregistrer la sanction en base
      await prisma.sanction.create({
        data: {
          guildId: interaction.guild.id,
          userId: targetUser.id,
          userTag: targetUser.tag,
          moderatorId: interaction.user.id,
          moderatorTag: interaction.user.tag,
          type: "BAN",
          reason,
        },
      });

      // Journaliser dans le salon de logs
      await LogService.logSanction(
        interaction.guild,
        targetUser,
        interaction.user,
        "BAN",
        reason
      );

      const embed = new EmbedBuilder()
        .setColor(0xED4245)
        .setDescription(`🔨 **${targetUser.tag}** a été banni du serveur.\n**Raison :** ${reason}`)
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      await interaction.reply({
        content: "❌ Une erreur est survenue lors de l'exécution du bannissement.",
        ephemeral: true,
      });
    }
  },
};
