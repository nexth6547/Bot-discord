import { BotClient } from "./client";
import { config } from "./config";

// Commandes
import { pingCommand } from "./commands/general/ping";
import { helpCommand } from "./commands/general/help";
import { serverinfoCommand } from "./commands/general/serverinfo";
import { userinfoCommand } from "./commands/general/userinfo";
import { banCommand } from "./commands/moderation/ban";
import { kickCommand } from "./commands/moderation/kick";
import { timeoutCommand } from "./commands/moderation/timeout";
import { warnCommand } from "./commands/moderation/warn";
import { warningsCommand } from "./commands/moderation/warnings";
import { clearCommand } from "./commands/moderation/clear";
import { ticketSetupCommand } from "./commands/tickets/ticket-setup";
import { rankCommand } from "./commands/leveling/rank";
import { leaderboardCommand } from "./commands/leveling/leaderboard";
import { reactionRoleSetupCommand } from "./commands/roles/reactionrole-setup";

// Événements
import { onReady } from "./events/ready";
import { onGuildCreate } from "./events/guildCreate";
import { onGuildMemberAdd } from "./events/guildMemberAdd";
import { onGuildMemberRemove } from "./events/guildMemberRemove";
import { onMessageCreate } from "./events/messageCreate";
import { onMessageDelete } from "./events/messageDelete";
import { onMessageUpdate } from "./events/messageUpdate";
import { onInteractionCreate } from "./events/interactionCreate";

async function main() {
  console.log("🚀 Initialisation du Bot Discord...");

  const client = new BotClient();

  // Enregistrement des commandes dans la collection
  const allCommands = [
    pingCommand,
    helpCommand,
    serverinfoCommand,
    userinfoCommand,
    banCommand,
    kickCommand,
    timeoutCommand,
    warnCommand,
    warningsCommand,
    clearCommand,
    ticketSetupCommand,
    rankCommand,
    leaderboardCommand,
    reactionRoleSetupCommand,
  ];

  for (const cmd of allCommands) {
    client.commands.set(cmd.data.name, cmd);
  }

  console.log(`📦 ${client.commands.size} commandes chargées.`);

  // Enregistrement des écouteurs d'événements
  client.once("ready", () => onReady(client));
  client.on("guildCreate", onGuildCreate);
  client.on("guildMemberAdd", onGuildMemberAdd);
  client.on("guildMemberRemove", onGuildMemberRemove);
  client.on("messageCreate", onMessageCreate);
  client.on("messageDelete", onMessageDelete);
  client.on("messageUpdate", onMessageUpdate);
  client.on("interactionCreate", (interaction) => onInteractionCreate(interaction, client));

  if (!config.token || config.token === "YOUR_BOT_TOKEN_HERE") {
    console.log("ℹ️ En attente de la configuration du token dans le fichier .env pour se connecter à Discord.");
    console.log("👉 Renseignez DISCORD_TOKEN dans .env puis redémarrez le bot.");
    return;
  }

  try {
    await client.login(config.token);
  } catch (err: any) {
    console.error("❌ Échec de la connexion à Discord :", err.message);
  }
}

main().catch((err) => {
  console.error("❌ Erreur fatale au lancement du bot :", err);
});
