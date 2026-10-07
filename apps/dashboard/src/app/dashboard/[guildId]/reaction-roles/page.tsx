"use client";

import React, { useState } from "react";
import { Sliders, Plus, Trash2, Check, Save } from "lucide-react";

export default function ReactionRolesPage({ params }: { params: { guildId: string } }) {
  const [roles, setRoles] = useState([
    {
      id: "1",
      channel: "#💬-choix-roles",
      role: "@Notifs Annonces",
      emoji: "🔔",
      label: "Recevoir les annonces",
    },
    {
      id: "2",
      channel: "#💬-choix-roles",
      role: "@Joueur Valorant",
      emoji: "🎮",
      label: "Joueur Valorant",
    },
    {
      id: "3",
      channel: "#💬-choix-roles",
      role: "@Développeur",
      emoji: "💻",
      label: "Rôle Développeur",
    },
  ]);

  const [channel, setChannel] = useState("choix-roles");
  const [selectedRole, setSelectedRole] = useState("gaming");
  const [emoji, setEmoji] = useState("🎯");
  const [label, setLabel] = useState("Nouveau Rôle");

  const [saved, setSaved] = useState(false);

  const handleAdd = () => {
    if (!label) return;
    setRoles([
      ...roles,
      {
        id: Date.now().toString(),
        channel: `#${channel}`,
        role: `@${selectedRole}`,
        emoji,
        label,
      },
    ]);
    setLabel("");
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleDelete = (id: string) => {
    setRoles(roles.filter((r) => r.id !== id));
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Rôles par Réaction / Boutons</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Permettez à vos membres de s'attribuer ou se retirer des rôles en un clic sur un bouton Discord.
        </p>
      </div>

      {/* Créateur de rôle */}
      <div className="rounded-2xl bg-zinc-900/40 border border-zinc-800 p-6 space-y-6">
        <div className="flex items-center gap-2">
          <Sliders className="w-5 h-5 text-indigo-400" />
          <h2 className="text-base font-semibold text-white">Ajouter un Bouton de Rôle</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Salon d'envoi du message
            </label>
            <select
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-600"
            >
              <option value="choix-roles">#💬-choix-roles</option>
              <option value="general">#general</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Rôle à attribuer
            </label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-600"
            >
              <option value="gaming">@Joueur Actif</option>
              <option value="notifs">@Notifications</option>
              <option value="evenements">@Événements</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Emoji sur le bouton
            </label>
            <input
              type="text"
              value={emoji}
              onChange={(e) => setEmoji(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-600"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Texte du bouton
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="ex: Obtenir le rôle Gaming"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-600"
            />
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            onClick={handleAdd}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 font-medium text-sm transition"
          >
            {saved ? <Check className="w-4 h-4 text-emerald-600" /> : <Plus className="w-4 h-4" />}
            <span>Créer le bouton de rôle</span>
          </button>
        </div>
      </div>

      {/* Liste des rôles configurés */}
      <div className="rounded-2xl bg-zinc-900/40 border border-zinc-800 p-6 space-y-4">
        <h2 className="text-base font-semibold text-white">Boutons de Rôles Actifs</h2>

        <div className="space-y-3">
          {roles.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/60"
            >
              <div className="flex items-center gap-4">
                <span className="text-xl">{item.emoji}</span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-zinc-100">{item.label}</span>
                    <span className="px-2 py-0.5 rounded bg-zinc-800 text-[11px] text-zinc-300 font-medium">
                      {item.role}
                    </span>
                  </div>
                  <span className="text-xs text-zinc-500 font-mono">Salon : {item.channel}</span>
                </div>
              </div>

              <button
                onClick={() => handleDelete(item.id)}
                className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
                title="Supprimer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
