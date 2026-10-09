import { Guild } from "discord.js";
import { syncGuildConfig } from "../services/guildConfigService";
import { TicketService } from "../services/ticketService";

export async function onGuildCreate(guild: Guild) {
  console.log(`📥 Le bot a rejoint un nouveau serveur : ${guild.name} (${guild.id})`);

  try {
    await syncGuildConfig(guild);
    await TicketService.reconcileClosingTickets(guild);
    console.log(`✅ Configuration synchronisée en base pour le serveur ${guild.name}`);
  } catch (err) {
    console.error(`❌ Erreur lors de l'initialisation du serveur ${guild.id}:`, err);
  }
}
