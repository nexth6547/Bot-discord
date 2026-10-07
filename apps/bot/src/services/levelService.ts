import { Message, TextChannel } from "discord.js";
import prisma from "@bot/database";

export class LevelService {
  /**
   * Calcule le niveau en fonction de l'XP totale
   * Formule standard style DraftBot / Mee6
   */
  public static getLevelFromXp(xp: number): number {
    let level = 0;
    while (this.getXpForLevel(level + 1) <= xp) {
      level++;
    }
    return level;
  }

  /**
   * Calcule l'XP nécessaire pour atteindre le niveau donné
   */
  public static getXpForLevel(level: number): number {
    if (level <= 0) return 0;
    // Formule quadratique simple : 100 * level^1.5 arrondi ou somme
    let total = 0;
    for (let i = 1; i <= level; i++) {
      total += 5 * Math.pow(i, 2) + 50 * i + 100;
    }
    return total;
  }

  /**
   * Traitement d'un nouveau message pour l'attribution d'XP
   */
  public static async handleMessage(message: Message) {
    if (!message.guild || message.author.bot) return;

    const guildId = message.guild.id;
    const userId = message.author.id;

    try {
      const config = await prisma.levelConfig.findUnique({
        where: { guildId },
      });

      if (!config || !config.enabled) return;

      // Vérifier les salons ignorés
      let ignoredChannels: string[] = [];
      try {
        ignoredChannels = JSON.parse(config.ignoredChannelIds || "[]");
      } catch {
        ignoredChannels = [];
      }

      if (ignoredChannels.includes(message.channel.id)) return;

      // Récupérer ou créer l'utilisateur
      const userLevel = await prisma.userLevel.findUnique({
        where: {
          guildId_userId: { guildId, userId },
        },
      });

      const now = new Date();
      if (userLevel) {
        // Vérifier le cooldown anti-spam
        const diffSeconds = (now.getTime() - new Date(userLevel.lastXpAt).getTime()) / 1000;
        if (diffSeconds < config.cooldownSeconds) {
          // Juste incrémenter le compteur de messages sans donner d'XP
          await prisma.userLevel.update({
            where: { id: userLevel.id },
            data: { messagesCount: { increment: 1 } },
          });
          return;
        }
      }

      // Calcul de l'XP aléatoire entre min et max
      const min = config.xpPerMessageMin || 15;
      const max = config.xpPerMessageMax || 25;
      const gainedXp = Math.floor(Math.random() * (max - min + 1)) + min;

      const currentXp = (userLevel?.xp || 0) + gainedXp;
      const oldLevel = userLevel?.level || 0;
      const newLevel = this.getLevelFromXp(currentXp);

      await prisma.userLevel.upsert({
        where: {
          guildId_userId: { guildId, userId },
        },
        create: {
          guildId,
          userId,
          userTag: message.author.tag,
          avatarUrl: message.author.displayAvatarURL(),
          xp: gainedXp,
          level: newLevel,
          messagesCount: 1,
          lastXpAt: now,
        },
        update: {
          xp: currentXp,
          level: newLevel,
          messagesCount: { increment: 1 },
          lastXpAt: now,
          userTag: message.author.tag,
          avatarUrl: message.author.displayAvatarURL(),
        },
      });

      // Annonce de montée de niveau
      if (newLevel > oldLevel) {
        let announceChannel = message.channel as TextChannel;
        if (config.announceChannelId) {
          const targetChan = message.guild.channels.cache.get(config.announceChannelId) as TextChannel;
          if (targetChan && targetChan.isTextBased()) {
            announceChannel = targetChan;
          }
        }

        const announceMsg = (config.announceMessage || "Bravo {user} ! Tu as atteint le niveau **{level}** ! 🎉")
          .replace("{user}", `<@${userId}>`)
          .replace("{level}", newLevel.toString())
          .replace("{server}", message.guild.name);

        await announceChannel.send({ content: announceMsg });
      }
    } catch (err) {
      console.error("[LevelService] Erreur lors de l'attribution d'XP:", err);
    }
  }
}
