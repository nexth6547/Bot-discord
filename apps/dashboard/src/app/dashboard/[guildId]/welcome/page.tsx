"use client";

import React, { useState } from "react";
import { Sparkles, Save, Check, Eye } from "lucide-react";

export default function WelcomeConfigPage({ params }: { params: { guildId: string } }) {
  const [enabled, setEnabled] = useState(true);
  const [channel, setChannel] = useState("general");
  const [title, setTitle] = useState("Bienvenue sur le serveur !");
  const [message, setMessage] = useState(
    "Bienvenue {user} sur **{server}** ! N'hésite pas à lire le règlement et à choisir tes rôles. Nous sommes maintenant {count} membres !"
  );
  const [color, setColor] = useState("#5865F2");
  const [autoRole, setAutoRole] = useState("membre");

  const [leaveEnabled, setLeaveEnabled] = useState(true);
  const [leaveMessage, setLeaveMessage] = useState(
    "Au revoir {user}... Nous espérons te revoir bientôt sur {server} !"
  );

  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  // Preview formatting
  const previewText = message
    .replace("{user}", "@NouveauMembre")
    .replace("{server}", "Mon Serveur Discord")
    .replace("{count}", "143");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Messages d'Accueil & Départ</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Configurez l'accueil automatique des nouveaux membres avec un message ou un embed soigné.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Formulaire de configuration */}
        <div className="space-y-6">
          {/* Module Bienvenue */}
          <div className="rounded-2xl bg-zinc-900/40 border border-zinc-800 p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-400" />
                <h2 className="text-base font-semibold text-white">Message de Bienvenue</h2>
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
              <>
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    Salon d'envoi
                  </label>
                  <select
                    value={channel}
                    onChange={(e) => setChannel(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-600"
                  >
                    <option value="general">#💬-bienvenue</option>
                    <option value="general-chat">#general</option>
                    <option value="arrivees">#👋-arrivees-departs</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    Titre de l'Embed
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    Message d'accueil
                  </label>
                  <textarea
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-zinc-600 font-mono text-xs"
                  />
                  <p className="text-[11px] text-zinc-500 mt-1">
                    Variables : <code>{"{user}"}</code>, <code>{"{server}"}</code>, <code>{"{count}"}</code>
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                      Couleur de bordure
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                        className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                      />
                      <span className="text-xs font-mono text-zinc-400">{color}</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                      Rôle automatique (Auto-rôle)
                    </label>
                    <select
                      value={autoRole}
                      onChange={(e) => setAutoRole(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-600"
                    >
                      <option value="none">Aucun</option>
                      <option value="membre">@Membre</option>
                      <option value="citoyen">@Citoyen</option>
                    </select>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Module Au revoir */}
          <div className="rounded-2xl bg-zinc-900/40 border border-zinc-800 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-white">Message de Départ (Au revoir)</h2>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={leaveEnabled}
                  onChange={(e) => setLeaveEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            {leaveEnabled && (
              <div>
                <textarea
                  rows={2}
                  value={leaveMessage}
                  onChange={(e) => setLeaveMessage(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-600 font-mono text-xs"
                />
              </div>
            )}
          </div>

          <button
            onClick={handleSave}
            className="w-full inline-flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 font-semibold text-sm transition"
          >
            {saved ? <Check className="w-4 h-4 text-emerald-600" /> : <Save className="w-4 h-4" />}
            <span>{saved ? "Paramètres enregistrés !" : "Sauvegarder les modifications"}</span>
          </button>
        </div>

        {/* Prévisualisation en direct façon Discord */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            <Eye className="w-4 h-4" />
            <span>Aperçu Discord en direct</span>
          </div>

          <div className="bg-[#313338] rounded-xl p-5 border border-zinc-800 text-zinc-200 shadow-xl font-sans">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center font-bold text-white text-sm">
                BOT
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-white text-sm">DiscordBot</span>
                  <span className="bg-[#5865F2] text-[10px] text-white font-bold px-1.5 py-0.5 rounded">
                    BOT
                  </span>
                  <span className="text-[11px] text-zinc-400">Aujourd'hui à 20:00</span>
                </div>
                <span className="text-xs text-indigo-400">@NouveauMembre</span>
              </div>
            </div>

            {/* Embed box */}
            <div
              className="bg-[#2b2d31] rounded-lg p-4 border-l-4 space-y-2 text-sm"
              style={{ borderLeftColor: color }}
            >
              <h4 className="font-bold text-white text-base">{title}</h4>
              <p className="text-zinc-300 text-xs sm:text-sm leading-relaxed whitespace-pre-line">
                {previewText}
              </p>
              <div className="pt-2 border-t border-zinc-700/40 text-[11px] text-zinc-400">
                Nous sommes maintenant 143 membres !
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
