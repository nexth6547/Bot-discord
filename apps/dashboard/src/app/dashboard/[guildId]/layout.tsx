import React from "react";
import { Sidebar } from "@/components/dashboard/Sidebar";

export default function GuildDashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { guildId: string };
}) {
  return (
    <div className="flex-1 flex min-h-[calc(100vh-4rem)]">
      <Sidebar guildId={params.guildId} guildName="Mon Serveur Discord" />
      <div className="flex-1 overflow-y-auto bg-zinc-950 p-6 sm:p-8 lg:p-10">
        <div className="max-w-4xl mx-auto">{children}</div>
      </div>
    </div>
  );
}
