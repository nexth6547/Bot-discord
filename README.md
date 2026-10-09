# 🤖 Bloomera - Bot Discord & Dashboard Web

Une solution complète pour gérer un serveur Discord via un **Bot polyvalent** et une **Interface Web d'administration (Dashboard)** moderne et au style neutre (prête à recevoir la charte graphique de votre serveur).

---

## 🌟 Fonctionnalités Incluses

### 🛡️ 1. Modération & Sécurité
- **Commandes Slash** : `/ban`, `/kick`, `/timeout` (exclusion temporaire), `/warn` (avertissement avec historique), `/warnings`, `/clear` (purge en masse).
- **Auto-Modération** : Détection et suppression automatique des liens/invitations Discord suspects.
- **Historique complet** : Enregistrement de chaque sanction en base de données.

### 👋 2. Accueil & Départs
- Messages de bienvenue personnalisables (texte brut ou Embed riche avec couleur personnalisable).
- Variables dynamiques : `{user}`, `{server}`, `{count}` (nombre de membres).
- **Auto-Rôle** : Attribution automatique d'un rôle d'arrivée aux nouveaux membres.
- Message d'au revoir configurable.

### 📜 3. Salons de Journalisation (Audit Logs)
- Salons séparés pour chaque catégorie d'événement :
  - **Modération** (sanctions, purges)
  - **Messages** (suppressions, éditions avec avant/après)
  - **Membres** (arrivées, départs)
  - **Vocal** (connexions, déconnexions)

### 📩 4. Système de Support par Tickets
- Déploiement d'un panneau avec bouton interactif via `/ticket-setup`.
- Création instantanée d'un salon textuel privé avec permissions restreintes (l'auteur du ticket et le rôle Support).
- Bouton de fermeture avec confirmation et suppression propre du salon.

### 🏆 5. Niveaux & Système d'XP
- Gain d'XP paramétrable par message avec cooldown anti-spam.
- Commande `/rank` avec carte de niveau et barre de progression.
- Commande `/leaderboard` et affichage du classement sur le dashboard web.
- Annonces de montée de niveau configurables.

### 🎭 6. Rôles par Réaction / Boutons
- Commande `/reactionrole-setup` pour déployer des boutons interactifs permettant aux membres de s'auto-attribuer des rôles en un clic.

---

## 📁 Architecture du Projet

```
Bot Discord/
├── apps/
│   ├── bot/                 # Client Discord.js v14 (commandes, événements, services)
│   └── dashboard/           # Interface d'administration web Next.js 14 + Tailwind CSS
├── packages/
│   └── database/            # Base de données SQLite & Client Prisma ORM partagé
├── .env.example             # Modèle des variables de configuration
├── package.json             # Monorepo workspaces
└── README.md
```

---

## 🚀 Guide de Démarrage Rapide

### 0. Installer les dépendances
Depuis la racine du dépôt, avec pnpm installé :
```powershell
pnpm install
```

### 1. Configuration sur le Portail Discord
1. Rendez-vous sur le [Discord Developer Portal](https://discord.com/developers/applications) et cliquez sur **New Application**.
2. Allez dans l'onglet **Bot** :
   - Cliquez sur **Reset Token** et copiez votre Token.
   - **Important** : Dans la section **Privileged Gateway Intents**, cochez :
     - ✅ **Server Members Intent**
     - ✅ **Message Content Intent**
3. Allez dans l'onglet **OAuth2** :
   - Copiez le **Client ID** et le **Client Secret**.
   - Dans **Redirects**, ajoutez l'URL suivante :
     ```
     http://localhost:3000/api/auth/callback/discord
     ```
4. Invitez le bot sur votre serveur de test avec les scopes `bot` et `applications.commands`. Accordez uniquement les permissions nécessaires : Voir les salons, Envoyer des messages, Lire l'historique des messages, Intégrer des liens, Gérer les salons, Gérer les rôles, Gérer les messages, Bannir des membres, Expulser des membres et Modérer les membres. N'accordez pas `Administrator`.

### 2. Configuration du fichier `.env`
Copiez le modèle à la racine du dépôt, puis renseignez vos identifiants dans `.env` :
```powershell
Copy-Item .env.example .env
```

```env
DISCORD_TOKEN="votre_token_ici"
DISCORD_CLIENT_ID="votre_client_id_ici"
NEXT_PUBLIC_DISCORD_CLIENT_ID="votre_client_id_ici"
DISCORD_CLIENT_SECRET="votre_client_secret_ici"

NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="une_cle_secrete_aleatoire_de_plus_de_32_caracteres"
DATABASE_URL="file:../../dev.db"
```

### 3. Initialiser la Base de Données
Générez le client Prisma (également exécuté automatiquement par `pnpm install`), puis créez/actualisez le schéma SQLite :
```powershell
pnpm db:generate
pnpm db:push
```
*(Optionnel) Pour visualiser la base dans votre navigateur : `pnpm db:studio`*

> `pnpm db:generate` est l'alias racine de `pnpm --filter @bot/database generate`. Le workspace expose le script `generate` (et non un script `prisma`).

### 4. Lancer le Dashboard Web
```powershell
pnpm dev:dashboard
```
Ouvrez [http://localhost:3000](http://localhost:3000) dans votre navigateur.

### 5. Lancer le Bot Discord
Dans un autre terminal :
```powershell
pnpm dev:bot
```

### Autres commandes disponibles
À lancer depuis la racine du dépôt :

| Commande | Action |
| --- | --- |
| `pnpm dev:dashboard` | Lance le dashboard en développement sur le port 3000. |
| `pnpm dev:bot` | Lance le bot en mode développement avec rechargement. |
| `pnpm dev` | Alias actuel de `pnpm dev:bot` ; ne lance pas le dashboard. |
| `pnpm build` | Compile les workspaces database, bot et dashboard. |
| `pnpm build:bot` | Compile le bot. |
| `pnpm build:dashboard` | Compile le dashboard. |
| `pnpm --filter @bot/core start` | Démarre le bot compilé ; exécuter un build auparavant. |
| `pnpm --filter @bot/dashboard start` | Démarre le dashboard compilé ; exécuter un build auparavant. |

Pour une utilisation locale complète, laissez le bot et le dashboard tourner dans deux terminaux distincts. Les migrations versionnées et le déploiement de production restent à définir ; `pnpm db:push` est prévu ici pour le développement local.

---

## 🎨 Thème
Le dashboard Bloomera utilise actuellement un **fond sombre zinc avec des accents ambre**. Les couleurs Discord et les couleurs de fond sont définies dans `apps/dashboard/tailwind.config.ts` et `apps/dashboard/src/app/globals.css` ; plusieurs accents ambre sont appliqués directement dans les composants.
