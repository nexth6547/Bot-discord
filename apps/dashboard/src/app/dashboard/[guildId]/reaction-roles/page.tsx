"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Plus, Sliders, Trash2 } from "lucide-react";

interface ReactionRolePanel {
  id: string;
  channelId: string;
  messageId: string;
  roleId: string;
  roleName: string | null;
  emoji: string | null;
  label: string;
}

interface GuildResources {
  channels: Array<{ id: string; name: string; type: number }>;
  roles: Array<{ id: string; name: string; position: number }>;
}

const errorMessages: Record<string, string> = {
  INVALID_CONFIG: "Vérifiez le salon, le rôle, le libellé et l'emoji.",
  INVALID_CHANNEL_ID: "Le salon sélectionné n'existe plus sur ce serveur.",
  INVALID_CHANNEL_TYPE: "Sélectionnez un salon textuel classique ou d'annonces.",
  INVALID_ROLE_ID: "Le rôle sélectionné n'existe plus sur ce serveur.",
  BOT_CANNOT_ASSIGN_ROLE: "Le bot ne peut pas gérer ce rôle. Vérifiez sa permission Gérer les rôles et sa position dans la hiérarchie.",
  BOT_MISSING_CHANNEL_PERMISSIONS: "Le bot doit pouvoir voir et envoyer des embeds dans le salon sélectionné.",
  DISCORD_MESSAGE_FAILED: "Discord n'a pas pu publier le panneau. Vérifiez les permissions du bot dans ce salon.",
  DISCORD_UNAVAILABLE: "Discord ne répond pas actuellement. Réessayez plus tard.",
  ROLE_NOT_FOUND: "Ce panneau n'existe plus.",
  SESSION_EXPIRED: "Votre session Discord a expiré. Reconnectez-vous.",
};

export default function ReactionRolesPage({
  params,
}: {
  params: { guildId: string };
}) {
  const [panels, setPanels] = useState<ReactionRolePanel[]>([]);
  const [channels, setChannels] = useState<GuildResources["channels"]>([]);
  const [roles, setRoles] = useState<GuildResources["roles"]>([]);
  const [channelId, setChannelId] = useState("");
  const [roleId, setRoleId] = useState("");
  const [emoji, setEmoji] = useState("🎯");
  const [label, setLabel] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    const [panelsResponse, resourcesResponse] = await Promise.all([
      fetch(`/api/guilds/${params.guildId}/reaction-roles`, { cache: "no-store" }),
      fetch(`/api/guilds/${params.guildId}/resources`, { cache: "no-store" }),
    ]);
    if (!panelsResponse.ok || !resourcesResponse.ok) {
      throw new Error("Les panneaux et ressources Discord n'ont pas pu être chargés.");
    }
    const [loadedPanels, resources] = await Promise.all([
      panelsResponse.json() as Promise<ReactionRolePanel[]>,
      resourcesResponse.json() as Promise<GuildResources>,
    ]);
    setPanels(loadedPanels);
    setChannels(resources.channels.filter((channel) => channel.type !== 4));
    setRoles(resources.roles);
    setChannelId((current) => current || resources.channels.find((channel) => channel.type === 0)?.id || "");
    setRoleId((current) => current || resources.roles[0]?.id || "");
  }, [params.guildId]);

  useEffect(() => {
    let active = true;
    const initialLoad = async () => {
      try {
        await load();
      } catch (loadError) {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Les panneaux de rôles n'ont pas pu être chargés."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    void initialLoad();
    return () => {
      active = false;
    };
  }, [load]);

  const handleAdd = async () => {
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/guilds/${params.guildId}/reaction-roles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId, targetRoleId: roleId, emoji, label }),
      });
      if (!response.ok) {
        const result: { error?: string } | null = await response.json().catch(() => null);
        throw new Error(
          (result?.error && errorMessages[result.error]) || "La création du panneau a échoué."
        );
      }
      const created = (await response.json()) as ReactionRolePanel;
      setPanels((current) => [created, ...current]);
      setLabel("");
      setNotice("Le panneau a été publié sur Discord et enregistré.");
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "La création a échoué.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (panel: ReactionRolePanel) => {
    setDeletingId(panel.id);
    setError("");
    setNotice("");
    try {
      const response = await fetch(
        `/api/guilds/${params.guildId}/reaction-roles?id=${encodeURIComponent(panel.id)}`,
        { method: "DELETE" }
      );
      if (!response.ok) {
        const result: { error?: string } | null = await response.json().catch(() => null);
        throw new Error(
          (result?.error && errorMessages[result.error]) || "La suppression du panneau a échoué."
        );
      }
      setPanels((current) => current.filter((item) => item.id !== panel.id));
      setNotice("Le message Discord et son enregistrement ont été supprimés.");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "La suppression a échoué.");
    } finally {
      setDeletingId("");
    }
  };

  const channelName = (id: string) =>
    channels.find((channel) => channel.id === id)?.name ?? id;
  const roleName = (panel: ReactionRolePanel) =>
    roles.find((role) => role.id === panel.roleId)?.name ?? panel.roleName ?? panel.roleId;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Rôles interactifs</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Publiez des boutons Discord réels pour que les membres puissent obtenir ou retirer un rôle.
        </p>
      </div>

      {loading ? <p className="text-sm text-zinc-400">Chargement des panneaux et ressources Discord…</p> : null}
      {error ? <p role="alert" className="text-sm text-rose-400">{error}</p> : null}
      {notice ? <p role="status" className="text-sm text-emerald-400">{notice}</p> : null}

      <div className="rounded-2xl bg-zinc-900/40 border border-zinc-800 p-6 space-y-6">
        <div className="flex items-center gap-2">
          <Sliders className="w-5 h-5 text-amber-400" />
          <h2 className="text-base font-semibold text-white">Publier un bouton de rôle</h2>
        </div>

        {roles.length === 0 ? (
          <p className="text-sm text-zinc-400">
            Aucun rôle gérable par le bot n'est disponible. Vérifiez sa permission Gérer les rôles et sa hiérarchie.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="text-xs font-medium text-zinc-300">
                Salon de publication
                <select
                  value={channelId}
                  onChange={(event) => setChannelId(event.target.value)}
                  className="mt-1.5 w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-zinc-200"
                >
                  {channels.filter((channel) => channel.type === 0 || channel.type === 5).map((channel) => (
                    <option key={channel.id} value={channel.id}>#{channel.name}</option>
                  ))}
                </select>
              </label>

              <label className="text-xs font-medium text-zinc-300">
                Rôle à attribuer
                <select
                  value={roleId}
                  onChange={(event) => setRoleId(event.target.value)}
                  className="mt-1.5 w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-zinc-200"
                >
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>@{role.name}</option>
                  ))}
                </select>
              </label>

              <label className="text-xs font-medium text-zinc-300">
                Emoji Unicode
                <input
                  type="text"
                  maxLength={32}
                  value={emoji}
                  onChange={(event) => setEmoji(event.target.value)}
                  className="mt-1.5 w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-zinc-200"
                />
              </label>

              <label className="text-xs font-medium text-zinc-300">
                Texte du bouton
                <input
                  type="text"
                  maxLength={80}
                  value={label}
                  onChange={(event) => setLabel(event.target.value)}
                  placeholder="ex. Obtenir le rôle Gaming"
                  className="mt-1.5 w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-zinc-200"
                />
              </label>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleAdd}
                disabled={loading || saving || !channelId || !roleId || !label.trim() || !emoji.trim()}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-zinc-100 hover:bg-white disabled:opacity-50 text-zinc-950 font-medium text-sm transition"
              >
                {saving ? <span>Publication…</span> : <><Plus className="w-4 h-4" /><span>Publier sur Discord</span></>}
              </button>
            </div>
          </>
        )}
      </div>

      <div className="rounded-2xl bg-zinc-900/40 border border-zinc-800 p-6 space-y-4">
        <h2 className="text-base font-semibold text-white">Panneaux publiés</h2>
        {loading ? (
          <p className="text-sm text-zinc-400">Chargement…</p>
        ) : panels.length === 0 ? (
          <p className="text-sm text-zinc-400">Aucun panneau interactif enregistré pour ce serveur.</p>
        ) : (
          <div className="space-y-3">
            {panels.map((panel) => (
              <div
                key={panel.id}
                className="flex items-center justify-between gap-4 p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/60"
              >
                <div className="flex min-w-0 items-center gap-4">
                  <span className="text-xl">{panel.emoji ?? "🎭"}</span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-zinc-100">{panel.label}</span>
                      <span className="px-2 py-0.5 rounded bg-zinc-800 text-[11px] text-zinc-300 font-medium">
                        @{roleName(panel)}
                      </span>
                    </div>
                    <span className="text-xs text-zinc-500">Salon : #{channelName(panel.channelId)}</span>
                  </div>
                </div>
                <button
                  onClick={() => void handleDelete(panel)}
                  disabled={deletingId === panel.id}
                  className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition disabled:opacity-50"
                  title="Supprimer le panneau Discord"
                  aria-label={`Supprimer le panneau ${panel.label}`}
                >
                  {deletingId === panel.id ? "…" : <Trash2 className="w-4 h-4" />}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
