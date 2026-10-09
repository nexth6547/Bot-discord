"use client";

import React, { useEffect, useState } from "react";
import { Award, ShieldAlert, Ticket, Users } from "lucide-react";

interface OverviewResponse {
  stats: {
    approximateMembers: number | null;
    sanctions: number;
    openTickets: number;
    membersWithXp: number;
  };
  sources: {
    approximateMembers: string;
    sanctions: string;
    openTickets: string;
    membersWithXp: string;
  };
  refreshedAt: string;
}

const cards = [
  { key: "approximateMembers", label: "Membres (estimation)", icon: Users },
  { key: "sanctions", label: "Sanctions enregistrées", icon: ShieldAlert },
  { key: "openTickets", label: "Tickets ouverts", icon: Ticket },
  { key: "membersWithXp", label: "Membres avec XP", icon: Award },
] as const;

const apiErrors: Record<string, string> = {
  DISCORD_UNAVAILABLE: "Discord n'a pas pu fournir le nombre de membres. Réessayez plus tard.",
  SESSION_EXPIRED: "Votre session Discord a expiré. Reconnectez-vous.",
  BOT_NOT_IN_GUILD: "Le bot n'est plus présent sur ce serveur.",
};

export default function GuildOverviewPage({
  params,
}: {
  params: { guildId: string };
}) {
  const [data, setData] = useState<OverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const response = await fetch(`/api/guilds/${params.guildId}/overview`, {
          cache: "no-store",
        });
        if (!response.ok) {
          const result: { error?: string } | null = await response.json().catch(() => null);
          throw new Error(
            (result?.error && apiErrors[result.error]) ||
              "Les statistiques du serveur n'ont pas pu être chargées."
          );
        }
        const overview = (await response.json()) as OverviewResponse;
        if (active) setData(overview);
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : "Le chargement a échoué.");
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [params.guildId]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Vue d'ensemble</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Statistiques actualisées depuis Discord et la base de données du bot.
        </p>
      </div>

      {loading ? <p className="text-sm text-zinc-400">Chargement des statistiques…</p> : null}
      {error ? <p role="alert" className="text-sm text-rose-400">{error}</p> : null}

      {data ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {cards.map(({ key, label, icon: Icon }) => {
              const value = data.stats[key];
              const source = data.sources[key];
              return (
                <div key={key} className="p-5 rounded-xl bg-zinc-900/60 border border-zinc-800">
                  <div className="flex items-center gap-2 text-zinc-400 text-xs">
                    <Icon className="w-4 h-4" />
                    <span>{label}</span>
                  </div>
                  <p className="text-2xl font-bold text-white mt-2">
                    {value === null ? "Indisponible" : value.toLocaleString("fr-FR")}
                  </p>
                  <p className="mt-2 text-[11px] text-zinc-500">Source : {source}</p>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-zinc-500">
            Actualisé le {new Date(data.refreshedAt).toLocaleString("fr-FR")}. Le nombre de membres est une estimation fournie par Discord.
          </p>
        </>
      ) : null}

      <div className="rounded-2xl bg-zinc-900/40 border border-zinc-800 p-6">
        <h2 className="text-base font-semibold text-white">Réglages généraux</h2>
        <p className="mt-2 text-sm text-zinc-400">
          Les commandes disponibles sont des commandes slash. Le préfixe de commandes texte et la langue ne sont pas encore appliqués par le bot ; ces réglages ne sont donc pas proposés ici pour éviter de suggérer qu'ils fonctionnent.
        </p>
      </div>
    </div>
  );
}
