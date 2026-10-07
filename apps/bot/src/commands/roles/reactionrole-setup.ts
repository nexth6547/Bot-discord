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

export const reactionRoleSetupCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("reactionrole-setup")
    .setDescription("Créer un bouton interactif permettant aux membres d'obtenir un rôle")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addRoleOption((option) =>
      option.setName("role").setDescription("Le rôle à attribuer").setRequired(true)
    )
    .addChannelOption((option) =>
      option
        .setName("salon")
        .setDescription("Le salon où envoyer le message")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    )
    .addStringOption((option) =>
      option.setName("texte").setDescription("Texte affiché sur le bouton").setRequired(false)
    )
    .addStringOption((option) =>
      option.setName("emoji").setDescription("Emoji à afficher sur le bouton").setRequired(false)
    ),

  async execute(interaction: ChatInputCommandInteraction, client: BotClient) {
    if (!interaction.guild) return;

    await interaction.deferReply({ ephemeral: true });

    const role = interaction.options.getRole("role", true);
    const channel = interaction.options.getChannel("salon", true) as any;
    const buttonText = interaction.options.getString("texte") || `Obtenir le rôle ${role.name}`;
    const emoji = interaction.options.getString("emoji") || "✨";

    // Vérifier la hiérarchie des rôles
    const botMember = await interaction.guild.members.fetch(client.user!.id);
    if (role.position >= botMember.roles.highest.position) {
      await interaction.editReply({
        content: `❌ Le rôle <@&${role.id}> est placé plus haut ou au même niveau que mon rôle le plus élevé. Veuillez réorganiser vos rôles.`,
      });
      return;
    }

    try {
      const embed = new EmbedBuilder()
        .setTitle("🎭 Sélection de rôle")
        .setDescription(`Cliquez sur le bouton ci-dessous pour obtenir ou retirer le rôle <@&${role.id}>.`)
        .setColor(role.color || 0x5865F2);

      const customId = `reaction_role_${role.id}`;

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(customId)
          .setLabel(buttonText)
          .setEmoji(emoji)
          .setStyle(ButtonStyle.Primary)
      );

      const message = await channel.send({
        embeds: [embed],
        components: [row],
      });

      // Sauvegarde en DB
      await prisma.reactionRole.create({
        data: {
          guildId: interaction.guild.id,
          channelId: channel.id,
          messageId: message.id,
          roleId: role.id,
          roleName: role.name,
          emoji,
          label: buttonText,
        },
      });

      await interaction.editReply({
        content: `✅ Le panneau de rôle pour <@&${role.id}> a été envoyé avec succès dans <#${channel.id}> !`,
      });
    } catch (err) {
      console.error(err);
      await interaction.editReply({
        content: "❌ Impossible d'envoyer le message de sélection de rôle.",
      });
    }
  },
};
