import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  EmbedBuilder,
} from "discord.js";
import { Command, BotClient } from "../../client";
import { LogService } from "../../services/logService";
import prisma from "@bot/database";

export const kickCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("kick")
    .setDescription("Expulser un membre du serveur")
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .addUserOption((option) =>
      option
        .setName("cible")
        .setDescription("Le membre à expulser")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("raison")
        .setDescription("La raison de l'expulsion")
        .setRequired(false)
    ),

  async execute(interaction: ChatInputCommandInteraction, client: BotClient) {
    if (!interaction.guild) return;

    const targetUser = interaction.options.getUser("cible", true);
    const reason = interaction.options.getString("raison") || "Aucune raison fournie";
    const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

    if (!member) {
      await interaction.reply({
        content: "❌ Ce membre n'est pas présent sur le serveur.",
        ephemeral: true,
      });
      return;
    }

    if (!member.kickable) {
      await interaction.reply({
        content: "❌ Je n'ai pas les permissions nécessaires pour expulser ce membre.",
        ephemeral: true,
      });
      return;
    }

    try {
      await member.kick(reason);

      // Enregistrer en base
      await prisma.sanction.create({
        data: {
          guildId: interaction.guild.id,
          userId: targetUser.id,
          userTag: targetUser.tag,
          moderatorId: interaction.user.id,
          moderatorTag: interaction.user.tag,
          type: "KICK",
          reason,
        },
      });

      await LogService.logSanction(
        interaction.guild,
        targetUser,
        interaction.user,
        "KICK",
        reason
      );

      const embed = new EmbedBuilder()
        .setColor(0xE67E22)
        .setDescription(`👢 **${targetUser.tag}** a été expulsé du serveur.\n**Raison :** ${reason}`)
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      await interaction.reply({
        content: "❌ Une erreur est survenue lors de l'expulsion.",
        ephemeral: true,
      });
    }
  },
};
