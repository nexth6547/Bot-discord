import { BotClient } from "./client";
import { assertBotEnvironment, config } from "./config";

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
import { onGuildUpdate } from "./events/guildUpdate";
import { onGuildDelete } from "./events/guildDelete";
import { onGuildMemberAdd } from "./events/guildMemberAdd";
import { onGuildMemberRemove } from "./events/guildMemberRemove";
import { onMessageCreate } from "./events/messageCreate";
import { onMessageDelete } from "./events/messageDelete";
import { onMessageUpdate } from "./events/messageUpdate";
import { onGuildMemberUpdate } from "./events/guildMemberUpdate";
import { onVoiceStateUpdate } from "./events/voiceStateUpdate";
import { onInteractionCreate } from "./events/interactionCreate";

async function main() {
  console.log("🚀 Initialisation du Bot Discord...");
  assertBotEnvironment();

  const client = new BotClient();
  await client.db.$connect();

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
  client.on("guildUpdate", onGuildUpdate);
  client.on("guildDelete", onGuildDelete);
  client.on("guildMemberAdd", onGuildMemberAdd);
  client.on("guildMemberRemove", onGuildMemberRemove);
  client.on("guildMemberUpdate", onGuildMemberUpdate);
  client.on("voiceStateUpdate", onVoiceStateUpdate);
  client.on("messageCreate", onMessageCreate);
  client.on("messageDelete", onMessageDelete);
  client.on("messageUpdate", onMessageUpdate);
  client.on("interactionCreate", (interaction) => onInteractionCreate(interaction, client));

  let shutdownPromise: Promise<void> | undefined;
  let shuttingDown = false;
  const shutdown = (signal: string) => {
    if (shutdownPromise) return shutdownPromise;

    shuttingDown = true;
    console.log(`🛑 Arrêt du bot demandé (${signal}).`);
    shutdownPromise = (async () => {
      client.destroy();
      await client.db.$disconnect();
      console.log("✅ Connexion Discord et base de données fermées.");
    })();
    return shutdownPromise;
  };

  const handleSignal = (signal: NodeJS.Signals) => {
    void shutdown(signal).catch((err) => {
      console.error(`❌ Erreur lors de l'arrêt (${signal}) :`, err);
      process.exitCode = 1;
    });
  };

  process.once("SIGINT", handleSignal);
  process.once("SIGTERM", handleSignal);

  try {
    await client.login(config.token);
  } catch (err) {
    if (shuttingDown) return;
    console.error("❌ Échec de la connexion à Discord :", err);
    process.exitCode = 1;
    await shutdown("échec de connexion");
  }
}

main().catch((err) => {
  console.error("❌ Erreur fatale au lancement du bot :", err);
  process.exitCode = 1;
});
