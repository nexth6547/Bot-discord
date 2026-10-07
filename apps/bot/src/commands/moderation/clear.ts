import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  TextChannel,
} from "discord.js";
import { Command, BotClient } from "../../client";

export const clearCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("clear")
    .setDescription("Supprimer un nombre défini de messages dans le salon")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addIntegerOption((option) =>
      option
        .setName("nombre")
        .setDescription("Nombre de messages à supprimer (entre 1 et 100)")
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100)
    ),

  async execute(interaction: ChatInputCommandInteraction, client: BotClient) {
    const channel = interaction.channel as TextChannel;
    if (!channel || !channel.isTextBased()) return;

    const amount = interaction.options.getInteger("nombre", true);

    try {
      await interaction.deferReply({ ephemeral: true });

      const deleted = await channel.bulkDelete(amount, true);

      await interaction.editReply({
        content: `🧹 **${deleted.size}** message(s) ont été supprimé(s) avec succès.`,
      });
    } catch (err) {
      console.error(err);
      await interaction.editReply({
        content: "❌ Impossible de supprimer les messages (les messages de plus de 14 jours ne peuvent pas être supprimés en masse).",
      });
    }
  },
};
