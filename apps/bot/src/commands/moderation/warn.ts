import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  EmbedBuilder,
} from "discord.js";
import { Command, BotClient } from "../../client";
import { LogService } from "../../services/logService";
import { isTargetBelowModerator } from "../../services/moderationService";
import prisma from "@bot/database";

export const warnCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("warn")
    .setDescription("Avertir un membre du serveur")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((option) =>
      option
        .setName("cible")
        .setDescription("Le membre à avertir")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("raison")
        .setDescription("La raison de l'avertissement")
        .setRequired(true)
    ),

  async execute(interaction: ChatInputCommandInteraction, client: BotClient) {
    if (!interaction.guild) return;

    const targetUser = interaction.options.getUser("cible", true);
    const reason = interaction.options.getString("raison", true);

    if (targetUser.bot) {
      await interaction.reply({
        content: "❌ Vous ne pouvez pas avertir un bot.",
        ephemeral: true,
      });
      return;
    }

    const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
    if (!member) {
      await interaction.reply({
        content: "❌ Ce membre n'est pas présent sur le serveur.",
        ephemeral: true,
      });
      return;
    }
    if (!(await isTargetBelowModerator(interaction, member))) {
      await interaction.reply({
        content: "❌ Vous ne pouvez pas avertir un membre de rang égal ou supérieur au vôtre.",
        ephemeral: true,
      });
      return;
    }

    try {
      await prisma.sanction.create({
        data: {
          guildId: interaction.guild.id,
          userId: targetUser.id,
          userTag: targetUser.tag,
          moderatorId: interaction.user.id,
          moderatorTag: interaction.user.tag,
          type: "WARN",
          reason,
        },
      });

      // Compter le nombre total de warns
      const totalWarns = await prisma.sanction.count({
        where: {
          guildId: interaction.guild.id,
          userId: targetUser.id,
          type: "WARN",
        },
      });

      await LogService.logSanction(
        interaction.guild,
        targetUser,
        interaction.user,
        "WARN",
        reason
      );

      // Tenter d'envoyer un MP au membre
      try {
        await targetUser.send({
          content: `⚠️ Vous avez reçu un avertissement sur le serveur **${interaction.guild.name}**.\n**Raison :** ${reason}`,
        });
      } catch {
        // MP bloqués
      }

      const embed = new EmbedBuilder()
        .setColor(0xFEE75C)
        .setDescription(
          `⚠️ **${targetUser.tag}** a reçu un avertissement (Total : **${totalWarns}**).\n**Raison :** ${reason}`
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      await interaction.reply({
        content: "❌ Une erreur est survenue lors de l'avertissement.",
        ephemeral: true,
      });
    }
  },
};
