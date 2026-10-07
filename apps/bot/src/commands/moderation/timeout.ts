import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  EmbedBuilder,
} from "discord.js";
import { Command, BotClient } from "../../client";
import { LogService } from "../../services/logService";
import prisma from "@bot/database";

export const timeoutCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("timeout")
    .setDescription("Exclure temporairement (rendre muet) un membre")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((option) =>
      option
        .setName("cible")
        .setDescription("Le membre à mute")
        .setRequired(true)
    )
    .addIntegerOption((option) =>
      option
        .setName("duree")
        .setDescription("Durée du mute")
        .setRequired(true)
        .addChoices(
          { name: "60 secondes", value: 60 },
          { name: "5 minutes", value: 300 },
          { name: "10 minutes", value: 600 },
          { name: "1 heure", value: 3600 },
          { name: "1 jour", value: 86400 },
          { name: "1 semaine", value: 604800 }
        )
    )
    .addStringOption((option) =>
      option
        .setName("raison")
        .setDescription("La raison de l'exclusion temporaire")
        .setRequired(false)
    ),

  async execute(interaction: ChatInputCommandInteraction, client: BotClient) {
    if (!interaction.guild) return;

    const targetUser = interaction.options.getUser("cible", true);
    const duration = interaction.options.getInteger("duree", true);
    const reason = interaction.options.getString("raison") || "Aucune raison fournie";
    const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

    if (!member) {
      await interaction.reply({
        content: "❌ Ce membre n'est pas présent sur le serveur.",
        ephemeral: true,
      });
      return;
    }

    if (!member.moderatable) {
      await interaction.reply({
        content: "❌ Je n'ai pas les permissions pour mute ce membre.",
        ephemeral: true,
      });
      return;
    }

    try {
      await member.timeout(duration * 1000, reason);

      await prisma.sanction.create({
        data: {
          guildId: interaction.guild.id,
          userId: targetUser.id,
          userTag: targetUser.tag,
          moderatorId: interaction.user.id,
          moderatorTag: interaction.user.tag,
          type: "MUTE",
          duration,
          reason,
        },
      });

      const readableDuration =
        duration >= 86400
          ? `${duration / 86400} jour(s)`
          : duration >= 3600
          ? `${duration / 3600} heure(s)`
          : `${duration / 60} minute(s)`;

      await LogService.logSanction(
        interaction.guild,
        targetUser,
        interaction.user,
        "MUTE",
        reason,
        readableDuration
      );

      const embed = new EmbedBuilder()
        .setColor(0xEB459E)
        .setDescription(
          `🔇 **${targetUser.tag}** a été rendu muet pour **${readableDuration}**.\n**Raison :** ${reason}`
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      await interaction.reply({
        content: "❌ Une erreur est survenue lors de l'application du timeout.",
        ephemeral: true,
      });
    }
  },
};
