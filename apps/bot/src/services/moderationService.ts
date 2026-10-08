import {
  ChatInputCommandInteraction,
  GuildMember,
  PermissionFlagsBits,
} from "discord.js";

export async function isTargetBelowModerator(
  interaction: ChatInputCommandInteraction,
  target: GuildMember
): Promise<boolean> {
  const guild = interaction.guild;
  if (!guild || target.id === guild.ownerId) return false;

  const moderator = await guild.members.fetch(interaction.user.id);
  if (moderator.id === guild.ownerId) return true;
  if (moderator.permissions.has(PermissionFlagsBits.Administrator)) return true;

  return moderator.roles.highest.comparePositionTo(target.roles.highest) > 0;
}
