"use client";

import React, { useState } from "react";
import { Ticket, Save, Check, Eye, MessageSquarePlus } from "lucide-react";

export default function TicketsConfigPage({ params }: { params: { guildId: string } }) {
  const [enabled, setEnabled] = useState(true);
  const [category, setCategory] = useState("tickets-cat");
  const [supportRole, setSupportRole] = useState("support");
  const [panelTitle, setPanelTitle] = useState("📩 Centre d'assistance & Support");
  const [panelDesc, setPanelDesc] = useState(
    "Un problème ou une question ?\nCliquez sur le bouton ci-dessous pour ouvrir un salon privé avec l'équipe de modération."
  );
  const [buttonText, setButtonText] = useState("Ouvrir un ticket");
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Système de Tickets de Support</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Permet à vos membres de contacter l'équipe en toute confidentialité via des salons textuels temporaires.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="rounded-2xl bg-zinc-900/40 border border-zinc-800 p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Ticket className="w-5 h-5 text-indigo-400" />
              <h2 className="text-base font-semibold text-white">Activer le module de tickets</h2>
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
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Catégorie Discord où créer les tickets
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-600"
                >
                  <option value="tickets-cat">📁 TICKETS SUPPORT</option>
                  <option value="general-cat">📁 ASSISTANCE</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Rôle de Support habilité
                </label>
                <select
                  value={supportRole}
                  onChange={(e) => setSupportRole(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-600"
                >
                  <option value="support">@Équipe Support</option>
                  <option value="mod">@Modérateur</option>
                  <option value="admin">@Administrateur</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Titre du panneau
                </label>
                <input
                  type="text"
                  value={panelTitle}
                  onChange={(e) => setPanelTitle(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-600"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Description du panneau
                </label>
                <textarea
                  rows={3}
                  value={panelDesc}
                  onChange={(e) => setPanelDesc(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-600 font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Libellé du Bouton
                </label>
                <input
                  type="text"
                  value={buttonText}
                  onChange={(e) => setButtonText(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-600"
                />
              </div>
            </div>
          )}

          <div className="pt-2 flex justify-end">
            <button
              onClick={handleSave}
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 font-medium text-sm transition"
            >
              {saved ? <Check className="w-4 h-4 text-emerald-600" /> : <Save className="w-4 h-4" />}
              <span>{saved ? "Modifications enregistrées !" : "Enregistrer la configuration"}</span>
            </button>
          </div>
        </div>

        {/* Aperçu Discord */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            <Eye className="w-4 h-4" />
            <span>Aperçu du Panneau Discord</span>
          </div>

          <div className="bg-[#313338] rounded-xl p-5 border border-zinc-800 text-zinc-200 shadow-xl font-sans">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center font-bold text-white text-sm">
                BOT
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white text-sm">DiscordBot</span>
                <span className="bg-[#5865F2] text-[10px] text-white font-bold px-1.5 py-0.5 rounded">
                  BOT
                </span>
              </div>
            </div>

            <div className="bg-[#2b2d31] rounded-lg p-4 border-l-4 border-[#5865F2] space-y-2 mb-4">
              <h4 className="font-bold text-white text-base">{panelTitle}</h4>
              <p className="text-zinc-300 text-xs sm:text-sm whitespace-pre-line leading-relaxed">
                {panelDesc}
              </p>
            </div>

            {/* Button */}
            <div>
              <button
                type="button"
                className="inline-flex items-center gap-2 bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs font-medium px-4 py-2 rounded transition cursor-not-allowed opacity-90"
              >
                <span>📩</span>
                <span>{buttonText}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
