"use client";

import React, { useState } from "react";
import { Trophy, Save, Check, Award } from "lucide-react";

export default function LevelsConfigPage({ params }: { params: { guildId: string } }) {
  const [enabled, setEnabled] = useState(true);
  const [minXp, setMinXp] = useState(15);
  const [maxXp, setMaxXp] = useState(25);
  const [cooldown, setCooldown] = useState(60);
  const [announceMsg, setAnnounceMsg] = useState(
    "Bravo {user} ! Tu passes au niveau **{level}** ! 🎉"
  );
  const [announceChannel, setAnnounceChannel] = useState("current");
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const topUsers = [
    { rank: 1, name: "Alexandre", level: 24, xp: "14,850", avatar: "A" },
    { rank: 2, name: "Sophie", level: 19, xp: "9,420", avatar: "S" },
    { rank: 3, name: "Maxime", level: 18, xp: "8,900", avatar: "M" },
    { rank: 4, name: "Camille", level: 12, xp: "4,120", avatar: "C" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Système de Niveaux & Expérience (XP)</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Encouragez l'engagement en attribuant de l'expérience aux membres qui participent dans les salons de discussion.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="rounded-2xl bg-zinc-900/40 border border-zinc-800 p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-400" />
              <h2 className="text-base font-semibold text-white">Activer le module de niveaux</h2>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          {enabled && (
            <div className="space-y-4 pt-4 border-t border-zinc-800">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    XP minimum par message
                  </label>
                  <input
                    type="number"
                    value={minXp}
                    onChange={(e) => setMinXp(Number(e.target.value))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    XP maximum par message
                  </label>
                  <input
                    type="number"
                    value={maxXp}
                    onChange={(e) => setMaxXp(Number(e.target.value))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Délai anti-spam entre deux gains (secondes)
                </label>
                <input
                  type="number"
                  value={cooldown}
                  onChange={(e) => setCooldown(Number(e.target.value))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-600"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Salon d'annonce de montée de niveau
                </label>
                <select
                  value={announceChannel}
                  onChange={(e) => setAnnounceChannel(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-600"
                >
                  <option value="current">Même salon où le membre discute</option>
                  <option value="levels">#🏆-level-up</option>
                  <option value="general">#general</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Message de montée de niveau
                </label>
                <input
                  type="text"
                  value={announceMsg}
                  onChange={(e) => setAnnounceMsg(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-600 font-mono text-xs"
                />
                <p className="text-[11px] text-zinc-500 mt-1">
                  Variables : <code>{"{user}"}</code>, <code>{"{level}"}</code>, <code>{"{server}"}</code>
                </p>
              </div>
            </div>
          )}

          <div className="pt-2 flex justify-end">
            <button
              onClick={handleSave}
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 font-medium text-sm transition"
            >
              {saved ? <Check className="w-4 h-4 text-emerald-600" /> : <Save className="w-4 h-4" />}
              <span>{saved ? "Modifications enregistrées !" : "Enregistrer les paramètres"}</span>
            </button>
          </div>
        </div>

        {/* Classement Leaderboard Preview */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            <Award className="w-4 h-4" />
            <span>Aperçu du Classement des Membres</span>
          </div>

          <div className="rounded-2xl bg-zinc-900/40 border border-zinc-800 p-5 space-y-3">
            {topUsers.map((user) => (
              <div
                key={user.rank}
                className="flex items-center justify-between p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/60"
              >
                <div className="flex items-center gap-3">
                  <span className="font-bold text-sm text-zinc-400 w-5">
                    {user.rank === 1 ? "🥇" : user.rank === 2 ? "🥈" : user.rank === 3 ? "🥉" : `#${user.rank}`}
                  </span>
                  <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-200">
                    {user.avatar}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-zinc-100">{user.name}</p>
                    <p className="text-[11px] text-zinc-500">{user.xp} XP au total</p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-bold font-mono">
                    NIV. {user.level}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
