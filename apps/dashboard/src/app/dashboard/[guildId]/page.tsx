"use client";

import React, { useState } from "react";
import { Users, Ticket, ShieldAlert, Award, Save, Check } from "lucide-react";

export default function GuildOverviewPage({ params }: { params: { guildId: string } }) {
  const [prefix, setPrefix] = useState("!");
  const [language, setLanguage] = useState("fr");
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Vue d'ensemble</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Statistiques générales et paramètres de base du serveur.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800">
          <div className="flex items-center gap-2 text-zinc-400 text-xs">
            <Users className="w-4 h-4" />
            <span>Membres</span>
          </div>
          <p className="text-2xl font-bold text-white mt-2">142</p>
        </div>

        <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800">
          <div className="flex items-center gap-2 text-zinc-400 text-xs">
            <ShieldAlert className="w-4 h-4" />
            <span>Sanctions</span>
          </div>
          <p className="text-2xl font-bold text-white mt-2">12</p>
        </div>

        <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800">
          <div className="flex items-center gap-2 text-zinc-400 text-xs">
            <Ticket className="w-4 h-4" />
            <span>Tickets Actifs</span>
          </div>
          <p className="text-2xl font-bold text-white mt-2">3</p>
        </div>

        <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800">
          <div className="flex items-center gap-2 text-zinc-400 text-xs">
            <Award className="w-4 h-4" />
            <span>Membres avec XP</span>
          </div>
          <p className="text-2xl font-bold text-white mt-2">98</p>
        </div>
      </div>

      {/* General Settings Card */}
      <div className="rounded-2xl bg-zinc-900/40 border border-zinc-800 p-6 space-y-6">
        <h2 className="text-lg font-semibold text-white">Paramètres Généraux</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-2">
              Préfixe des commandes texte
            </label>
            <input
              type="text"
              value={prefix}
              onChange={(e) => setPrefix(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-600"
            />
            <p className="text-xs text-zinc-500 mt-1.5">
              Les commandes slash (<code>/</code>) restent toujours actives.
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-2">
              Langue du Bot
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-600"
            >
              <option value="fr">Français</option>
              <option value="en">English</option>
            </select>
          </div>
        </div>

        <div className="pt-4 border-t border-zinc-800/80 flex justify-end">
          <button
            onClick={handleSave}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 font-medium text-sm transition"
          >
            {saved ? <Check className="w-4 h-4 text-emerald-600" /> : <Save className="w-4 h-4" />}
            <span>{saved ? "Modifications enregistrées !" : "Enregistrer"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
