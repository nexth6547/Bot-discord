"use client";

import React, { useEffect, useState } from "react";
import { Sparkles, Save, Check, Eye } from "lucide-react";

interface GuildResources {
  channels: Array<{ id: string; name: string; type: number }>;
  roles: Array<{ id: string; name: string; position: number }>;
}

interface WelcomeSettings {
  enabled: boolean;
  channelId: string | null;
  embedTitle: string;
  message: string;
  embedColor: string;
  autoRoleId: string | null;
  useEmbed: boolean;
  leaveEnabled: boolean;
  leaveChannelId: string | null;
  leaveMessage: string;
}

const saveErrorMessages: Record<string, string> = {
  INVALID_CONFIG: "Certaines valeurs sont invalides. Vérifiez les champs puis réessayez.",
  WELCOME_CHANNEL_REQUIRED: "Sélectionnez un salon pour le message de bienvenue.",
  LEAVE_CHANNEL_REQUIRED: "Sélectionnez un salon pour le message de départ.",
  INVALID_CHANNEL_ID: "Un salon sélectionné n'existe plus sur ce serveur.",
  INVALID_CHANNEL_TYPE: "Un des salons sélectionnés n'est pas un salon textuel valide.",
  INVALID_ROLE_ID: "Un rôle sélectionné n'existe plus sur ce serveur.",
  BOT_CANNOT_ASSIGN_ROLE: "Le bot ne peut pas attribuer ce rôle : vérifiez Gérer les rôles et la hiérarchie.",
  BOT_MISSING_CHANNEL_PERMISSIONS: "Le bot n'a pas les permissions nécessaires dans ce salon.",
  BOT_MISSING_MANAGE_CHANNELS: "Le bot doit avoir la permission Gérer les salons pour utiliser cette catégorie.",
  DISCORD_UNAVAILABLE: "Discord ne répond pas actuellement. Réessayez plus tard.",
  FORBIDDEN: "Vous n'avez pas la permission d'administrer ce serveur.",
  SESSION_EXPIRED: "Votre session Discord a expiré. Reconnectez-vous.",
  BOT_NOT_IN_GUILD: "Le bot n'est plus présent sur ce serveur.",
};

export default function WelcomeConfigPage({ params }: { params: { guildId: string } }) {
  const [enabled, setEnabled] = useState(false);
  const [channel, setChannel] = useState("");
  const [title, setTitle] = useState("Nouveau membre !");
  const [message, setMessage] = useState(
    "Bienvenue {user} sur le serveur **{server}** ! Nous sommes maintenant {count} membres."
  );
  const [color, setColor] = useState("#F59E0B");
  const [autoRole, setAutoRole] = useState("");
  const [useEmbed, setUseEmbed] = useState(true);
  const [leaveEnabled, setLeaveEnabled] = useState(false);
  const [leaveChannel, setLeaveChannel] = useState("");
  const [leaveMessage, setLeaveMessage] = useState(
    "Au revoir {user}... Nous espérons te revoir bientôt !"
  );
  const [channels, setChannels] = useState<Array<{ id: string; name: string }>>([]);
  const [roles, setRoles] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const [settingsResponse, resourcesResponse] = await Promise.all([
          fetch(`/api/guilds/${params.guildId}/welcome`, { cache: "no-store" }),
          fetch(`/api/guilds/${params.guildId}/resources`, { cache: "no-store" }),
        ]);
        if (!settingsResponse.ok || !resourcesResponse.ok) {
          throw new Error("Impossible de charger la configuration Discord.");
        }

        const [settings, resources] = await Promise.all([
          settingsResponse.json() as Promise<WelcomeSettings>,
          resourcesResponse.json() as Promise<GuildResources>,
        ]);
        if (!active) return;
        setEnabled(settings.enabled);
        setChannel(settings.channelId ?? "");
        setTitle(settings.embedTitle);
        setMessage(settings.message);
        setColor(settings.embedColor);
        setAutoRole(settings.autoRoleId ?? "");
        setUseEmbed(settings.useEmbed);
        setLeaveEnabled(settings.leaveEnabled);
        setLeaveChannel(settings.leaveChannelId ?? "");
        setLeaveMessage(settings.leaveMessage);
        setChannels(resources.channels.filter((item) => item.type !== 4));
        setRoles(resources.roles);
      } catch {
        if (active) setError("La configuration et les ressources du serveur n'ont pas pu être chargées.");
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
      const response = await fetch(`/api/guilds/${params.guildId}/welcome`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled,
          channelId: channel || null,
          embedTitle: title,
          message,
          embedColor: color,
          autoRoleId: autoRole || null,
          useEmbed,
          leaveEnabled,
          leaveChannelId: leaveChannel || null,
          leaveMessage,
        }),
      });
      if (!response.ok) {
        const result: { error?: string } | null = await response.json().catch(() => null);
        throw new Error(
          (result?.error && saveErrorMessages[result.error]) || "La sauvegarde a échoué."
        );
      }
      setSaved(true);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "La sauvegarde a échoué.");
    } finally {
      setSaving(false);
    }
  };

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

      {loading ? <p className="text-sm text-zinc-400">Chargement des paramètres et des ressources Discord…</p> : null}
      {error ? <p role="alert" className="text-sm text-rose-400">{error}</p> : null}

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
                    <option value="">Sélectionner un salon</option>
                    {channels.map((item) => <option key={item.id} value={item.id}>#{item.name}</option>)}
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

                <label className="flex items-center gap-3 text-sm text-zinc-300">
                  <input
                    type="checkbox"
                    checked={useEmbed}
                    onChange={(e) => setUseEmbed(e.target.checked)}
                    className="h-4 w-4 rounded border-zinc-700 bg-zinc-950 text-amber-500"
                  />
                  Envoyer le message sous forme d'embed
                </label>

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
                      <option value="">Aucun</option>
                      {roles.map((role) => <option key={role.id} value={role.id}>@{role.name}</option>)}
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
              <div className="space-y-3">
                <select
                  value={leaveChannel}
                  onChange={(e) => setLeaveChannel(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-600"
                >
                  <option value="">Sélectionner un salon</option>
                  {channels.map((item) => <option key={item.id} value={item.id}>#{item.name}</option>)}
                </select>
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
            disabled={loading || saving || Boolean(error)}
            className="w-full inline-flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 font-semibold text-sm transition"
          >
            {saved ? <Check className="w-4 h-4 text-emerald-600" /> : <Save className="w-4 h-4" />}
            <span>{saving ? "Enregistrement…" : saved ? "Paramètres enregistrés !" : "Sauvegarder les modifications"}</span>
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
            {useEmbed ? (
              <div
                className="bg-[#2b2d31] rounded-lg p-4 border-l-4 space-y-2 text-sm"
                style={{ borderLeftColor: color }}
              >
                <h4 className="font-bold text-white text-base">{title}</h4>
                <p className="text-zinc-300 text-xs sm:text-sm leading-relaxed whitespace-pre-line">
                  {previewText}
                </p>
              </div>
            ) : (
              <p className="whitespace-pre-line text-sm">{previewText}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
