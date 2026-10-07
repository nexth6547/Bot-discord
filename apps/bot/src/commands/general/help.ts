import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import { Command, BotClient } from "../../client";

export const helpCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("Afficher la liste des commandes et des modules disponibles"),

  async execute(interaction: ChatInputCommandInteraction, client: BotClient) {
    const embed = new EmbedBuilder()
      .setTitle("🤖 Menu d'aide du Bot")
      .setDescription(
        "Ce bot est entièrement personnalisable depuis le **Dashboard Web** !\nVoici la liste des commandes disponibles :"
      )
      .setColor(0x5865F2)
      .addFields(
        {
          name: "🛡️ Modération",
          value:
            "`/ban` : Bannir un membre\n`/kick` : Expulser un membre\n`/timeout` : Rendre muet temporairement\n`/warn` : Avertir un membre\n`/warnings` : Historique des avertissements\n`/clear` : Supprimer des messages",
        },
        {
          name: "📩 Support & Tickets",
          value: "`/ticket-setup` : Configurer et déployer le panneau d'ouverture de tickets",
        },
        {
          name: "🏆 Niveaux & XP",
          value:
            "`/rank` : Afficher son niveau et sa progression\n`/leaderboard` : Afficher les meilleurs membres",
        },
        {
          name: "🎭 Rôles & Boutons",
          value: "`/reactionrole-setup` : Créer un panneau d'auto-attribution de rôle avec bouton",
        },
        {
          name: "ℹ️ Général",
          value: "`/ping` : Latence du bot\n`/serverinfo` : Informations du serveur\n`/userinfo` : Profil d'un membre",
        }
      )
      .setFooter({ text: "Dashboard disponible sur http://localhost:3000" })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
