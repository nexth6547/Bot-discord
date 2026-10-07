"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Sparkles,
  Shield,
  Radio,
  Ticket,
  Trophy,
  Sliders,
  ChevronLeft,
} from "lucide-react";

interface SidebarProps {
  guildId: string;
  guildName?: string;
}

export function Sidebar({ guildId, guildName = "Mon Serveur" }: SidebarProps) {
  const pathname = usePathname();

  const links = [
    {
      href: `/dashboard/${guildId}`,
      label: "Vue d'ensemble",
      icon: <LayoutDashboard className="w-4 h-4" />,
    },
    {
      href: `/dashboard/${guildId}/welcome`,
      label: "Accueil & Départ",
      icon: <Sparkles className="w-4 h-4" />,
    },
    {
      href: `/dashboard/${guildId}/moderation`,
      label: "Modération",
      icon: <Shield className="w-4 h-4" />,
    },
    {
      href: `/dashboard/${guildId}/logs`,
      label: "Salons de Logs",
      icon: <Radio className="w-4 h-4" />,
    },
    {
      href: `/dashboard/${guildId}/tickets`,
      label: "Système de Tickets",
      icon: <Ticket className="w-4 h-4" />,
    },
    {
      href: `/dashboard/${guildId}/levels`,
      label: "Niveaux & XP",
      icon: <Trophy className="w-4 h-4" />,
    },
    {
      href: `/dashboard/${guildId}/reaction-roles`,
      label: "Rôles par Réaction",
      icon: <Sliders className="w-4 h-4" />,
    },
  ];

  return (
    <aside className="w-64 border-r border-zinc-800 bg-zinc-950/50 p-4 flex flex-col justify-between shrink-0">
      <div className="space-y-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-200 transition"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Changer de serveur</span>
        </Link>

        <div className="flex items-center gap-3 px-2 py-1">
          <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-zinc-700/60 flex items-center justify-center font-bold text-sm text-zinc-200">
            {guildName.slice(0, 2).toUpperCase()}
          </div>
          <div className="truncate">
            <h2 className="text-sm font-semibold text-zinc-100 truncate">{guildName}</h2>
            <span className="text-[11px] text-zinc-400 font-mono">ID: {guildId.slice(0, 8)}...</span>
          </div>
        </div>

        <nav className="space-y-1">
          {links.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition ${
                  isActive
                    ? "bg-amber-500/10 text-amber-400 border border-amber-500/30 font-semibold"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
                }`}
              >
                <span className={isActive ? "text-amber-400" : "text-zinc-400"}>{link.icon}</span>
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="pt-4 border-t border-zinc-900 text-xs text-zinc-500">
        <p>Bloomera Bot &bull; Ambiance Soleil</p>
      </div>
    </aside>
  );
}
