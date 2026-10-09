"use client";

import React, { useEffect, useState } from "react";
import { Check, Save, Shield } from "lucide-react";

interface ModerationSettings {
  modRoleId: string | null;
  autoModAntiLink: boolean;
}

interface Sanction {
  id: string;
  userId: string;
  userTag: string | null;
  moderatorId: string;
  moderatorTag: string | null;
  type: string;
  reason: string;
  createdAt: string;
}

interface ModerationResponse {
  config: ModerationSettings;
  sanctions: Sanction[];
}

interface GuildResources {
  roles: Array<{ id: string; name: string; position: number }>;
}

const emptySettings: ModerationSettings = {
  modRoleId: null,
  autoModAntiLink: false,
};

const errorMessages: Record<string, string> = {
  INVALID_CONFIG: "La configuration envoyée est invalide.",
  INVALID_ROLE_ID: "Le rôle sélectionné n'existe plus sur ce serveur.",
  BOT_CANNOT_ASSIGN_ROLE: "Le bot ne peut pas gérer ce rôle en raison de ses permissions ou de sa hiérarchie.",
  SESSION_EXPIRED: "Votre session Discord a expiré. Reconnectez-vous.",
  DISCORD_UNAVAILABLE: "Discord ne répond pas actuellement. Réessayez plus tard.",
};

function sanctionBadge(type: string) {
  const styles: Record<string, string> = {
    WARN: "bg-amber-500/20 text-amber-400",
    MUTE: "bg-fuchsia-500/20 text-fuchsia-400",
    KICK: "bg-orange-500/20 text-orange-400",
    BAN: "bg-red-500/20 text-red-400",
  };
  return (
    <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${styles[type] ?? "bg-zinc-700 text-zinc-200"}`}>
      {type}
    </span>
  );
}

export default function ModerationConfigPage({
  params,
}: {
  params: { guildId: string };
}) {
  const [settings, setSettings] = useState<ModerationSettings>(emptySettings);
  const [roles, setRoles] = useState<GuildResources["roles"]>([]);
  const [sanctions, setSanctions] = useState<Sanction[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const [settingsResponse, resourcesResponse] = await Promise.all([
          fetch(`/api/guilds/${params.guildId}/moderation`, { cache: "no-store" }),
          fetch(`/api/guilds/${params.guildId}/resources`, { cache: "no-store" }),
        ]);
        if (!settingsResponse.ok || !resourcesResponse.ok) {
          throw new Error("Les paramètres de modération et les rôles Discord n'ont pas pu être chargés.");
        }
        const [result, resources] = await Promise.all([
          settingsResponse.json() as Promise<ModerationResponse>,
          resourcesResponse.json() as Promise<GuildResources>,
        ]);
        if (!active) return;
        setSettings({
          modRoleId: result.config.modRoleId,
          autoModAntiLink: result.config.autoModAntiLink,
        });
        setSanctions(result.sanctions);
        setRoles(resources.roles);
      } catch (loadError) {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "La configuration de modération n'a pas pu être chargée."
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

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    setError("");
    try {
      const response = await fetch(`/api/guilds/${params.guildId}/moderation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (!response.ok) {
        const result: { error?: string } | null = await response.json().catch(() => null);
        throw new Error(
          (result?.error && errorMessages[result.error]) || "La sauvegarde a échoué."
        );
      }
      const savedConfig = await response.json();
      setSettings({
        modRoleId: savedConfig.modRoleId,
        autoModAntiLink: savedConfig.autoModAntiLink,
      });
      setSaved(true);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "La sauvegarde a échoué.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Modération & Sécurité</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Configurez le filtre anti-liens et le rôle exempté de ce filtre.
        </p>
      </div>

      {loading ? <p className="text-sm text-zinc-400">Chargement des paramètres et rôles Discord…</p> : null}
      {error ? <p role="alert" className="text-sm text-rose-400">{error}</p> : null}

      <div className="rounded-2xl bg-zinc-900/40 border border-zinc-800 p-6 space-y-6">
        <div>
          <label className="block text-xs font-medium text-zinc-300 mb-1.5">
            Rôle exempté du filtre anti-liens (optionnel)
          </label>
          <select
            value={settings.modRoleId ?? ""}
            onChange={(event) => {
              setSettings((current) => ({ ...current, modRoleId: event.target.value || null }));
              setSaved(false);
            }}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-600"
          >
            <option value="">Aucun rôle</option>
            {roles.map((role) => <option key={role.id} value={role.id}>@{role.name}</option>)}
          </select>
          <p className="mt-2 text-xs text-zinc-500">
            Les membres disposant de Gérer les messages sont également exemptés. Ce rôle ne donne pas accès aux commandes de modération.
          </p>
        </div>

        <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/60">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-white">Anti-liens et invitations</h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Supprime les URLs et invitations Discord publiées par les membres non exemptés.
              </p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.autoModAntiLink}
              onChange={(event) => {
                setSettings((current) => ({ ...current, autoModAntiLink: event.target.checked }));
                setSaved(false);
              }}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-zinc-800 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500" />
          </label>
        </div>

        <p className="text-xs text-zinc-500">
          L’option anti-spam reste masquée tant que son comportement configurable n’est pas implémenté.
        </p>

        <div className="pt-2 flex justify-end">
          <button
            onClick={handleSave}
            disabled={loading || saving || Boolean(error)}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-zinc-100 hover:bg-white disabled:opacity-50 text-zinc-950 font-medium text-sm transition"
          >
            {saved ? <Check className="w-4 h-4 text-emerald-600" /> : <Save className="w-4 h-4" />}
            <span>{saving ? "Enregistrement…" : saved ? "Configuration enregistrée" : "Enregistrer la configuration"}</span>
          </button>
        </div>
      </div>

      <div className="rounded-2xl bg-zinc-900/40 border border-zinc-800 p-6 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-white">Dernières sanctions appliquées</h2>
          <p className="mt-1 text-xs text-zinc-500">20 entrées récentes enregistrées en base.</p>
        </div>
        {loading ? (
          <p className="text-sm text-zinc-400">Chargement de l'historique…</p>
        ) : sanctions.length === 0 ? (
          <p className="text-sm text-zinc-400">Aucune sanction enregistrée pour ce serveur.</p>
        ) : (
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
                {sanctions.map((sanction) => (
                  <tr key={sanction.id}>
                    <td className="py-3 px-3">{sanctionBadge(sanction.type)}</td>
                    <td className="py-3 px-3 font-medium text-zinc-200">
                      {sanction.userTag ?? sanction.userId}
                    </td>
                    <td className="py-3 px-3 text-zinc-400">
                      {sanction.moderatorTag ?? sanction.moderatorId}
                    </td>
                    <td className="py-3 px-3 max-w-xs truncate">{sanction.reason}</td>
                    <td className="py-3 px-3 text-zinc-500 font-mono text-[11px]">
                      {new Date(sanction.createdAt).toLocaleString("fr-FR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
