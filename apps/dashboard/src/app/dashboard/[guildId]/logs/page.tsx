"use client";

import React, { useEffect, useState } from "react";
import {
  Check,
  FileText,
  MessageSquare,
  Mic,
  Radio,
  Save,
  UserCheck,
  Users,
} from "lucide-react";

interface LogSettings {
  enabled: boolean;
  modLogChannelId: string | null;
  messageLogChannelId: string | null;
  memberLogChannelId: string | null;
  voiceLogChannelId: string | null;
  roleLogChannelId: string | null;
}

interface GuildResources {
  channels: Array<{ id: string; name: string; type: number }>;
}

const initialSettings: LogSettings = {
  enabled: false,
  modLogChannelId: null,
  messageLogChannelId: null,
  memberLogChannelId: null,
  voiceLogChannelId: null,
  roleLogChannelId: null,
};

const categories = [
  {
    key: "modLogChannelId",
    title: "Logs de modération",
    description: "Sanctions exécutées par les commandes du bot et purges.",
    icon: FileText,
    color: "text-amber-400",
  },
  {
    key: "messageLogChannelId",
    title: "Logs des messages",
    description: "Messages supprimés et modifications, avec leur contenu si disponible.",
    icon: MessageSquare,
    color: "text-blue-400",
  },
  {
    key: "memberLogChannelId",
    title: "Logs des membres",
    description: "Arrivées et départs des membres.",
    icon: UserCheck,
    color: "text-emerald-400",
  },
  {
    key: "roleLogChannelId",
    title: "Logs des rôles",
    description: "Rôles ajoutés ou retirés aux membres.",
    icon: Users,
    color: "text-indigo-400",
  },
  {
    key: "voiceLogChannelId",
    title: "Logs vocaux",
    description: "Connexions, déconnexions et déplacements entre salons vocaux.",
    icon: Mic,
    color: "text-purple-400",
  },
] as const;

const apiErrors: Record<string, string> = {
  INVALID_CONFIG: "La configuration envoyée est invalide.",
  INVALID_CHANNEL_ID: "Un salon sélectionné n'existe plus sur ce serveur.",
  INVALID_CHANNEL_TYPE: "Un des salons sélectionnés n'est pas un salon textuel valide.",
  BOT_MISSING_CHANNEL_PERMISSIONS: "Le bot ne peut pas voir ou écrire dans un des salons sélectionnés.",
  DISCORD_UNAVAILABLE: "Discord ne répond pas actuellement. Réessayez plus tard.",
  SESSION_EXPIRED: "Votre session Discord a expiré. Reconnectez-vous.",
};

export default function LogsConfigPage({
  params,
}: {
  params: { guildId: string };
}) {
  const [settings, setSettings] = useState<LogSettings>(initialSettings);
  const [channels, setChannels] = useState<GuildResources["channels"]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const [settingsResponse, resourcesResponse] = await Promise.all([
          fetch(`/api/guilds/${params.guildId}/logs`, { cache: "no-store" }),
          fetch(`/api/guilds/${params.guildId}/resources`, { cache: "no-store" }),
        ]);
        if (!settingsResponse.ok || !resourcesResponse.ok) {
          throw new Error("Les paramètres et les salons Discord n'ont pas pu être chargés.");
        }
        const [loadedSettings, resources] = await Promise.all([
          settingsResponse.json() as Promise<LogSettings>,
          resourcesResponse.json() as Promise<GuildResources>,
        ]);
        if (!active) return;
        setSettings(loadedSettings);
        setChannels(resources.channels.filter((channel) => channel.type !== 4));
      } catch (loadError) {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Les paramètres n'ont pas pu être chargés."
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

  const updateChannel = (
    key: (typeof categories)[number]["key"],
    value: string
  ) => {
    setSettings((current) => ({ ...current, [key]: value || null }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    setError("");
    try {
      const response = await fetch(`/api/guilds/${params.guildId}/logs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (!response.ok) {
        const result: { error?: string } | null = await response.json().catch(() => null);
        throw new Error(
          (result?.error && apiErrors[result.error]) || "L'enregistrement des journaux a échoué."
        );
      }
      setSettings((await response.json()) as LogSettings);
      setSaved(true);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "L'enregistrement des journaux a échoué."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">
          Salons de Journalisation (Logs)
        </h1>
        <p className="text-sm text-zinc-400 mt-1">
          Choisissez les salons réels où le bot publiera les événements qu'il traite.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-zinc-400">Chargement des paramètres et salons Discord…</p>
      ) : null}
      {error ? <p role="alert" className="text-sm text-rose-400">{error}</p> : null}

      <div className="rounded-2xl bg-zinc-900/40 border border-zinc-800 p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-semibold text-white">Activer le système de logs</h2>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.enabled}
              onChange={(event) => {
                setSettings((current) => ({ ...current, enabled: event.target.checked }));
                setSaved(false);
              }}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-zinc-800 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500" />
          </label>
        </div>

        {settings.enabled ? (
          <div className="space-y-4 pt-4 border-t border-zinc-800">
            {categories.map(({ key, title, description, icon: Icon, color }) => (
              <div
                key={key}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/60"
              >
                <div className="flex items-start gap-3">
                  <Icon className={`w-5 h-5 ${color} shrink-0 mt-0.5`} />
                  <div>
                    <h3 className="text-sm font-medium text-white">{title}</h3>
                    <p className="text-xs text-zinc-400">{description}</p>
                  </div>
                </div>
                <select
                  aria-label={title}
                  value={settings[key] ?? ""}
                  onChange={(event) => updateChannel(key, event.target.value)}
                  className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-zinc-600 sm:w-64"
                >
                  <option value="">Désactivé</option>
                  {channels.map((channel) => (
                    <option key={channel.id} value={channel.id}>
                      #{channel.name}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        ) : (
          <p className="border-t border-zinc-800 pt-4 text-sm text-zinc-400">
            La journalisation est désactivée. Les salons configurés seront conservés.
          </p>
        )}

        <div className="pt-2 flex justify-end">
          <button
            onClick={handleSave}
            disabled={loading || saving || Boolean(error)}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-zinc-100 hover:bg-white disabled:opacity-50 text-zinc-950 font-medium text-sm transition"
          >
            {saved ? <Check className="w-4 h-4 text-emerald-600" /> : <Save className="w-4 h-4" />}
            <span>
              {saving
                ? "Enregistrement…"
                : saved
                  ? "Configuration enregistrée"
                  : "Enregistrer les paramètres"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
