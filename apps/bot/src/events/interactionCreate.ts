import { Interaction, GuildMember } from "discord.js";
import { BotClient } from "../client";
import { TicketService } from "../services/ticketService";

export async function onInteractionCreate(interaction: Interaction, client: BotClient) {
  // 1. Commandes Slash
  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) {
      console.warn(`Commande inconnue exécutée : ${interaction.commandName}`);
      return;
    }

    try {
      await command.execute(interaction, client);
    } catch (err) {
      console.error(`Erreur lors de l'exécution de ${interaction.commandName} :`, err);
      const reply = {
        content: "❌ Une erreur est survenue lors de l'exécution de cette commande !",
        ephemeral: true,
      };
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(reply).catch(() => null);
      } else {
        await interaction.reply(reply).catch(() => null);
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
      const member = interaction.member as GuildMember;

      if (!guild || !member) return;

      const role = guild.roles.cache.get(roleId);
      if (!role) {
        await interaction.reply({
          content: "❌ Ce rôle n'existe plus sur le serveur.",
          ephemeral: true,
        });
        return;
      }

      try {
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
      } catch (err: any) {
        console.error("Erreur lors de l'attribution du rôle :", err);
        await interaction.reply({
          content: `❌ Impossible de modifier vos rôles : ${err.message}`,
          ephemeral: true,
        });
      }
      return;
    }
  }
}
