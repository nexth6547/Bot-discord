# Checklist de démarrage de session IA

Ce fichier sert à guider les IA et agents qui ouvrent ce repo au début d’une session.

## 1) Vérifier l’état du dépôt

Toujours démarrer par :

```bash
git status --short --branch
```

Si le repo montre un message de divergence comme :

```bash
Your branch and 'origin/main' have diverged
```

ou :

```bash
fatal: Need to specify how to reconcile divergent branches.
```

ne pas essayer de forcer un push immédiatement.

## 2) Synchroniser avec la branche distante avant de modifier quoi que ce soit

Utiliser :

```bash
git fetch origin
git pull --rebase origin main
```

Si un conflit apparaît :
- résoudre les fichiers conflictuels manuellement,
- garder les changements les plus récents de la branche distante si nécessaire,
- puis exécuter :

```bash
git add <fichiers traités>
git rebase --continue
```

## 3) Vérifier le build avant de conclure

Après des changements de code, exécuter au minimum :

```bash
pnpm build
```

## 4) Règles du projet

- respecter les directives de [AGENTS.md](./AGENTS.md)
- mettre à jour [CHANGELOG.md](./CHANGELOG.md) à chaque changement notable
- ne pas modifier la base de données locale sans confirmation expresse
- vérifier les dépendances monorepo/workspaces avant de toucher des imports partagés
- préserver les conventions Prisma / Discord.js / Next.js du projet

## 5) Cas de conflit fréquents

Si un autre codespace ou compte a travaillé sur la même branche :
- ne pas écraser le travail sans validation,
- privilégier `rebase` plutôt que `merge` pour garder un historique propre,
- recommander une synchronisation avant toute modification lourde.

## 6) Commandes de secours

```bash
git status --short --branch
git fetch origin
git pull --rebase origin main
git push origin main
```

## 7) Règle de sécurité

Si l’IA ne sait pas quel état garder lors d’un conflit, elle doit :
- laisser les changements de la branche distante si le code est plus récent,
- préserver les modifications locales seulement si elles sont cohérentes avec le projet,
- vérifier le build à la fin.
