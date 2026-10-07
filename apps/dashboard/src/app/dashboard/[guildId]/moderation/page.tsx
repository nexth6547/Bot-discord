"use client";

import React, { useState } from "react";
import { Shield, Save, Check, AlertTriangle, UserX, Clock, Ban } from "lucide-react";

export default function ModerationConfigPage({ params }: { params: { guildId: string } }) {
  const [modRole, setModRole] = useState("mod");
  const [muteRole, setMuteRole] = useState("muted");
  const [antiLink, setAntiLink] = useState(true);
  const [antiSpam, setAntiSpam] = useState(false);
  const [saved, setSaved] = useState(false);

  const [sanctions] = useState([
    {
      id: "1",
      user: "Spammer#1234",
      moderator: "Admin#0001",
      type: "WARN",
      reason: "Spam d'invitations Discord",
      date: "23/09/2026 à 18:30",
    },
    {
      id: "2",
      user: "Troll#4567",
      moderator: "Modo#0002",
      type: "MUTE",
      reason: "Insultes répétées dans #general",
      date: "22/09/2026 à 14:15",
    },
    {
      id: "3",
      user: "BotAttacker#9999",
      moderator: "Admin#0001",
      type: "BAN",
      reason: "Tentative de raid",
      date: "20/09/2026 à 02:40",
    },
  ]);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const getBadge = (type: string) => {
    switch (type) {
      case "WARN":
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/20 text-amber-400">WARN</span>;
      case "MUTE":
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-fuchsia-500/20 text-fuchsia-400">MUTE</span>;
      case "KICK":
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-orange-500/20 text-orange-400">KICK</span>;
      case "BAN":
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-red-500/20 text-red-400">BAN</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Modération & Sécurité</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Configurez les rôles habilités et les règles de protection automatique.
        </p>
      </div>

      <div className="rounded-2xl bg-zinc-900/40 border border-zinc-800 p-6 space-y-6">
        <h2 className="text-base font-semibold text-white">Rôles de Modération</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Rôle Modérateur (accès aux commandes /warn, /timeout, etc.)
            </label>
            <select
              value={modRole}
              onChange={(e) => setModRole(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-600"
            >
              <option value="mod">@Modérateur</option>
              <option value="admin">@Administrateur</option>
              <option value="staff">@Staff</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Rôle Muet / Muted (optionnel si Timeout natif utilisé)
            </label>
            <select
              value={muteRole}
              onChange={(e) => setMuteRole(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-600"
            >
              <option value="muted">@Muted</option>
              <option value="silence">@Silence</option>
            </select>
          </div>
        </div>

        <h2 className="text-base font-semibold text-white pt-4 border-t border-zinc-800/80">
          Auto-Modération (Filtres automatiques)
        </h2>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/60">
            <div>
              <h3 className="text-sm font-medium text-white">Anti-Liens & Anti-Invitations</h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Supprime automatiquement les liens d'invitations Discord et URLs postées par les non-staffs.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={antiLink}
                onChange={(e) => setAntiLink(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/60">
            <div>
              <h3 className="text-sm font-medium text-white">Anti-Spam Rapide</h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Mute temporairement un membre s'il envoie plus de 5 messages en 3 secondes.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={antiSpam}
                onChange={(e) => setAntiSpam(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            onClick={handleSave}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 font-medium text-sm transition"
          >
            {saved ? <Check className="w-4 h-4 text-emerald-600" /> : <Save className="w-4 h-4" />}
            <span>{saved ? "Modifications enregistrées !" : "Enregistrer la configuration"}</span>
          </button>
        </div>
      </div>

      {/* Historique des sanctions récentes */}
      <div className="rounded-2xl bg-zinc-900/40 border border-zinc-800 p-6 space-y-4">
        <h2 className="text-base font-semibold text-white">Dernières Sanctions Appliquées</h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-zinc-800 text-zinc-400">
              <tr>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Membre</th>
                <th className="py-2.5 px-3">Modérateur</th>
                <th className="py-2.5 px-3">Raison</th>
                <th className="py-2.5 px-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
              {sanctions.map((s) => (
                <tr key={s.id} className="hover:bg-zinc-900/40 transition">
                  <td className="py-3 px-3">{getBadge(s.type)}</td>
                  <td className="py-3 px-3 font-medium text-zinc-200">{s.user}</td>
                  <td className="py-3 px-3 text-zinc-400">{s.moderator}</td>
                  <td className="py-3 px-3 max-w-xs truncate">{s.reason}</td>
                  <td className="py-3 px-3 text-zinc-500 font-mono text-[11px]">{s.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
