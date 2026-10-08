import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
} from "discord.js";
import { Command, BotClient } from "../../client";
import prisma from "@bot/database";

export const ticketSetupCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("ticket-setup")
    .setDescription("Déployer le panneau interactif pour le système de tickets")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption((option) =>
      option
        .setName("salon")
        .setDescription("Le salon où envoyer le panneau")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    )
    .addRoleOption((option) =>
      option
        .setName("role_support")
        .setDescription("Rôle qui aura accès aux tickets créés")
        .setRequired(false)
    )
    .addChannelOption((option) =>
      option
        .setName("categorie")
        .setDescription("Catégorie où seront créés les nouveaux tickets")
        .addChannelTypes(ChannelType.GuildCategory)
        .setRequired(false)
    ),

  async execute(interaction: ChatInputCommandInteraction, client: BotClient) {
    if (!interaction.guild) return;

    await interaction.deferReply({ ephemeral: true });

    const channelOption = interaction.options.getChannel("salon", true);
    if (channelOption.type !== ChannelType.GuildText) {
      await interaction.editReply({ content: "❌ Sélectionnez un salon textuel." });
      return;
    }
    const targetChannel = await interaction.guild.channels.fetch(channelOption.id);
    if (!targetChannel || targetChannel.type !== ChannelType.GuildText) {
      await interaction.editReply({ content: "❌ Ce salon textuel n'est plus disponible." });
      return;
    }
    const supportRole = interaction.options.getRole("role_support");
    const category = interaction.options.getChannel("categorie");

    try {
      const currentConfig = await prisma.ticketConfig.findUnique({
        where: { guildId: interaction.guild.id },
      });
      const supportRoleId = supportRole?.id ?? currentConfig?.supportRoleId ?? null;
      const categoryId = category?.id ?? currentConfig?.categoryId ?? null;
      const embed = new EmbedBuilder()
        .setTitle(currentConfig?.panelTitle || "📩 Centre d'assistance & Support")
        .setDescription(
          currentConfig?.panelDescription ||
            "Un problème ou une question ?\nCliquez sur le bouton ci-dessous pour ouvrir un salon de ticket privé avec l'équipe de modération."
        )
        .setColor(0x5865F2)
        .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL() || undefined });

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId("ticket_create")
          .setLabel(currentConfig?.buttonText || "Ouvrir un ticket")
          .setEmoji("📩")
          .setStyle(ButtonStyle.Primary)
      );

      const panelMessage = await targetChannel.send({
        embeds: [embed],
        components: [row],
      });

      // Mettre à jour la configuration en DB
      await prisma.ticketConfig.upsert({
        where: { guildId: interaction.guild.id },
        create: {
          guildId: interaction.guild.id,
          enabled: true,
          panelChannelId: targetChannel.id,
          panelMessageId: panelMessage.id,
          supportRoleId,
          categoryId,
        },
        update: {
          enabled: true,
          panelChannelId: targetChannel.id,
          panelMessageId: panelMessage.id,
          supportRoleId,
          categoryId,
        },
      });

      await interaction.editReply({
        content: `✅ Le panneau de tickets a été envoyé dans <#${targetChannel.id}> et la configuration a été mise à jour !`,
      });
    } catch (err) {
      console.error(err);
      await interaction.editReply({
        content: "❌ Impossible d'envoyer le panneau de tickets.",
      });
    }
  },
};
