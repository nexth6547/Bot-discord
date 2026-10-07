import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import { Command, BotClient } from "../../client";
import prisma from "@bot/database";

export const leaderboardCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("leaderboard")
    .setDescription("Afficher le classement des membres les plus actifs du serveur"),

  async execute(interaction: ChatInputCommandInteraction, client: BotClient) {
    if (!interaction.guild) return;

    await interaction.deferReply();

    try {
      const topUsers = await prisma.userLevel.findMany({
        where: { guildId: interaction.guild.id },
        orderBy: { xp: "desc" },
        take: 10,
      });

      if (topUsers.length === 0) {
        await interaction.editReply({
          content: "📊 Aucun membre n'a encore gagné d'expérience sur ce serveur.",
        });
        return;
      }

      const medals = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];
      const lines = topUsers.map((u, i) => {
        const medal = medals[i] || `\`#${i + 1}\``;
        return `${medal} **${u.userTag || `<@${u.userId}>`}** — Niveau **${u.level}** (${u.xp.toLocaleString()} XP)`;
      });

      const embed = new EmbedBuilder()
        .setTitle(`🏆 Classement XP : ${interaction.guild.name}`)
        .setDescription(lines.join("\n\n"))
        .setColor(0xFEE75C)
        .setThumbnail(interaction.guild.iconURL())
        .setFooter({ text: "Gagnez de l'XP en discutant dans les salons actifs !" })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      await interaction.editReply({
        content: "❌ Une erreur est survenue lors de la récupération du classement.",
      });
    }
  },
};
