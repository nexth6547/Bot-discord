"use client";

import React, { useEffect, useState } from "react";
import { Check, Eye, Save, Ticket, Upload } from "lucide-react";

interface TicketSettings {
  enabled: boolean;
  categoryId: string | null;
  supportRoleId: string | null;
  panelChannelId: string | null;
  panelMessageId: string | null;
  panelTitle: string;
  panelDescription: string;
  buttonText: string;
}

interface ActiveTicket {
  id: string;
  channelId: string;
  userId: string;
  userTag: string | null;
  createdAt: string;
}

interface TicketResponse {
  config: TicketSettings;
  activeTickets: ActiveTicket[];
}

interface GuildResources {
  channels: Array<{ id: string; name: string; type: number }>;
  roles: Array<{ id: string; name: string; position: number }>;
}

const defaults: TicketSettings = {
  enabled: false,
  categoryId: null,
  supportRoleId: null,
  panelChannelId: null,
  panelMessageId: null,
  panelTitle: "Assistance & Support",
  panelDescription: "Pour toute demande d'assistance, cliquez sur le bouton ci-dessous pour ouvrir un salon privé.",
  buttonText: "📩 Ouvrir un ticket",
};

const errorMessages: Record<string, string> = {
  INVALID_CONFIG: "La configuration envoyée est invalide.",
  INVALID_CHANNEL_ID: "Un salon sélectionné n'existe plus sur ce serveur.",
  INVALID_CHANNEL_TYPE: "Un type de salon sélectionné n'est pas accepté pour cette option.",
  INVALID_ROLE_ID: "Le rôle sélectionné n'existe plus sur ce serveur.",
  BOT_CANNOT_ASSIGN_ROLE: "Le bot ne peut pas gérer ce rôle en raison de ses permissions ou de sa hiérarchie.",
  BOT_MISSING_CHANNEL_PERMISSIONS: "Le bot ne peut pas voir ou envoyer des messages dans un des salons sélectionnés.",
  BOT_MISSING_MANAGE_CHANNELS: "Le bot doit avoir Gérer les salons pour créer les tickets dans cette catégorie.",
  DISCORD_MESSAGE_FAILED: "Discord n'a pas pu publier ou mettre à jour le panneau. Vérifiez les permissions du bot dans le salon.",
  DISCORD_UNAVAILABLE: "Discord ne répond pas actuellement. Réessayez plus tard.",
  SESSION_EXPIRED: "Votre session Discord a expiré. Reconnectez-vous.",
};

export default function TicketsConfigPage({
  params,
}: {
  params: { guildId: string };
}) {
  const [settings, setSettings] = useState<TicketSettings>(defaults);
  const [activeTickets, setActiveTickets] = useState<ActiveTicket[]>([]);
  const [channels, setChannels] = useState<GuildResources["channels"]>([]);
  const [roles, setRoles] = useState<GuildResources["roles"]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const [settingsResponse, resourcesResponse] = await Promise.all([
          fetch(`/api/guilds/${params.guildId}/tickets`, { cache: "no-store" }),
          fetch(`/api/guilds/${params.guildId}/resources`, { cache: "no-store" }),
        ]);
        if (!settingsResponse.ok || !resourcesResponse.ok) {
          throw new Error("Les paramètres de tickets et les ressources Discord n'ont pas pu être chargés.");
        }
        const [result, resources] = await Promise.all([
          settingsResponse.json() as Promise<TicketResponse>,
          resourcesResponse.json() as Promise<GuildResources>,
        ]);
        if (!active) return;
        setSettings(result.config);
        setActiveTickets(result.activeTickets);
        setChannels(resources.channels);
        setRoles(resources.roles);
      } catch (loadError) {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Les paramètres de tickets n'ont pas pu être chargés."
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

  const update = <K extends keyof TicketSettings>(key: K, value: TicketSettings[K]) => {
    setSettings((current) => ({ ...current, [key]: value }));
    setNotice("");
  };

  const saveSettings = async () => {
    const response = await fetch(`/api/guilds/${params.guildId}/tickets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        enabled: settings.enabled,
        categoryId: settings.categoryId,
        supportRoleId: settings.supportRoleId,
        panelTitle: settings.panelTitle,
        panelDescription: settings.panelDescription,
        buttonText: settings.buttonText,
      }),
    });
    if (!response.ok) {
      const result: { error?: string } | null = await response.json().catch(() => null);
      throw new Error(
        (result?.error && errorMessages[result.error]) || "La sauvegarde des paramètres a échoué."
      );
    }
    const updated = await response.json();
    setSettings((current) => ({
      ...current,
      ...updated,
      panelChannelId: current.panelChannelId,
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await saveSettings();
      setNotice("Les paramètres ont été enregistrés.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "La sauvegarde a échoué.");
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    setPublishing(true);
    setError("");
    setNotice("");
    try {
      await saveSettings();
      const response = await fetch(`/api/guilds/${params.guildId}/tickets/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: settings.enabled,
          categoryId: settings.categoryId,
          supportRoleId: settings.supportRoleId,
          panelChannelId: settings.panelChannelId,
          panelTitle: settings.panelTitle,
          panelDescription: settings.panelDescription,
          buttonText: settings.buttonText,
        }),
      });
      if (!response.ok) {
        const result: { error?: string } | null = await response.json().catch(() => null);
        throw new Error(
          (result?.error && errorMessages[result.error]) || "La publication du panneau a échoué."
        );
      }
      const published: { messageId: string; updated: boolean; cleanupWarning: boolean } =
        await response.json();
      setSettings((current) => ({ ...current, panelMessageId: published.messageId }));
      setNotice(
        published.cleanupWarning
          ? "Le panneau a été publié, mais l'ancien message n'a pas pu être supprimé."
          : published.updated
            ? "Le panneau Discord existant a été mis à jour."
            : "Le panneau a été publié sur Discord."
      );
    } catch (publishError) {
      setError(publishError instanceof Error ? publishError.message : "La publication a échoué.");
    } finally {
      setPublishing(false);
    }
  };

  const textChannels = channels.filter((channel) => channel.type === 0 || channel.type === 5);
  const categories = channels.filter((channel) => channel.type === 4);
  const getChannelName = (id: string) => channels.find((channel) => channel.id === id)?.name ?? id;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Système de Tickets</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Configurez les tickets privés et publiez leur panneau interactif sur Discord.
        </p>
      </div>

      {loading ? <p className="text-sm text-zinc-400">Chargement des paramètres et ressources Discord…</p> : null}
      {error ? <p role="alert" className="text-sm text-rose-400">{error}</p> : null}
      {notice ? <p role="status" className="text-sm text-emerald-400">{notice}</p> : null}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="rounded-2xl bg-zinc-900/40 border border-zinc-800 p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Ticket className="w-5 h-5 text-amber-400" />
              <h2 className="text-base font-semibold text-white">Configuration</h2>
            </div>
            <input
              aria-label="Activer le système de tickets"
              type="checkbox"
              checked={settings.enabled}
              onChange={(event) => update("enabled", event.target.checked)}
              className="h-4 w-4 rounded border-zinc-700 bg-zinc-950 text-amber-500"
            />
          </div>

          <div className="space-y-4 border-t border-zinc-800 pt-4">
            <label className="block text-xs font-medium text-zinc-300">
              Catégorie de création des tickets
              <select
                value={settings.categoryId ?? ""}
                onChange={(event) => update("categoryId", event.target.value || null)}
                className="mt-1.5 w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-zinc-200"
              >
                <option value="">Aucune catégorie</option>
                {categories.map((channel) => (
                  <option key={channel.id} value={channel.id}>{channel.name}</option>
                ))}
              </select>
            </label>

            <label className="block text-xs font-medium text-zinc-300">
              Rôle de support
              <select
                value={settings.supportRoleId ?? ""}
                onChange={(event) => update("supportRoleId", event.target.value || null)}
                className="mt-1.5 w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-zinc-200"
              >
                <option value="">Aucun rôle</option>
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>@{role.name}</option>
                ))}
              </select>
            </label>

            <label className="block text-xs font-medium text-zinc-300">
              Salon de publication du panneau
              <select
                value={settings.panelChannelId ?? ""}
                onChange={(event) => update("panelChannelId", event.target.value || null)}
                className="mt-1.5 w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-zinc-200"
              >
                <option value="">Sélectionner un salon</option>
                {textChannels.map((channel) => (
                  <option key={channel.id} value={channel.id}>#{channel.name}</option>
                ))}
              </select>
              <span className="mt-1 block text-[11px] text-zinc-500">
                Le choix s'applique lorsque vous publiez ou mettez à jour le panneau.
              </span>
            </label>

            <label className="block text-xs font-medium text-zinc-300">
              Titre du panneau
              <input
                maxLength={256}
                value={settings.panelTitle}
                onChange={(event) => update("panelTitle", event.target.value)}
                className="mt-1.5 w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-zinc-200"
              />
            </label>

            <label className="block text-xs font-medium text-zinc-300">
              Description
              <textarea
                rows={4}
                maxLength={4000}
                value={settings.panelDescription}
                onChange={(event) => update("panelDescription", event.target.value)}
                className="mt-1.5 w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-zinc-200"
              />
            </label>

            <label className="block text-xs font-medium text-zinc-300">
              Libellé du bouton
              <input
                maxLength={80}
                value={settings.buttonText}
                onChange={(event) => update("buttonText", event.target.value)}
                className="mt-1.5 w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-zinc-200"
              />
            </label>
          </div>

          <div className="flex flex-col sm:flex-row justify-end gap-3 border-t border-zinc-800 pt-4">
            <button
              onClick={handleSave}
              disabled={loading || saving || publishing || Boolean(error)}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-100 font-medium text-sm transition"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? "Enregistrement…" : "Enregistrer"}</span>
            </button>
            <button
              onClick={handlePublish}
              disabled={loading || saving || publishing || Boolean(error) || !settings.enabled || !settings.panelChannelId}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-zinc-950 font-semibold text-sm transition"
            >
              {settings.panelMessageId ? <Check className="w-4 h-4" /> : <Upload className="w-4 h-4" />}
              <span>{publishing ? "Publication…" : settings.panelMessageId ? "Mettre à jour le panneau Discord" : "Publier le panneau Discord"}</span>
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            <Eye className="w-4 h-4" />
            <span>Aperçu du panneau</span>
          </div>
          <div className="bg-[#313338] rounded-xl p-5 border border-zinc-800 text-zinc-200">
            <div className="bg-[#2b2d31] rounded-lg p-4 border-l-4 border-amber-500 space-y-2">
              <h3 className="font-bold text-white">{settings.panelTitle}</h3>
              <p className="text-sm text-zinc-300 whitespace-pre-line">{settings.panelDescription}</p>
              {settings.panelChannelId ? (
                <p className="text-xs text-zinc-500">Salon : #{getChannelName(settings.panelChannelId)}</p>
              ) : null}
            </div>
            <button type="button" disabled className="mt-4 bg-amber-500 text-zinc-950 text-xs font-medium px-4 py-2 rounded opacity-80">
              📩 {settings.buttonText}
            </button>
          </div>
          <div className="rounded-2xl bg-zinc-900/40 border border-zinc-800 p-5 space-y-3">
            <h2 className="text-sm font-semibold text-white">Tickets actuellement ouverts</h2>
            {loading ? (
              <p className="text-sm text-zinc-400">Chargement…</p>
            ) : activeTickets.length === 0 ? (
              <p className="text-sm text-zinc-400">Aucun ticket ouvert enregistré.</p>
            ) : (
              activeTickets.map((ticket) => (
                <div key={ticket.id} className="flex items-center justify-between gap-3 border-t border-zinc-800 pt-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-zinc-200">{ticket.userTag ?? ticket.userId}</p>
                    <p className="text-xs text-zinc-500">#{getChannelName(ticket.channelId)}</p>
                  </div>
                  <time className="shrink-0 text-[11px] text-zinc-500">
                    {new Date(ticket.createdAt).toLocaleDateString("fr-FR")}
                  </time>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
