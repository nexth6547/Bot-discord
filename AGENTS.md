# Directives de Développement & Rôle du Projet

Ce projet est un monorepo combinant un **Bot Discord (Discord.js v14)**, un **Dashboard Web (Next.js)** et une couche de données partagée avec **Prisma**.

## 1. Suivi et Journalisation (CHANGELOG)
- À **chaque** modification, ajout de fonctionnalité ou correction de bug, mettre à jour le fichier `CHANGELOG.md` situé à la racine du projet.
- Les entrées doivent être structurées par date ou version et préciser :
  - **Ajouté** (nouvelles fonctionnalités, commandes, composants, tables Prisma).
  - **Modifié** (refactoring, mises à jour, ajustements d'UI ou de logique).
  - **Corrigé** (résolutions de bugs, corrections de types, fix de permissions).
  - **Notes Techniques** (impacts sur le schéma Prisma, scripts npm, dépendances, variables d'environnement).

## 2. Rôle de Relecture et de Sécurité
- Agir comme **validateur d'architecture et de code**.
- **Monorepo & Workspaces npm** : Veiller à la bonne résolution des dépendances croisées (ex: `@bot/database`).
- **Prisma & Base de données** : Vérifier l'adéquation des requêtes, des migrations et des modèles.
- **Discord.js v14** :
  - Contrôle strict des `Intents` et `Partials`.
  - Gestion des permissions Discord (évitement des contournements d'accès).
  - Sécurisation des interactions (boutons, modales, commandes slash).
- **Next.js & Dashboard** :
  - Vérification des Server Actions / API Routes, typage TypeScript strict, sanitisation et sécurité des sessions / tokens.
- **TypeScript** : Aucune régression de type (`noImplicitAny`, interfaces strictes).

## 3. Mode de Transmission Ciblée
- Traiter les fichiers transmis ou arborescences ciblées sans exiger une réécriture globale.
- Croiser les modifications avec le contexte monorepo existant avant d'éditer ou de valider.
- Synchroniser systématiquement le `CHANGELOG.md`.
