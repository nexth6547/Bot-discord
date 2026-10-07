import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import { Command, BotClient } from "../../client";

export const pingCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Vérifier la latence du bot et de l'API Discord"),

  async execute(interaction: ChatInputCommandInteraction, client: BotClient) {
    const sent = await interaction.reply({
      content: "🏓 Calcul de la latence en cours...",
      fetchReply: true,
    });

    const latency = sent.createdTimestamp - interaction.createdTimestamp;
    const apiLatency = Math.round(client.ws.ping);

    const embed = new EmbedBuilder()
      .setTitle("🏓 Pong !")
      .setColor(0x5865F2)
      .addFields(
        { name: "Latence du bot", value: `\`${latency}ms\``, inline: true },
        { name: "Latence API Discord", value: `\`${apiLatency}ms\``, inline: true }
      )
      .setTimestamp();

    await interaction.editReply({ content: null, embeds: [embed] });
  },
};
