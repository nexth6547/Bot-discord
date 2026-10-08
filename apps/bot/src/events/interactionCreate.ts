import {
  Interaction,
  PermissionFlagsBits,
} from "discord.js";
import { BotClient } from "../client";
import { TicketService } from "../services/ticketService";

const commandPermissions = {
  ban: PermissionFlagsBits.BanMembers,
  kick: PermissionFlagsBits.KickMembers,
  timeout: PermissionFlagsBits.ModerateMembers,
  warn: PermissionFlagsBits.ModerateMembers,
  warnings: PermissionFlagsBits.ModerateMembers,
  clear: PermissionFlagsBits.ManageMessages,
  "ticket-setup": PermissionFlagsBits.Administrator,
  "reactionrole-setup": PermissionFlagsBits.ManageRoles,
} as const;

export async function onInteractionCreate(interaction: Interaction, client: BotClient) {
  // 1. Commandes Slash
  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) {
      console.warn(`Commande inconnue exécutée : ${interaction.commandName}`);
      return;
    }

    try {
      const requiredPermission =
        commandPermissions[interaction.commandName as keyof typeof commandPermissions];
      if (
        requiredPermission &&
        !interaction.memberPermissions?.has(requiredPermission)
      ) {
        await interaction.reply({
          content: "❌ Vous n'avez pas la permission Discord requise pour cette commande.",
          ephemeral: true,
        });
        return;
      }

      await command.execute(interaction, client);
    } catch (err) {
      console.error(`Erreur lors de l'exécution de ${interaction.commandName} :`, err);
      const reply = {
        content: "❌ Une erreur est survenue lors de l'exécution de cette commande !",
        ephemeral: true,
      };
      if (interaction.replied || interaction.deferred) {
        try {
          await interaction.followUp(reply);
        } catch (replyError) {
          console.error("Impossible d'envoyer la réponse d'erreur à l'interaction :", replyError);
        }
      } else {
        try {
          await interaction.reply(reply);
        } catch (replyError) {
          console.error("Impossible d'envoyer la réponse d'erreur à l'interaction :", replyError);
        }
      }
    }
    return;
  }

  // 2. Boutons interactifs (Tickets & Rôles)
  if (interaction.isButton()) {
    const customId = interaction.customId;

    // Actions Tickets
    if (customId === "ticket_create") {
      await TicketService.handleOpenTicket(interaction);
      return;
    }
    if (customId === "ticket_close") {
      await TicketService.handleCloseTicket(interaction);
      return;
    }

    // Actions Rôles par boutons : reaction_role_<roleId>
    if (customId.startsWith("reaction_role_")) {
      const roleId = customId.replace("reaction_role_", "");
      const guild = interaction.guild;
      if (!guild) return;

      const role = guild.roles.cache.get(roleId);
      if (!role || role.managed || role.id === guild.id) {
        await interaction.reply({
          content: "❌ Ce rôle n'existe plus sur le serveur.",
          ephemeral: true,
        });
        return;
      }

      try {
        const panel = await client.db.reactionRole.findFirst({
          where: {
            guildId: guild.id,
            channelId: interaction.channelId,
            messageId: interaction.message.id,
            roleId,
          },
        });
        if (!panel) {
          await interaction.reply({
            content: "❌ Ce bouton de rôle n'est plus actif.",
            ephemeral: true,
          });
          return;
        }

        const member = await guild.members.fetch(interaction.user.id);
        const botMember = await guild.members.fetchMe();
        if (role.position >= botMember.roles.highest.position) {
          await interaction.reply({
            content: "❌ Le bot ne peut plus gérer ce rôle. Contactez un administrateur.",
            ephemeral: true,
          });
          return;
        }

        if (member.roles.cache.has(roleId)) {
          await member.roles.remove(roleId);
          await interaction.reply({
            content: `🗑️ Le rôle **${role.name}** vous a été retiré.`,
            ephemeral: true,
          });
        } else {
          await member.roles.add(roleId);
          await interaction.reply({
            content: `✅ Le rôle **${role.name}** vous a été attribué !`,
            ephemeral: true,
          });
        }
      } catch (err) {
        console.error("Erreur lors de l'attribution du rôle :", err);
        await interaction.reply({
          content: "❌ Impossible de modifier votre rôle. Vérifiez les permissions et la hiérarchie du bot.",
          ephemeral: true,
        });
      }
      return;
    }
  }
}
