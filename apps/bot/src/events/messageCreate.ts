import { Message, PermissionFlagsBits } from "discord.js";
import { LevelService } from "../services/levelService";
import prisma from "@bot/database";

export async function onMessageCreate(message: Message) {
  if (!message.guild || message.author.bot) return;

  // 1. Modération automatique (Auto-Mod)
  try {
    const modConfig = await prisma.modConfig.findUnique({
      where: { guildId: message.guild.id },
    });

    if (modConfig?.autoModAntiLink) {
      // Ignorer les modérateurs et admins
      const member = message.member;
      const isStaff =
        member?.permissions.has(PermissionFlagsBits.ManageMessages) ||
        (modConfig.modRoleId && member?.roles.cache.has(modConfig.modRoleId));

      if (!isStaff) {
        const linkRegex = /(https?:\/\/[^\s]+)|(discord\.(gg|io|me|li)\/[^\s]+)/gi;
        if (linkRegex.test(message.content)) {
          try {
            await message.delete();
          } catch (error) {
            console.error("[onMessageCreate] Impossible de supprimer un lien interdit:", error);
            return;
          }
          if (!message.channel.isSendable()) return;
          try {
            const reply = await message.channel.send({
              content: `⚠️ <@${message.author.id}>, les liens ne sont pas autorisés sur ce serveur.`,
            });
            setTimeout(() => {
              void reply.delete().catch((error: unknown) => {
                console.error("[onMessageCreate] Impossible de supprimer l'avertissement:", error);
              });
            }, 4000);
          } catch (error) {
            console.error("[onMessageCreate] Impossible d'envoyer l'avertissement Auto-Mod:", error);
          }
          return;
        }
      }
    }
  } catch (e) {
    console.error("[onMessageCreate] Erreur auto-mod:", e);
  }

  // 2. Gestion de l'XP et du système de niveaux
  await LevelService.handleMessage(message);
}
