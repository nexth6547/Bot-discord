import {
  ButtonInteraction,
  ChannelType,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
  TextChannel,
} from "discord.js";
import prisma from "@bot/database";

export class TicketService {
  /**
   * Création d'un ticket suite au clic sur le bouton
   */
  public static async handleOpenTicket(interaction: ButtonInteraction) {
    if (!interaction.guild) return;

    await interaction.deferReply({ ephemeral: true });

    const guildId = interaction.guild.id;
    const user = interaction.user;

    try {
      const config = await prisma.ticketConfig.findUnique({
        where: { guildId },
      });

      if (!config || !config.enabled) {
        await interaction.editReply({
          content: "❌ Le système de tickets n'est pas activé ou configuré sur ce serveur.",
        });
        return;
      }

      // Vérifier si l'utilisateur a déjà un ticket ouvert
      const existingTicket = await prisma.ticket.findFirst({
        where: {
          guildId,
          userId: user.id,
          status: "OPEN",
        },
      });

      if (existingTicket) {
        await interaction.editReply({
          content: `⚠️ Vous avez déjà un ticket ouvert : <#${existingTicket.channelId}>.`,
        });
        return;
      }

      // Permissions du salon
      const permissionOverwrites: any[] = [
        {
          id: interaction.guild.roles.everyone.id,
          deny: [PermissionFlagsBits.ViewChannel],
        },
        {
          id: user.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.AttachFiles,
          ],
        },
        {
          id: interaction.client.user.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ManageChannels,
            PermissionFlagsBits.EmbedLinks,
          ],
        },
      ];

      // Ajouter le rôle de support si configuré
      if (config.supportRoleId) {
        permissionOverwrites.push({
          id: config.supportRoleId,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
          ],
        });
      }

      // Nom du salon : ticket-nomutilisateur
      const cleanUsername = user.username.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 15);
      const channelName = `ticket-${cleanUsername || user.id.slice(0, 4)}`;

      // Création du canal
      const ticketChannel = await interaction.guild.channels.create({
        name: channelName,
        type: ChannelType.GuildText,
        parent: config.categoryId || undefined,
        permissionOverwrites,
      });

      // Sauvegarder dans la base
      await prisma.ticket.create({
        data: {
          guildId,
          channelId: ticketChannel.id,
          userId: user.id,
          userTag: user.tag,
          status: "OPEN",
        },
      });

      // Embed de bienvenue dans le salon
      const embed = new EmbedBuilder()
        .setTitle("Ticket d'assistance")
        .setDescription(
          `Bonjour <@${user.id}> !\n\nL'équipe de support vous répondra dans les plus brefs délais.\nDécrivez précisément votre problème pour accélérer le traitement.\n\nPour clore ce ticket, cliquez sur le bouton ci-dessous.`
        )
        .setColor(0x5865F2)
        .setTimestamp();

      const closeRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId("ticket_close")
          .setLabel("Fermer le ticket")
          .setEmoji("🔒")
          .setStyle(ButtonStyle.Danger)
      );

      await ticketChannel.send({
        content: `<@${user.id}>${config.supportRoleId ? ` | <@&${config.supportRoleId}>` : ""}`,
        embeds: [embed],
        components: [closeRow],
      });

      await interaction.editReply({
        content: `✅ Votre ticket a été créé : <#${ticketChannel.id}>`,
      });
    } catch (err) {
      console.error("[TicketService] Erreur lors de la création du ticket:", err);
      await interaction.editReply({
        content: "❌ Une erreur est survenue lors de la création du salon de ticket.",
      });
    }
  }

  /**
   * Fermeture d'un ticket
   */
  public static async handleCloseTicket(interaction: ButtonInteraction) {
    if (!interaction.guild || !interaction.channel) return;

    await interaction.deferReply();

    const channelId = interaction.channel.id;

    try {
      const ticket = await prisma.ticket.findUnique({
        where: { channelId },
      });

      if (!ticket) {
        await interaction.editReply({
          content: "❌ Ce salon n'est pas répertorié comme un ticket actif.",
        });
        return;
      }

      await prisma.ticket.update({
        where: { id: ticket.id },
        data: {
          status: "CLOSED",
          closedAt: new Date(),
          closedBy: interaction.user.tag,
        },
      });

      await interaction.editReply({
        content: "🔒 Ce ticket est en cours de fermeture. Le salon sera supprimé dans 5 secondes...",
      });

      setTimeout(async () => {
        try {
          if (interaction.channel) {
            await interaction.channel.delete("Ticket fermé");
          }
        } catch (e) {
          console.error("Erreur lors de la suppression du salon de ticket:", e);
        }
      }, 5000);
    } catch (err) {
      console.error("[TicketService] Erreur lors de la fermeture:", err);
      await interaction.editReply({
        content: "❌ Impossible de clore le ticket.",
      });
    }
  }
}
