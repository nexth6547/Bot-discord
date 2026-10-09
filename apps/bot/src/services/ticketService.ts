import {
  ButtonInteraction,
  ChannelType,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
  OverwriteResolvable,
  Guild,
} from "discord.js";
import prisma, { Prisma } from "@bot/database";

export class TicketService {
  public static async reconcileClosingTickets(guild: Guild) {
    const closingTickets = await prisma.ticket.findMany({
      where: { guildId: guild.id, status: "CLOSING" },
    });

    for (const ticket of closingTickets) {
      try {
        const channel = await guild.channels.fetch(ticket.channelId);
        await prisma.ticket.update({
          where: { id: ticket.id },
          data: channel
            ? { status: "OPEN", closedBy: null }
            : {
                status: "CLOSED",
                closedAt: ticket.closedAt ?? new Date(),
                openTicketKey: null,
              },
        });
      } catch (error) {
        console.error(
          `[TicketService] Impossible de réconcilier le ticket ${ticket.id} au démarrage:`,
          error
        );
      }
    }
  }

  /**
   * Création d'un ticket suite au clic sur le bouton
   */
  public static async handleOpenTicket(interaction: ButtonInteraction) {
    if (!interaction.guild) return;

    await interaction.deferReply({ ephemeral: true });

    const guildId = interaction.guild.id;
    const user = interaction.user;
    const openTicketKey = `${guildId}:${user.id}`;
    let ticketChannel: Awaited<ReturnType<typeof interaction.guild.channels.create>> | null =
      null;
    let ticketId: string | null = null;

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

      const existingTickets = await prisma.ticket.findMany({
        where: {
          guildId,
          userId: user.id,
          status: { in: ["OPEN", "CLOSING"] },
        },
        orderBy: { createdAt: "desc" },
      });

      for (const existingTicket of existingTickets) {
        const existingChannel = await interaction.guild.channels.fetch(
          existingTicket.channelId
        );
        if (!existingChannel) {
          await prisma.ticket.update({
            where: { id: existingTicket.id },
            data: {
              status: "CLOSED",
              closedAt: new Date(),
              openTicketKey: null,
            },
          });
          continue;
        }

        if (
          existingTicket.status === "OPEN" &&
          existingTicket.openTicketKey !== openTicketKey
        ) {
          await prisma.ticket.update({
            where: { id: existingTicket.id },
            data: { openTicketKey },
          });
        }

        await interaction.editReply({
          content:
            existingTicket.status === "CLOSING"
              ? `🔒 La fermeture de votre ticket <#${existingTicket.channelId}> est déjà en cours.`
              : `⚠️ Vous avez déjà un ticket ouvert : <#${existingTicket.channelId}>.`,
        });
        return;
      }

      // Permissions du salon
      const permissionOverwrites: OverwriteResolvable[] = [
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
      ticketChannel = await interaction.guild.channels.create({
        name: channelName,
        type: ChannelType.GuildText,
        parent: config.categoryId || undefined,
        permissionOverwrites,
      });

      const ticket = await prisma.ticket.create({
        data: {
          guildId,
          channelId: ticketChannel.id,
          userId: user.id,
          userTag: user.tag,
          status: "OPEN",
          openTicketKey,
        },
      });
      ticketId = ticket.id;

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
      let channelDeleted = false;
      if (ticketChannel) {
        try {
          await ticketChannel.delete("Échec de l'initialisation du ticket");
          channelDeleted = true;
        } catch (cleanupError) {
          console.error(
            `[TicketService] Impossible de nettoyer le salon ${ticketChannel.id} après l'échec de création:`,
            cleanupError
          );
        }
      }

      if (ticketId && channelDeleted) {
        try {
          await prisma.ticket.update({
            where: { id: ticketId },
            data: {
              status: "CLOSED",
              closedAt: new Date(),
              openTicketKey: null,
            },
          });
        } catch (cleanupError) {
          console.error(
            `[TicketService] Impossible de clôturer l'enregistrement du ticket ${ticketId} après le nettoyage Discord:`,
            cleanupError
          );
        }
      }

      if (ticketChannel && !channelDeleted) {
        await interaction.editReply({
          content: `❌ Le ticket n'a pas pu être initialisé et le salon <#${ticketChannel.id}> n'a pas pu être supprimé. Contactez un administrateur pour le vérifier.`,
        });
        return;
      }

      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        try {
          const activeTicket = await prisma.ticket.findFirst({
            where: {
              guildId,
              userId: user.id,
              status: { in: ["OPEN", "CLOSING"] },
            },
            orderBy: { createdAt: "desc" },
          });
          if (activeTicket) {
            await interaction.editReply({
              content: `⚠️ Vous avez déjà un ticket ouvert : <#${activeTicket.channelId}>.`,
            });
            return;
          }
        } catch (lookupError) {
          console.error(
            "[TicketService] Impossible d'identifier le ticket concurrent après conflit d'unicité:",
            lookupError
          );
        }
      }

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

      const member = await interaction.guild.members.fetch(interaction.user.id);
      const config = await prisma.ticketConfig.findUnique({
        where: { guildId: interaction.guild.id },
        select: { supportRoleId: true },
      });
      const canClose =
        ticket.userId === interaction.user.id ||
        member.permissions.has(PermissionFlagsBits.ManageGuild) ||
        member.permissions.has(PermissionFlagsBits.Administrator) ||
        Boolean(config?.supportRoleId && member.roles.cache.has(config.supportRoleId));
      if (!canClose) {
        await interaction.editReply({
          content: "❌ Seul l'auteur du ticket ou l'équipe de support peut le fermer.",
        });
        return;
      }

      const closing = await prisma.ticket.updateMany({
        where: { id: ticket.id, status: "OPEN" },
        data: {
          status: "CLOSING",
          closedBy: interaction.user.tag,
        },
      });
      if (closing.count === 0) {
        await interaction.editReply({
          content: "🔒 La fermeture de ce ticket est déjà en cours.",
        });
        return;
      }

      await interaction.editReply({
        content: "🔒 Ce ticket est en cours de fermeture. Le salon sera supprimé dans 5 secondes...",
      });

      await new Promise((resolve) => setTimeout(resolve, 5000));

      try {
        await interaction.channel.delete("Ticket fermé");
      } catch (deleteError) {
        console.error(
          `[TicketService] Impossible de supprimer le salon du ticket ${ticket.id}:`,
          deleteError
        );
        try {
          await prisma.ticket.update({
            where: { id: ticket.id },
            data: { status: "OPEN", closedBy: null },
          });
          await interaction.editReply({
            content: "❌ Le salon n'a pas pu être supprimé. Le ticket reste ouvert ; vérifiez les permissions du bot puis réessayez.",
          });
        } catch (recoveryError) {
          console.error(
            `[TicketService] Impossible de restaurer l'état ouvert du ticket ${ticket.id}:`,
            recoveryError
          );
          await interaction.editReply({
            content: "❌ Le salon n'a pas pu être supprimé et l'état du ticket n'a pas pu être restauré. Un administrateur doit vérifier ce ticket.",
          });
        }
        return;
      }

      try {
        await prisma.ticket.update({
          where: { id: ticket.id },
          data: {
            status: "CLOSED",
            closedAt: new Date(),
            closedBy: interaction.user.tag,
            openTicketKey: null,
          },
        });
      } catch (databaseError) {
        console.error(
          `[TicketService] Le salon du ticket ${ticket.id} a été supprimé, mais son état n'a pas pu être finalisé en base:`,
          databaseError
        );
        await interaction.editReply({
          content: "✅ Le salon a été supprimé. La base n'a pas pu confirmer la fermeture ; elle sera réconciliée lors de la prochaine demande de ticket.",
        });
        return;
      }

      await interaction.editReply({
        content: "✅ Le ticket a été fermé et son salon supprimé.",
      });
    } catch (err) {
      console.error("[TicketService] Erreur lors de la fermeture:", err);
      await interaction.editReply({
        content: "❌ Impossible de clore le ticket.",
      });
    }
  }
}
