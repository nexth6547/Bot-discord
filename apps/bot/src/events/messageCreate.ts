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
          await message.delete().catch(() => null);
          if (!message.channel.isSendable()) return;
          const reply = await message.channel.send({
            content: `⚠️ <@${message.author.id}>, les liens ne sont pas autorisés sur ce serveur.`,
          });
          setTimeout(() => reply.delete().catch(() => null), 4000);
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
