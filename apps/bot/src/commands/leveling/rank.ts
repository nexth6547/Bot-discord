import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import { Command, BotClient } from "../../client";
import { LevelService } from "../../services/levelService";
import prisma from "@bot/database";

export const rankCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("rank")
    .setDescription("Consulter sa carte de niveau et sa progression d'XP")
    .addUserOption((option) =>
      option.setName("utilisateur").setDescription("L'utilisateur à consulter").setRequired(false)
    ),

  async execute(interaction: ChatInputCommandInteraction, client: BotClient) {
    if (!interaction.guild) return;

    const targetUser = interaction.options.getUser("utilisateur") || interaction.user;
    const guildId = interaction.guild.id;

    try {
      const userLevel = await prisma.userLevel.findUnique({
        where: {
          guildId_userId: { guildId, userId: targetUser.id },
        },
      });

      const currentXp = userLevel?.xp || 0;
      const currentLevel = userLevel?.level || 0;
      const nextLevelXp = LevelService.getXpForLevel(currentLevel + 1);
      const currentLevelBaseXp = LevelService.getXpForLevel(currentLevel);

      const xpInThisLevel = Math.max(0, currentXp - currentLevelBaseXp);
      const xpNeededForNext = Math.max(1, nextLevelXp - currentLevelBaseXp);
      const progressPercent = Math.min(100, Math.floor((xpInThisLevel / xpNeededForNext) * 100));

      // Calculer le rang sur le serveur
      const rank =
        (await prisma.userLevel.count({
          where: {
            guildId,
            xp: { gt: currentXp },
          },
        })) + 1;

      // Barre de progression visuelle en caractères
      const barLength = 12;
      const filled = Math.round((progressPercent / 100) * barLength);
      const empty = barLength - filled;
      const progressBar = `[${"█".repeat(filled)}${"░".repeat(empty)}]`;

      const embed = new EmbedBuilder()
        .setTitle(`Progression de ${targetUser.username}`)
        .setThumbnail(targetUser.displayAvatarURL())
        .setColor(0x5865F2)
        .addFields(
          { name: "🏆 Rang", value: `#${rank}`, inline: true },
          { name: "⭐ Niveau", value: `**${currentLevel}**`, inline: true },
          { name: "✨ Total XP", value: `\`${currentXp}\` XP`, inline: true },
          {
            name: "Progression vers niveau suivant",
            value: `${progressBar} **${progressPercent}%** (${xpInThisLevel} / ${xpNeededForNext} XP)`,
            inline: false,
          },
          { name: "💬 Messages comptabilisés", value: `${userLevel?.messagesCount || 0}`, inline: true }
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      await interaction.reply({
        content: "❌ Impossible de récupérer les données de niveau.",
        ephemeral: true,
      });
    }
  },
};
