"use client";

import React, { useState } from "react";
import { Radio, Save, Check, FileText, UserCheck, MessageSquare, Mic } from "lucide-react";

export default function LogsConfigPage({ params }: { params: { guildId: string } }) {
  const [enabled, setEnabled] = useState(true);
  const [modLog, setModLog] = useState("logs-moderation");
  const [msgLog, setMsgLog] = useState("logs-messages");
  const [memberLog, setMemberLog] = useState("logs-membres");
  const [voiceLog, setVoiceLog] = useState("none");
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Salons de Journalisation (Logs)</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Surveillez tout ce qui se passe sur votre serveur en temps réel dans les salons de votre choix.
        </p>
      </div>

      <div className="rounded-2xl bg-zinc-900/40 border border-zinc-800 p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base font-semibold text-white">Activer le système de logs</h2>
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
          <div className="space-y-6 pt-4 border-t border-zinc-800">
            {/* Log Modération */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/60">
              <div className="flex items-start gap-3">
                <FileText className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium text-white">Logs de Modération</h3>
                  <p className="text-xs text-zinc-400">
                    Avertissements, expulsions, exclusions temporaires, bannissements et purges de salon.
                  </p>
                </div>
              </div>
              <select
                value={modLog}
                onChange={(e) => setModLog(e.target.value)}
                className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-zinc-600 sm:w-52"
              >
                <option value="none">Désactivé</option>
                <option value="logs-moderation">#🛡️-logs-moderation</option>
                <option value="staff-logs">#staff-logs</option>
              </select>
            </div>

            {/* Log Messages */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/60">
              <div className="flex items-start gap-3">
                <MessageSquare className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium text-white">Logs des Messages</h3>
                  <p className="text-xs text-zinc-400">
                    Messages supprimés et modifications (avec contenu avant/après et lien direct).
                  </p>
                </div>
              </div>
              <select
                value={msgLog}
                onChange={(e) => setMsgLog(e.target.value)}
                className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-zinc-600 sm:w-52"
              >
                <option value="none">Désactivé</option>
                <option value="logs-messages">#💬-logs-messages</option>
                <option value="general-logs">#general-logs</option>
              </select>
            </div>

            {/* Log Membres */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/60">
              <div className="flex items-start gap-3">
                <UserCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium text-white">Logs des Membres</h3>
                  <p className="text-xs text-zinc-400">
                    Arrivées, départs, changements de pseudo et ajouts/retraits de rôles.
                  </p>
                </div>
              </div>
              <select
                value={memberLog}
                onChange={(e) => setMemberLog(e.target.value)}
                className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-zinc-600 sm:w-52"
              >
                <option value="none">Désactivé</option>
                <option value="logs-membres">#👥-logs-membres</option>
                <option value="arrivees-departs">#arrivees-departs</option>
              </select>
            </div>

            {/* Log Vocal */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/60">
              <div className="flex items-start gap-3">
                <Mic className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium text-white">Logs Vocaux</h3>
                  <p className="text-xs text-zinc-400">
                    Connexions, déconnexions et déplacements entre salons vocaux.
                  </p>
                </div>
              </div>
              <select
                value={voiceLog}
                onChange={(e) => setVoiceLog(e.target.value)}
                className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-zinc-600 sm:w-52"
              >
                <option value="none">Désactivé</option>
                <option value="logs-vocal">#🔊-logs-vocal</option>
              </select>
            </div>
          </div>
        )}

        <div className="pt-2 flex justify-end">
          <button
            onClick={handleSave}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 font-medium text-sm transition"
          >
            {saved ? <Check className="w-4 h-4 text-emerald-600" /> : <Save className="w-4 h-4" />}
            <span>{saved ? "Modifications enregistrées !" : "Enregistrer les salons de logs"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
