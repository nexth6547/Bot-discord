# Bloomera

Bloomera est un monorepo qui associe un bot Discord complet et un dashboard d'administration web pour gérer les réglages d'un serveur, les logs, les tickets, les niveaux XP et les rôles interactifs.

Le projet est conçu pour fonctionner avec Discord.js v14, Next.js, Prisma et SQLite dans un environnement de développement local ou de production simple.

---

## Aperçu

- Bot Discord avec commandes slash et événements de guild
- Dashboard web protégé par session Discord
- Gestion de la configuration serveur côté base de données
- Modération, bienvenue/départ, tickets, niveaux, rôles interactifs
- Architecture monorepo avec workspaces pnpm

---

## Stack technique

- Bot : Discord.js v14
- Dashboard : Next.js 14 + React + Tailwind CSS
- Base de données : Prisma + SQLite
- Gestionnaire de paquets : pnpm
- Langage : TypeScript

---

## Structure du dépôt

```text
Bot-discord/
├── apps/
│   ├── bot/
│   │   └── src/
│   └── dashboard/
│       └── src/
├── packages/
│   └── database/
├── .env.example
├── AGENTS.md
├── CHANGELOG.md
├── README.md
├── TODO.md
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
└── tsconfig.base.json
```

---

## Fonctionnalités principales

### Modération
- `/ban`, `/kick`, `/timeout`, `/warn`, `/warnings`, `/clear`
- historique des sanctions en base
- vérification des permissions et hiérarchie Discord
- protection anti-liens / invitations configurable

### Bienvenue et départ
- messages de bienvenue configurables
- message de départ configurable
- auto-rôle assignable
- couleurs et embeds personnalisables

### Logs / audit
- modération, messages, membres, vocaux
- enregistrement côté bot et configuration côté dashboard

### Tickets
- panneau interactif pour ouvrir un ticket
- création de salon privé
- fermeture avec permissions restreintes
- support et journalisation

### Niveaux XP
- XP par message avec cooldown
- système de progression
- classement et messages d'élévation

### Rôles interactifs
- panneaux de rôles via boutons
- publication du message Discord
- mise à jour et suppression depuis le dashboard

---

## Prérequis

- Node.js 20+
- pnpm
- un compte Discord avec un serveur de test
- accès au portail développeur Discord

---

## Configuration Discord

### 1. Créer une application Discord
1. Rendez-vous sur le [Discord Developer Portal](https://discord.com/developers/applications)
2. Créez une application
3. Ouvrez l’onglet Bot
4. Réinitialisez le token et copiez-le
5. Activez les intents privilégiés nécessaires :
   - Server Members Intent
   - Message Content Intent

### 2. Ajouter le bot au serveur
Dans l’onglet OAuth2, configurez :
- Client ID
- Client Secret
- redirect URI locale :

```text
http://localhost:3000/api/auth/callback/discord
```

Puis invitez le bot avec les permissions minimales nécessaires, sans utiliser `Administrator`.

---

## Variables d’environnement

Copiez le modèle puis personnalisez-le :

```bash
cp .env.example .env
```

Exemple de contenu :

```env
DISCORD_TOKEN="votre_token_ici"
DISCORD_CLIENT_ID="votre_client_id_ici"
NEXT_PUBLIC_DISCORD_CLIENT_ID="votre_client_id_ici"
DISCORD_CLIENT_SECRET="votre_client_secret_ici"

NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="une_cle_secrete_aleatoire_de_plus_de_32_caracteres"
DATABASE_URL="file:../../dev.db"
```

> Le fichier `.env` est destiné au développement local et ne doit pas être partagé publiquement.

---

## Installation

```bash
pnpm install
```

---

## Base de données

Générer le client Prisma et synchroniser le schéma SQLite :

```bash
pnpm db:generate
pnpm db:push
```

Pour visualiser la base localement :

```bash
pnpm db:studio
```

---

## Lancer le projet

### Dashboard

```bash
pnpm dev:dashboard
```

Ouvrez :

```text
http://localhost:3000
```

### Bot

Dans un autre terminal :

```bash
pnpm dev:bot
```

---

## Commandes disponibles

Depuis la racine du dépôt :

| Commande | Description |
| --- | --- |
| `pnpm dev` | Lance le bot seulement |
| `pnpm dev:bot` | Lance le bot en mode développement |
| `pnpm dev:dashboard` | Lance le dashboard |
| `pnpm build` | Build complet du monorepo |
| `pnpm build:bot` | Build du bot |
| `pnpm build:dashboard` | Build du dashboard |
| `pnpm db:generate` | Génère le client Prisma |
| `pnpm db:push` | Synchronise le schéma Prisma vers SQLite |
| `pnpm db:studio` | Ouvre Prisma Studio |

---

## Notes importantes

- Ce projet est en évolution continue et la documentation ainsi que les fichiers de configuration doivent rester alignés avec l’état réel du code.
- Le dashboard et le bot fonctionnent mieux en local dans deux terminaux séparés.
- Les migrations versionnées de production ne sont pas encore complétement mises en place ; pour le moment, `db:push` est utilisé dans un cadre de développement local.

---

## Thème visuel

Le dashboard utilise actuellement une palette sombre avec des accents ambrés et des surfaces zincées, afin d’apporter un style plus premium et plus lisible.

---

## Ressources utiles

- [AGENTS.md](./AGENTS.md)
- [CHANGELOG.md](./CHANGELOG.md)
- [TODO.md](./TODO.md)

