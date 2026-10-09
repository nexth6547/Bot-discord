import React from "react";
import { notFound, redirect } from "next/navigation";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { authorizeGuild } from "@/lib/guild-access";

export default async function GuildDashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { guildId: string };
}) {
  const access = await authorizeGuild(params.guildId);
  if (!access.ok) {
    if (access.response.status === 401) redirect("/dashboard?error=session-expired");
    if (access.response.status === 403 || access.response.status === 400) notFound();
    throw new Error("Impossible de vérifier les autorisations Discord.");
  }

  return (
    <div className="flex-1 flex min-h-[calc(100vh-4rem)]">
      <Sidebar
        guildId={params.guildId}
        guildName={access.guild.name}
        guildIcon={
          access.guild.icon
            ? `https://cdn.discordapp.com/icons/${access.guild.id}/${access.guild.icon}.${access.guild.icon.startsWith("a_") ? "gif" : "png"}?size=128`
            : null
        }
      />
      <div className="flex-1 overflow-y-auto bg-zinc-950 p-6 sm:p-8 lg:p-10">
        <div className="max-w-4xl mx-auto">{children}</div>
      </div>
    </div>
  );
}
