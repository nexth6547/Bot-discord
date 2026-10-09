"use client";

import React, { useEffect, useState } from "react";
import { Award, Check, Save, Trophy } from "lucide-react";

interface LevelSettings {
  enabled: boolean;
  xpPerMessageMin: number;
  xpPerMessageMax: number;
  cooldownSeconds: number;
  announceChannelId: string | null;
  announceMessage: string;
}

interface LeaderboardEntry {
  userId: string;
  userTag: string | null;
  avatarUrl: string | null;
  xp: number;
  level: number;
}

interface LevelsResponse {
  config: LevelSettings;
  leaderboard: LeaderboardEntry[];
}

interface GuildResources {
  channels: Array<{ id: string; name: string; type: number }>;
}

const defaultSettings: LevelSettings = {
  enabled: true,
  xpPerMessageMin: 15,
  xpPerMessageMax: 25,
  cooldownSeconds: 60,
  announceChannelId: null,
  announceMessage: "Bravo {user} ! Tu as atteint le niveau **{level}** ! 🎉",
};

const errorMessages: Record<string, string> = {
  INVALID_CONFIG: "Les paramètres XP sont invalides. Vérifiez les valeurs minimum et maximum.",
  INVALID_CHANNEL_ID: "Le salon sélectionné n'existe plus sur ce serveur.",
  INVALID_CHANNEL_TYPE: "Le salon d'annonce sélectionné n'est pas un salon textuel valide.",
  BOT_MISSING_CHANNEL_PERMISSIONS: "Le bot ne peut pas voir ou écrire dans le salon d'annonce.",
  SESSION_EXPIRED: "Votre session Discord a expiré. Reconnectez-vous.",
  DISCORD_UNAVAILABLE: "Discord ne répond pas actuellement. Réessayez plus tard.",
};

export default function LevelsConfigPage({
  params,
}: {
  params: { guildId: string };
}) {
  const [settings, setSettings] = useState<LevelSettings>(defaultSettings);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [channels, setChannels] = useState<GuildResources["channels"]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const [levelsResponse, resourcesResponse] = await Promise.all([
          fetch(`/api/guilds/${params.guildId}/levels`, { cache: "no-store" }),
          fetch(`/api/guilds/${params.guildId}/resources`, { cache: "no-store" }),
        ]);
        if (!levelsResponse.ok || !resourcesResponse.ok) {
          throw new Error("Les paramètres de niveaux et les ressources Discord n'ont pas pu être chargés.");
        }
        const [result, resources] = await Promise.all([
          levelsResponse.json() as Promise<LevelsResponse>,
          resourcesResponse.json() as Promise<GuildResources>,
        ]);
        if (!active) return;
        setSettings(result.config);
        setLeaderboard(result.leaderboard);
        setChannels(resources.channels.filter((channel) => channel.type !== 4));
      } catch (loadError) {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Les paramètres de niveaux n'ont pas pu être chargés."
          );
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

  const update = <K extends keyof LevelSettings>(key: K, value: LevelSettings[K]) => {
    setSettings((current) => ({ ...current, [key]: value }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    setError("");
    try {
      const response = await fetch(`/api/guilds/${params.guildId}/levels`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (!response.ok) {
        const result: { error?: string } | null = await response.json().catch(() => null);
        throw new Error(
          (result?.error && errorMessages[result.error]) || "L'enregistrement des paramètres a échoué."
        );
      }
      setSettings((await response.json()) as LevelSettings);
      setSaved(true);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "L'enregistrement a échoué.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">
          Système de Niveaux & Expérience (XP)
        </h1>
        <p className="text-sm text-zinc-400 mt-1">
          Paramétrez le gain d'expérience et consultez le classement enregistré pour ce serveur.
        </p>
      </div>

      {loading ? <p className="text-sm text-zinc-400">Chargement des paramètres et données XP…</p> : null}
      {error ? <p role="alert" className="text-sm text-rose-400">{error}</p> : null}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="rounded-2xl bg-zinc-900/40 border border-zinc-800 p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-400" />
              <h2 className="text-base font-semibold text-white">Activer le module de niveaux</h2>
            </div>
            <input
              aria-label="Activer le module de niveaux"
              type="checkbox"
              checked={settings.enabled}
              onChange={(event) => update("enabled", event.target.checked)}
              className="h-4 w-4 rounded border-zinc-700 bg-zinc-950 text-amber-500"
            />
          </div>

          <div className="space-y-4 border-t border-zinc-800 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <label className="text-xs font-medium text-zinc-300">
                XP minimum par message
                <input
                  type="number"
                  min={1}
                  max={1000}
                  value={settings.xpPerMessageMin}
                  onChange={(event) => update("xpPerMessageMin", Number(event.target.value))}
                  className="mt-1.5 w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-zinc-200"
                />
              </label>
              <label className="text-xs font-medium text-zinc-300">
                XP maximum par message
                <input
                  type="number"
                  min={1}
                  max={1000}
                  value={settings.xpPerMessageMax}
                  onChange={(event) => update("xpPerMessageMax", Number(event.target.value))}
                  className="mt-1.5 w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-zinc-200"
                />
              </label>
            </div>

            <label className="block text-xs font-medium text-zinc-300">
              Délai anti-spam entre deux gains (secondes)
              <input
                type="number"
                min={0}
                max={86400}
                value={settings.cooldownSeconds}
                onChange={(event) => update("cooldownSeconds", Number(event.target.value))}
                className="mt-1.5 w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-zinc-200"
              />
            </label>

            <label className="block text-xs font-medium text-zinc-300">
              Salon d'annonce de montée de niveau
              <select
                value={settings.announceChannelId ?? ""}
                onChange={(event) => update("announceChannelId", event.target.value || null)}
                className="mt-1.5 w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-zinc-200"
              >
                <option value="">Même salon que le membre</option>
                {channels.map((channel) => (
                  <option key={channel.id} value={channel.id}>#{channel.name}</option>
                ))}
              </select>
            </label>

            <label className="block text-xs font-medium text-zinc-300">
              Message de montée de niveau
              <input
                type="text"
                maxLength={2000}
                value={settings.announceMessage}
                onChange={(event) => update("announceMessage", event.target.value)}
                className="mt-1.5 w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-zinc-200 font-mono"
              />
              <span className="mt-1 block text-[11px] text-zinc-500">
                Variables : {"{user}"}, {"{level}"}, {"{server}"}
              </span>
            </label>
          </div>

          <div className="flex justify-end border-t border-zinc-800 pt-4">
            <button
              onClick={handleSave}
              disabled={loading || saving || Boolean(error)}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-zinc-100 hover:bg-white disabled:opacity-50 text-zinc-950 font-medium text-sm transition"
            >
              {saved ? <Check className="w-4 h-4 text-emerald-600" /> : <Save className="w-4 h-4" />}
              <span>{saving ? "Enregistrement…" : saved ? "Paramètres enregistrés" : "Enregistrer les paramètres"}</span>
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            <Award className="w-4 h-4" />
            <span>Classement réel des membres</span>
          </div>
          <div className="rounded-2xl bg-zinc-900/40 border border-zinc-800 p-5 space-y-3">
            {loading ? (
              <p className="text-sm text-zinc-400">Chargement du classement…</p>
            ) : leaderboard.length === 0 ? (
              <p className="text-sm text-zinc-400">Aucune donnée XP enregistrée pour ce serveur.</p>
            ) : (
              leaderboard.map((user, index) => (
                <div
                  key={user.userId}
                  className="flex items-center justify-between gap-3 p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/60"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="font-bold text-sm text-zinc-400 w-7">#{index + 1}</span>
                    {user.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={user.avatarUrl} alt="" className="h-8 w-8 rounded-full" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-200">
                        {(user.userTag ?? user.userId).slice(0, 1).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-zinc-100">
                        {user.userTag ?? user.userId}
                      </p>
                      <p className="text-[11px] text-zinc-500">
                        {user.xp.toLocaleString("fr-FR")} XP
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-bold font-mono">
                    NIV. {user.level}
                  </span>
                </div>
              ))
            )}
          </div>
          <p className="text-[11px] text-zinc-500">Classement des 50 comptes les plus expérimentés, fourni par la base de données.</p>
        </div>
      </div>
    </div>
  );
}
