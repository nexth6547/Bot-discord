import { EmbedBuilder, GuildMember, PartialGuildMember } from "discord.js";
import { LogService } from "../services/logService";

export async function onGuildMemberUpdate(
  oldMember: GuildMember | PartialGuildMember,
  newMember: GuildMember | PartialGuildMember
) {
  if (oldMember.partial) return;

  const oldRoleIds = new Set(oldMember.roles.cache.keys());
  const newRoleIds = new Set(newMember.roles.cache.keys());
  const added = newMember.roles.cache
    .filter((role) => !oldRoleIds.has(role.id))
    .map((role) => role.name);
  const removed = oldMember.roles.cache
    .filter((role) => !newRoleIds.has(role.id))
    .map((role) => role.name);

  if (added.length === 0 && removed.length === 0) return;

  const changes = [
    added.length > 0 ? `**Ajoutés :** ${added.join(", ")}` : "",
    removed.length > 0 ? `**Retirés :** ${removed.join(", ")}` : "",
  ].filter(Boolean).join("\n").slice(0, 1024);

  const embed = new EmbedBuilder()
    .setTitle("🎭 Rôles du membre modifiés")
    .setColor(0x5865F2)
    .addFields(
      { name: "Membre", value: `${newMember.user.tag} (<@${newMember.id}>)`, inline: true },
      { name: "Changements", value: changes || "Aucun détail disponible", inline: false }
    )
    .setTimestamp();

  await LogService.sendLog(newMember.guild, "role", embed);
}
