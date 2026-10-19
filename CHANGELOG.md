# Journal des Modifications (CHANGELOG)

Toutes les modifications notables de ce projet seront consignées dans ce fichier.
Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/).

Statuts utilisés : [Effectué], [Terminé], [En cours], [En attente], [Résolu], [Non résolu].

---

## [1.0.33] - 2026-10-19 - Fiabilisation des fixtures SQLite temporaires

### Corrigé [Résolu]
- **Tests bot et dashboard** : déconnexion systématique de chaque PrismaClient avant le nettoyage, y compris après une erreur, puis suppression asynchrone avec retries pour laisser les handles Windows se libérer.
- **Fixtures Discord dashboard** : vidage du cache mémoire lorsque les réponses `fetch` mockées changent, afin que les scénarios d'autorisation ne réutilisent pas une réponse antérieure.

### Notes Techniques
- Aucune assertion modifiée, aucune dépendance ajoutée et aucune base locale utilisée.
- `pnpm test` réussi : 193/193 tests (bot 24/24, dashboard 169/169) ; `pnpm lint` et `pnpm build` réussis le 19 octobre 2026.

---

## [1.0.32] - 2026-10-19 - Centralisation des appels Discord du dashboard

### Ajouté [Effectué]
- **Dashboard API** : module commun pour les appels Discord, avec deux nouvelles tentatives au maximum sur 429, respect borné de `Retry-After`, classification des erreurs HTTP/réseau, déduplication des appels simultanés et cache mémoire de 15 secondes pour les données de guilde.
- **Tests dashboard** : 8 tests avec `fetch` mocké couvrant retries, statuts, réseau, catégorisation des erreurs réseau, déduplication, expiration du cache et séparation des identités d'autorisation ; réussite ciblée le 19 octobre 2026.

### Modifié [Effectué]
- Les routes guildes, resources, overview, server et l'accès aux guildes utilisent désormais le module partagé ; la liste OAuth propre à l'utilisateur n'est pas mise en cache. Les diagnostics existants sont conservés.
- Les fixtures de base temporaire lancent Prisma via Node et son entrée JavaScript afin de ne pas dépendre du shim `.bin` spécifique à Windows.

### Notes Techniques
- Aucun paquet ajouté, aucun appel Discord réel et aucun serveur lancé.
- `pnpm lint`, `pnpm build` et `pnpm test` réussis le 19 octobre 2026 ; `pnpm test` valide 193 tests après correction de la déconnexion/nettoyage des DB temporaires. La validation de la cause réelle des 502 reste ouverte.

---

## [1.0.31] - 2026-10-16 - Diagnostic des échecs Discord du dashboard

### Ajouté [Effectué]
- **Dashboard API** : journalisation des statuts Discord, champs JSON `code`/`message`, `Retry-After` en cas de 429 et exceptions avec nom/message sur les chemins d'autorisation, ressources, aperçu, serveur et liste des guildes.
- **Tests dashboard** : `fetch` mocké vérifiant les logs pour 429, 403, 500 et exception réseau, avec contrôle de l'absence des tokens bot/OAuth dans les sorties.

### Corrigé [Résolu]
- **Logs serveur** : les champs diagnostiques remplacent les valeurs d'environnement et tokens fournis par `[REDACTED]`; les réponses HTTP et corps d'erreur des routes restent inchangés.

### Modifié [Effectué]
- **TODO** : ajout du suivi pour identifier la cause réelle des 502 après collecte des diagnostics.

### Notes Techniques
- Aucune dépendance ajoutée, aucun serveur ou appel réseau réel; tests réalisés avec `fetch` mocké.

---

## [1.0.30] - 2026-10-16 - Correction de l'issuer OAuth Discord

### Corrigé [Résolu]
- **Dashboard OAuth** : configuration de l'issuer Discord `https://discord.com` afin que NextAuth/openid-client accepte le paramètre `iss` renvoyé dans le callback OAuth.

### Ajouté [Effectué]
- **Test dashboard** : vérification que le provider Discord de `authOptions` conserve l'issuer attendu.

### Modifié [Effectué]
- **TODO** : suivi du parcours de connexion OAuth réel, restant à valider manuellement.

### Notes Techniques
- Aucune dépendance mise à jour ni ajoutée ; aucun appel réseau Discord effectué.

---

## [1.0.29] - 2026-10-16 - Garde de l'emplacement du hook Next.js

### Ajouté [Effectué]
- **Test dashboard** : vérification filesystem que `src/instrumentation.ts` existe, exporte `register()` et appelle `assertDashboardEnvironment()`, que le hook à la racine est absent et que `experimental.instrumentationHook` reste activé dans Next.js 14.

### Modifié [Effectué]
- **TODO** : ajout de la preuve de vérification manuelle du démarrage dashboard (distincte des tests automatisés) et des questions ouvertes sur HTTP local et la future validation PostgreSQL.

### Notes Techniques
- Aucun changement à la logique de validation ni au hook déplacé ; aucun serveur démarré, appel réseau ou dépendance ajoutée. Le test de régression inspecte uniquement les fichiers du workspace.

---

## [1.0.28] - 2026-10-16 - Validation de l'environnement au démarrage

### Ajouté [Effectué]
- **Bot et dashboard** : tests des variables requises manquantes/vides, placeholders, secrets de session, callback OAuth, `DATABASE_URL` SQLite et snowflakes ; tests de configuration complète avec valeurs fictives.
- **Dashboard API** : test de `GET /api/guilds` renvoyant `401` sans session et succès avec session valide, en mockant Discord et en utilisant une SQLite temporaire.
- **Dashboard** : validation au démarrage via le hook d'instrumentation Next.js.

### Corrigé [Résolu]
- **Bot** : une configuration invalide échoue désormais au démarrage avec une erreur explicite en tout environnement, au lieu d'un simple avertissement et d'un retour silencieux hors production.
- **Dashboard** : les variables OAuth auparavant seulement averties (et la base non vérifiée) sont maintenant validées et bloquent le démarrage si invalides ; les messages ne contiennent aucune valeur secrète.

### Modifié [Effectué]
- **TODO** : preuves automatisées datées ajoutées pour la configuration et `GET /api/guilds` ; validation OAuth réelle laissée ouverte.

### Notes Techniques
- Aucune dépendance ajoutée, aucune migration ni base locale ; les tests de routes utilisent uniquement des mocks et des bases SQLite temporaires. Les validations réutilisent les primitives TypeScript déjà présentes.
- **Validation locale (16 octobre 2026)** : `pnpm test`, `pnpm lint` et `pnpm build` réussis. Les appels Discord réels et la configuration de callback du portail OAuth restent à valider manuellement.

---

## [1.0.27] - 2026-10-14 - Robustesse du cycle de vie des tickets

### Ajouté [Effectué]
- **Tests dashboard** : couverture de la route POST `/tickets/publish` avec SQLite temporaire et Discord mocké : payload invalide, salon absent/hors guild, salon de mauvais type, permissions bot insuffisantes et échec d'envoi ; vérification d'absence d'écriture lors des refus.
- **Tests bot** : tests du vrai `TicketService` avec base SQLite temporaire pour double clic et créations simultanées, unicité du ticket actif, échecs de création Discord/SQLite, fermeture concurrente, restauration après refus Discord et autorisations de fermeture.

### Corrigé [Résolu]
- **Dashboard API tickets** : `GuildConfig` n'est plus créé avant la validation du payload, des références Discord et l'envoi réussi du panneau ; un refus ou échec d'envoi ne laisse pas d'écriture de configuration.
- **Bot tickets** : détection du conflit Prisma `P2002` basée sur son code d'erreur stable plutôt que sur `instanceof`, pour traiter le conflit d'unicité SQLite et retrouver le ticket gagnant lors de créations simultanées.

### Modifié [Effectué]
- **TODO** : preuves automatisées datées ajoutées aux validations du cycle de vie, de publication et d'autorisation des tickets. La fonctionnalité de réclamation n'existe actuellement pas (aucun bouton/handler `ticket_claim`) ; le test confirme qu'elle ne modifie pas l'état, sans revendiquer une validation d'autorisation d'une fonction absente.

### Notes Techniques
- Aucun nouvel outil ou dépendance ; DB SQLite temporaire par test, mocks Discord uniquement, aucune migration, aucune base locale ni appel réseau réel.
- **Validation locale (14 octobre 2026)** : `pnpm test` (166 tests réussis : 146 dashboard, 20 bot), `pnpm lint` et `pnpm build` réussis. Le build garde les avertissements OAuth attendus tant que les identifiants locaux ne sont pas renseignés.

---

## [1.0.26] - 2026-10-14 - Validation des payloads de configuration

### Ajouté [Effectué]
- **Dashboard API** : tests de refus des POST logs, moderation, welcome, levels, tickets et reaction-roles pour données inconnues/manquantes, mauvais types, snowflakes/références hors guild, limites, bornes XP et JSON invalide ; chaque refus vérifie qu'aucune donnée n'est écrite dans une SQLite temporaire.
- **Bot** : tests mockés de `allowedMentions` pour les messages de bienvenue, de départ et d'annonce XP.

### Corrigé [Résolu]
- **Dashboard API** : les POST de configuration ne créent/synchronisent plus `GuildConfig` avant la validation du payload et des références Discord ; un payload refusé ne laisse donc pas d'écriture partielle.

### Modifié [Effectué]
- **TODO** : preuves des tests automatisés ajoutées pour les six routes ciblées et la politique de mentions ; les essais sur un vrai serveur Discord restent ouverts.

### Notes Techniques
- Aucun nouvel outil ou dépendance ; aucun appel réseau Discord réel ni accès à la base locale.
- **Validation locale (14 octobre 2026)** : `pnpm test` (144 tests réussis), `pnpm lint` et `pnpm build` réussis. Les avertissements OAuth en build restent attendus tant que la configuration locale n'est pas renseignée.

---

## [Non versionné] - 2026-10-14 - Suivi de la signature Git

### Ajouté [En attente]
- **TODO** : suivi du rétablissement et de la validation de la signature des commits dans le Codespace ; la signature ne doit pas être désactivée.

---

## [1.0.25] - 2026-10-13 - Tests d'autorisation des routes guild

### Ajouté [Effectué]
- **Dashboard API** : matrice d'autorisation automatisée pour chaque route et méthode sous `/api/guilds/[guildId]`, avec sessions/Discord mockés et une base SQLite temporaire distincte par test.
- **DELETE rôles interactifs** : test d'un ID d'objet appartenant à une autre guild et vérification qu'il reste en base.

### Modifié [Effectué]
- **Tests/CI** : exécution des tests de routes avec les mocks natifs Node et passage de la CI à Node 24.
- **TODO** : preuve automatisée ajoutée à la ligne de la protection des routes ; validation OAuth réelle laissée en attente.

### Corrigé [Résolu]
- **Rôles interactifs** : le POST crée désormais la configuration parente de la guild avant l'enregistrement du panneau, évitant une erreur de clé étrangère lors de la première création.

### Notes Techniques
- Aucune dépendance ajoutée et aucune base locale utilisée ; le schéma est poussé uniquement vers chaque SQLite temporaire de test.

---

## [1.0.24] - 2026-10-12 - Préparation de la base avant les tests

### Corrigé [Effectué]
- **CI** : compilation de `@bot/database` avant les tests du bot, afin que son point d'entrée `dist/index.js` soit disponible même lorsque les tests sont exécutés avant le build global.

### Notes Techniques
- **Validation** : `pnpm test` exécuté après modification.

---

## [1.0.23] - 2026-10-12 - Cycle de vie local et santé du dashboard

### Ajouté [Effectué]
- **Développement** : commande `pnpm dev:all` pour lancer bot et dashboard ensemble.
- **Santé** : route `/api/health` vérifiant la disponibilité du dashboard et de sa base Prisma.
- **Qualité** : ESLint configuré pour Next.js et ajouté à la CI ; version pnpm verrouillée à `12.3.4`.

### Modifié [Effectué]
- **Bot** : connexion à la base avant login Discord et fermeture de Discord/Prisma sur SIGINT/SIGTERM ; une erreur de login donne un code de sortie en échec.
- **Documentation** : README complété avec les commandes de développement combiné, de production, de tests/lint et l'endpoint de santé.
- **Lint** : corrections des entités JSX et de la dépendance d'effet signalées par le nouveau lint ; commande racine `pnpm lint` ajoutée et exécution incluse dans la CI.
- **Formulaires** : une erreur d'enregistrement permet de réessayer ; un échec du chargement initial bloque la soumission des valeurs par défaut.
- **TODO** : suivi des travaux de cycle de vie et de santé encore restants.

### Notes Techniques
- Aucune migration ni modification de données locales ; l'endpoint de santé ne fait qu'une requête `SELECT 1`.
- **Validation locale** : `pnpm install --frozen-lockfile`, `pnpm test` (4 tests), `pnpm lint` et `pnpm build` réussis ; lancement de `pnpm dev:all` confirmé pour bot et dashboard. L'arrêt propre de l'arbre de processus combiné reste à vérifier depuis un terminal interactif.

---

## [1.0.22] - 2026-10-12 - Premiers tests automatisés et CI

### Ajouté [Effectué]
- **Tests XP** : tests des seuils XP, du changement exact de niveau et des limites du cooldown.
- **CI** : workflow GitHub Actions pour installation pnpm verrouillée, tests et builds sur push/PR vers `main`.

### Modifié [Effectué]
- **Scripts** : ajout de `pnpm test` à la racine et dans le workspace bot.
- **TODO** : suivi explicite de la couverture automatisée restante et du lint à configurer.

### Notes Techniques
- Utilisation du runner natif `node:test` via `tsx` déjà présent dans `@bot/core` ; aucune dépendance ajoutée et aucune base locale modifiée.
- **Validation locale** : `pnpm test` (3 tests réussis) et `pnpm build` réussis. Le workflow GitHub Actions devra encore être confirmé par un run distant.

---

## [1.0.21] - 2026-10-12 - Clarification des validations du TODO

### Modifié [Effectué]
- **TODO** : revue complète des tâches, distinction entre code implémenté et comportement confirmé, et ajout de critères de validation reproductibles pour les parcours locaux, Discord, OAuth et production.
- Les tâches qui nécessitent encore une validation ne sont plus marquées comme terminées ; les essais externes sont signalés sans bloquer le travail local.

### Notes Techniques
- Documentation uniquement : aucun changement de code, de dépendance ou de schéma Prisma. Aucun build requis.

---

## [1.0.20] - 2026-10-12 - Validation de la configuration au démarrage

### Corrigé [Effectué]
- **Configuration du bot** : validation du token et de l'identifiant Discord avant connexion ; en production, le bot refuse de démarrer avec une configuration absente ou invalide.
- **Configuration OAuth du dashboard** : validation des identifiants privés/publics, du secret NextAuth, des URL de base et de callback ; les requêtes d'authentification et d'accès serveur refusent une configuration invalide en production.

### Notes Techniques
- Les vérifications restent des avertissements en développement et ne divulguent aucune valeur secrète. Le build Next.js n'exige pas les secrets de production ; les valeurs doivent être présentes à l'exécution.
- L'inscription effective de l'URL callback dans le portail développeur Discord ne peut pas être vérifiée depuis le code.
- **Validation** : `pnpm build` réussi sans secrets configurés ; avertissements attendus pour la configuration absente de cet environnement.

---

## [1.0.19] - 2026-10-12 - Encadrement des mentions des messages automatiques

### Corrigé [Effectué]
- **Bienvenue et annonces XP** : les messages personnalisés peuvent notifier uniquement le membre concerné ; les mentions générales et de rôles ne sont pas autorisées.
- **Départ** : aucune mention n'est autorisée dans le message personnalisé.

### Notes Techniques
- Les envois Discord des événements d'arrivée, de départ et de montée de niveau définissent explicitement `allowedMentions`.
- **Validation** : `pnpm build` réussi ; les essais de notification réelle sur un serveur Discord restent à faire.

---

## [1.0.18] - 2026-10-12 - Préparation du déploiement hébergé

### Modifié [Effectué]
- **TODO** : ajout des prérequis de déploiement du dashboard Next.js sur Vercel, du bot sur un hébergeur de processus persistant, du passage de SQLite à PostgreSQL en production, de la configuration OAuth Discord et des variables d'environnement.

### Notes Techniques
- Documentation uniquement : aucun changement de code, de dépendance ou de schéma Prisma ; les étapes restent à réaliser et valider avant une mise en production.

---

## [1.0.17] - 2026-10-09 - Exclusion de la base SQLite locale

### Modifié [Effectué]
- **Git** : ajout de `packages/dev.db` au `.gitignore` afin d'éviter d'ajouter par erreur la base locale et ses données au dépôt.

---

## [1.0.16] - 2026-10-09 - Chargement de DATABASE_URL pour Prisma

### Corrigé [Effectué]
- **Commandes Prisma** : les scripts `generate`, `push` et `studio` chargent maintenant explicitement le `.env` racine du monorepo, même lorsque pnpm exécute le script depuis `packages/database`.
- **Configuration absente** : `push` et `studio` affichent un message explicite lorsque `DATABASE_URL` n'est défini ni dans le `.env` racine ni dans l'environnement.

### Notes Techniques
- Ajout de `dotenv` aux dépendances de développement de `@bot/database` et d'un lanceur CLI portable Windows/Linux ; les variables déjà définies par le processus gardent la priorité sur le fichier `.env`.
- **Validation** : `prisma validate` via le lanceur depuis le workspace, `pnpm db:generate` et `pnpm build` réussis ; `db push` non exécuté pour ne pas modifier la base locale sans confirmation.

---

## [1.0.15] - 2026-10-09 - Fiabilisation du cycle de vie des tickets

### Modifié [Effectué]
- **Création des tickets** : clé active unique en base pour empêcher les créations concurrentes ; détection des salons historiques manquants et réconciliation des lignes périmées.
- **Compensation** : suppression du salon créé si l'initialisation du ticket échoue ; journalisation et réponse explicite si le nettoyage ou la finalisation DB échoue.
- **Fermeture** : passage à l'état `CLOSING`, suppression du salon avant l'état `CLOSED`, restauration de l'état ouvert en cas d'échec et réconciliation au redémarrage des fermetures interrompues.

### Notes Techniques
- **Schéma Prisma** : ajout de `Ticket.openTicketKey` nullable et unique. Après sauvegarde de la base, appliquer le schéma local avec `pnpm db:push`, puis générer le client avec `pnpm db:generate` avant de démarrer le bot.
- **Validation** : génération Prisma effectuée ; build complet et `git diff --check` à exécuter après les changements de service.
- Les essais de concurrence et d'échec réel Discord/SQLite restent à faire.

---

## [1.0.14] - 2026-10-09 - Compléments de la feuille de route

### Modifié [Effectué]
- **TODO** : ajout de critères vérifiables concernant les mentions des messages personnalisés, les scénarios de test de bout en bout et la cohérence des tickets en cas de clics concurrents ou d'échecs partiels.

---

## [1.0.13] - 2026-10-09 - Synchronisation du cycle de vie serveur

### Ajouté [Effectué]
- **Synchronisation serveur** : création/réconciliation idempotente de la configuration de chaque serveur à l'ajout du bot et au démarrage ; actualisation du nom et de l'icône sur `guildUpdate`.
- **Retrait du bot** : journalisation de la perte d'accès sans suppression des données du serveur, en attente d'une politique de rétention explicite.

### Corrigé [Effectué]
- **Bienvenue/départ** : alignement des valeurs de repli API sur les valeurs par défaut Prisma et refus d'activer un message sans salon d'envoi sélectionné.
- **Commandes de configuration** : vérification préalable des permissions du bot dans le salon, de `ManageChannels` pour les tickets et de `ManageRoles` pour les panneaux de rôles, afin d'éviter de publier des contrôles inopérants.

### Notes Techniques
- **Validation** : build complet des workspaces réussi ; diagnostics ciblés et `git diff --check` réussis.
- **Données** : aucune suppression ni migration Prisma ; les configurations et données associées sont conservées quand le bot quitte un serveur.

---

## [1.0.12] - 2026-10-09 - Mise à jour des commandes documentées

### Modifié [Effectué]
- **README** : ajout de l'installation pnpm, de la copie du modèle `.env`, de la génération Prisma explicite et d'un tableau des scripts réellement déclarés ; clarification que `pnpm dev` ne lance que le bot et que le lancement local complet nécessite deux terminaux ; mise à jour de la description du thème réel (fond zinc, accents ambre).
- **Base de données** : précision que `db:push` sert au développement local, les migrations et le déploiement de production n'étant pas encore configurés.

### Notes Techniques
- **Validation** : `pnpm db:generate`, `pnpm --filter @bot/database generate` et `pnpm build` réussis ; `git diff --check` vérifié.

---

## [1.0.11] - 2026-10-09 - Clarification du lien développeur Discord

### Modifié [Effectué]
- **Page d’accueil** : remplacement du libellé « Créer l'app Discord » par « Portail développeur Discord », plus précis puisque le lien ouvre le portail développeur et ne crée pas directement l’application.

---

## [1.0.10] - 2026-10-09 - Cohérence des options API

### Corrigé [Effectué]
- **API de modération** : les options anti-spam, rôle administrateur, rôle muet et salon de journaux, non consommées par le bot, ne peuvent plus être enregistrées comme si elles fonctionnaient ; la lecture ne retourne que le rôle modérateur utilisé et le filtre anti-liens.
- **Permissions de modération** : le rôle modérateur reste une exemption du filtre anti-liens, pas un substitut aux permissions Discord ; les commandes de sanction conservent leurs permissions Discord et leurs vérifications de hiérarchie.
- **API des tickets** : le salon de journaux non consommé par le bot n'est plus accepté lors de l'enregistrement des paramètres ou de la publication du panneau.
- **Validation des rôles** : retrait de la validation d'un rôle muet qui n'est plus modifiable depuis les API du dashboard.

### Notes Techniques
- Les colonnes Prisma héritées restent inchangées afin d'éviter une migration destructive ; elles ne sont plus modifiables par ces API.
- **Validation** : `git diff --check` et `pnpm build` réussis après ces ajustements.

---

## [1.0.9] - 2026-10-09 - Connexion des réglages Accueil/Départ

### Modifié [Effectué]
- **Journaux dashboard** : connexion à l'API Prisma, chargement des salons Discord réels, sélection par identifiant, catégories limitées aux événements implémentés et retour explicite des erreurs/sauvegardes.
- **Modération dashboard** : chargement/sauvegarde de la configuration et de l'historique réel des sanctions ; retrait des entrées de démonstration et masquage de l'option anti-spam non implémentée.
- **Niveaux dashboard** : chargement et persistance des paramètres et affichage du vrai classement XP, avec états d'erreur, vide, chargement et sauvegarde.
- **Rôles interactifs** : chargement des panneaux publiés, création d'un vrai message Discord avec bouton compatible avec le handler du bot, puis persistance de son ID ; suppression du message et de la ligne DB uniquement après confirmation Discord.
- **Tickets dashboard** : configuration et liste réelle des tickets ouverts, publication/mise à jour du panneau Discord avec les textes persistés et déplacement du panneau avec suppression de l'ancien message lorsque possible.
- **Options non branchées** : retrait de l'interface de journalisation des tickets, qui n'est pas encore consommée par le bot.
- **Vue d'ensemble** : suppression des chiffres de démonstration ; les comptes de sanctions/tickets/XP viennent de SQLite et le nombre de membres est récupéré comme estimation depuis Discord, avec source et date d'actualisation.
- **Réglages généraux** : retrait des contrôles préfixe/langue qui n'étaient pas consommés par les commandes slash.

### Ajouté [Effectué]
- **Ressources Discord** : route protégée `/api/guilds/[guildId]/resources` qui expose les salons et les rôles assignables réellement disponibles sur le serveur.

### Modifié [Effectué]
- **Accueil/Départ** : chargement des paramètres et des ressources depuis les API, affichage des vrais salons/rôles avec leurs IDs, persistance effective des réglages et états de chargement, erreur et sauvegarde.
- **Validation des permissions** : les écritures vérifient les permissions effectives du bot par salon, en appliquant les overwrites Discord, et contrôlent gestion de salons/rôles et hiérarchie pour les actions concernées.
- **Identité du serveur** : l'icône Discord réelle est affichée dans le menu latéral du dashboard.
- **Configuration Next.js** : le dashboard charge maintenant les variables depuis le `.env` racine, notamment lors du build production.
- **Journaux Discord** : ajout des handlers de changements de rôles et d'états vocaux ; ils alimentent les salons configurés via `LogConfig`.

### Notes Techniques
- **Validation** : `pnpm build` réussit pour les trois workspaces ; le dashboard ne signale plus les variables root `.env` comme absentes.
- **Dépendance** : ajout de `dotenv` au workspace dashboard et mise à jour de `pnpm-lock.yaml` pour charger explicitement le `.env` du monorepo.
- Les formulaires des autres onglets et les tests de parcours Discord restent ouverts dans [TODO.md](./TODO.md).

---

## [Non versionné] - 2026-10-09 - Configuration locale

### Ajouté [Effectué]
- **Environnement local** : création d'un fichier `.env` ignoré par Git, basé sur `.env.example` et réservé à la configuration locale, sans ajout au dépôt.

### Corrigé [Effectué]
- **Secret NextAuth local** : remplacement de la valeur d'exemple par un secret aléatoire cryptographique généré localement ; sa valeur n'est ni affichée ni ajoutée au dépôt.

### Notes Techniques
- Les identifiants Discord du fichier local sont renseignés ; le fichier `.env` reste ignoré par Git.

---

## [1.0.8] - 2026-10-09 - Validation de démarrage et variables d'environnement

### Ajouté [Effectué]
- **Validation de configuration** : ajout d'un contrôle de démarrage pour les variables Discord et NextAuth afin d'alerter sur les secrets de démonstration, les identifiants manquants et les valeurs non conformes avant le lancement du bot ou de l'authentification dashboard.

### Modifié [Effectué]
- **Runtime configuration** : les warnings de démarrage ne bloquent plus le build local, tout en restant visibles lors du lancement réel pour éviter les installations incomplètes en production.

### Notes Techniques
- **Impact** : validation légère des variables `DISCORD_TOKEN`, `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL` et détection des placeholders de développement (`VOTRE_*`, `une_cle_secrete...`).
- **Compatibilité** : le build monorepo continue d'être exécutable sans `.env` local, tout en signalant les variables manquantes de manière explicite.

---

## [1.0.7] - 2026-10-08 - Audit de sécurité et de cohérence

### Modifié [Effectué]
- **Dashboard** : protection des pages et des API par session Discord, permissions Administrateur/Gérer le serveur et présence effective du bot.
- **Authentification** : renouvellement des jetons OAuth Discord ; les erreurs d'expiration sont traitées sans fallback secret de développement.
- **API de configuration** : validation des champs autorisés, tailles, types, valeurs XP et identifiants de salons/rôles appartenant au serveur.
- **Bot** : vérification des permissions des commandes sensibles, de la hiérarchie avant sanction, et de l'enregistrement des boutons d'auto-rôle ; fermeture de ticket réservée à l'auteur, au support ou au personnel autorisé.
- **Tickets** : `/ticket-setup` utilise les textes du panneau persistés en base.
- **Invitation Discord** : remplacement de `Administrator` par le jeu de permissions nécessaires au bot.

### Corrigé [Effectué]
- **Rôles interactifs** : suppression du faux enregistrement `messageId: "pending"` ; la route de création renvoie désormais une erreur explicite tant que la publication Discord n'est pas prise en charge. La suppression du dashboard efface le message Discord et vérifie le serveur propriétaire de l'enregistrement.
- **Auto-Modération** : un échec de suppression d'un message contenant un lien interdit n'est plus suivi d'un avertissement laissant croire que le message a été supprimé.
- **Erreurs API** : suppression des détails Prisma des réponses envoyées aux clients ; journalisation côté serveur.

### Notes Techniques
- **Validation** : génération/build du package database, vérification TypeScript du dashboard et builds du bot et du dashboard réussis.
- **Limites restantes** : les formulaires du dashboard restent des maquettes ; les tests automatisés, les migrations Prisma, la configuration de production et la validation manuelle sur Discord restent à faire. Voir [TODO.md](./TODO.md).

---

## [1.0.6] - 2026-09-25 - Feuille de route opérationnelle

### Ajouté [Effectué]
- **Documentation projet** : ajout de `TODO.md` à la racine avec les travaux restants, priorités et critères de livraison vers un bot et un dashboard pleinement opérationnels et automatisés.

---

## [1.0.5] - 2026-09-25 - Sélection réelle des serveurs Discord

### Modifié [Effectué]
- **Dashboard** : remplacement des serveurs de démonstration par les serveurs administrables retournés par l'API OAuth Discord, avec comptage approximatif et présence du bot issue de la base.
- **Authentification** : la route de liste exige une session Discord et filtre les serveurs selon les permissions Administrateur ou Gérer le serveur.

---

## [1.0.4] - 2026-09-25 - Correction du build du package database

### Corrigé [Effectué]
- **Types Node.js** : déclaration de `@types/node` dans `@bot/database`, nécessaire à la compilation de ses références à `process.env`.
- **Client Prisma** : génération automatique du client partagé après l'installation pnpm.
- **Build du bot** : correction du type nullable de l'icône de serveur et vérification que le canal accepte l'envoi avant de publier l'avertissement d'Auto-Mod.

### Notes Techniques
- La première installation pnpm a nécessité l'approbation des scripts Prisma et esbuild. Le build complet a aussi révélé l'absence de types Node.js dans le package partagé, de génération Prisma à l'installation et deux erreurs TypeScript dans le bot.
- **Validation** : installation pnpm forcée, build complet des trois workspaces et réponse HTTP `200` du dashboard validés. Le fichier de types généré par Next.js est ignoré par Git.

---

## [1.0.3] - 2026-09-25 - Migration vers pnpm

### Modifié [Effectué]
- **Gestionnaire de paquets** : migration des scripts et installations du monorepo de npm vers pnpm. [Effectué]
- **Workspaces locaux** : remplacement de `"@bot/database": "*"` par `"@bot/database": "workspace:*"` dans le bot et le dashboard pour forcer la résolution du package local. [Effectué]
- **Scripts racine** : remplacement des options npm `--workspace` par les filtres pnpm `--filter`. [Effectué]
- **Documentation** : commandes de base de données et de démarrage mises à jour dans le README. [Effectué]

### Problèmes rencontrés et solutions [Résolu]
- **Erreur `ERR_PNPM_FETCH_404`** : pnpm interprétait la dépendance `@bot/database: "*"` comme un paquet à télécharger depuis le registre npm. [Résolu]
  - **Solution** : utilisation du protocole local `workspace:*` dans les deux applications. [Résolu]
- **Erreur Windows `EISDIR` / `-4068` avec npm** : la création des liens des workspaces npm échouait dans l'environnement Windows. [Résolu]
  - **Solution** : passage à pnpm et déclaration explicite des packages dans `pnpm-workspace.yaml`. [Résolu]

### État [En attente]
- La configuration du monorepo est alignée sur pnpm. [Terminé]
- L'installation des dépendances et le build restent à valider avec `pnpm install` puis `pnpm build`. [En attente]

---

---

## [1.0.2] - 2026-09-25 - Correction de configuration OAuth / Dashboard

### Modifié [Effectué]
- **Correction de la variable publique Discord** : ajout de `NEXT_PUBLIC_DISCORD_CLIENT_ID` dans le template d’environnement pour que le dashboard puisse générer correctement le lien d’invitation du bot depuis le client. [Effectué]
- **Correction de fallback côté dashboard** : le composant de sélection de serveur utilise maintenant `NEXT_PUBLIC_DISCORD_CLIENT_ID` puis `DISCORD_CLIENT_ID` comme valeur de secours, évitant une URL invalide avec la valeur par défaut `123`. [Effectué]
- **Documentation alignée** : mise à jour du README et de `.env.example` pour refléter la configuration nécessaire au bon fonctionnement de l’authentification Discord et de l’invitation du bot. [Effectué]

### Problèmes rencontrés et solutions [Résolu]
- **Mauvaise cohérence des variables d’environnement côté client** : le code utilisait `NEXT_PUBLIC_DISCORD_CLIENT_ID` alors que le fichier `.env` ne le définissait pas. Cela pouvait produire un lien d’invitation invalide ou un fallback générique. [Résolu]
  - **Solution** : ajout explicite de `NEXT_PUBLIC_DISCORD_CLIENT_ID` dans le template `.env.example` et fallback logique dans le code. [Résolu]
- **Blocage de l’installation du monorepo sur Windows** : `npm install` a échoué avec `EISDIR` et la création du workspace `@bot/database` a été bloquée par une limitation de symlink/junction Windows, empêchant la résolution du package partagé. [Non résolu]
  - **Cause** : l’environnement Windows actuel n’autorisait pas la création du lien de workspace nécessaire au monorepo, sans élévation de privilèges ou activation du mode développeur. [Non résolu]
  - **Solution recommandée** : lancer PowerShell en mode Administrateur, vérifier que Node.js/npm sont bien disponibles dans le `PATH`, puis relancer `npm install`. En cas de blocage persistant, activer le Mode Développeur Windows ou exécuter la commande depuis un terminal administrateur. [En attente]

---

## [1.0.1] - 2026-09-25 - Publication GitHub

### État du projet [Terminé]
- **Projet prêt pour publication GitHub** : le nom Bloomera a été appliqué au dashboard et au branding du bot, avec une identité visuelle ambrée / dorée cohérente. [Effectué]
- **Version de travail stabilisée** : les modifications visuelles et les réglages de configuration ont été documentées et consolidées dans le journal du projet. [Effectué]

### Modifié [Effectué]
- **Renommage du projet en Bloomera** : interface dashboard, labels et métadonnées mises à jour pour refléter l'identité du bot. [Effectué]
- **Nouveau thème visuel** : palette de couleurs ambrée / dorée appliquée au dashboard pour une ambiance plus chaleureuse et personnalisée. [Effectué]
- **Ajustement des couleurs de bienvenue** : définition de la palette Bloomera (`#F59E0B`) pour les embeds de bienvenue et autres messages configurables du bot. [Effectué]

### Problèmes rencontrés et solutions [Résolu]
- **Erreur d’environnement de validation** : lors du test de build du dashboard, la commande `npm run build:dashboard` a échoué avec `CommandNotFoundException` dans le terminal PowerShell, indiquant que `npm` n’était pas disponible dans le `PATH` de l’environnement. [Résolu]
  - **Solution** : validation du problème comme source d’environnement, sans modifier le projet ; la vérification technique a été reportée au moment où Node.js/npm est correctement installé ou activé dans le terminal. [Résolu]
- **Conflit visuel avec le thème générique initial** : le dashboard utilisait encore des accents neutres et `indigo` par défaut, ce qui ne correspondait pas à l’identité Bloomera. [Résolu]
  - **Solution** : remplacement des libellés et accents par une palette ambrée/dorée plus chaleureuse, avec un nom visible dans l’interface et le layout principal. [Résolu]
- **Cohérence de la palette de bienvenue** : le fallback de configuration et le schéma Prisma conservaient encore une couleur Discord standard (`#5865F2`) incompatible avec le thème Bloomera. [Résolu]
  - **Solution** : mise à jour du schéma Prisma et de la réponse API par défaut vers `#F59E0B`, afin d’assurer une cohérence entre la base de données, l’interface et les messages envoyés par le bot. [Résolu]

### Notes Techniques [Effectué]
- Le terminal utilisé pour les vérifications est PowerShell Windows, où `npm` n’était pas présent dans le `PATH` au moment de l’essai. [Effectué]
- La personnalisation visuelle a été appliquée sans réécriture globale, en ciblant les fichiers de layout, de page d’accueil, de sidebar et de configuration de bienvenue. [Effectué]
- Le projet est désormais considéré comme **prêt pour publication GitHub** après cette révision fonctionnelle et documentée. [Terminé]

---

## [1.0.0] - 2026-09-25

### Initialisation de la Suite Monorepo (Bot Discord + Dashboard Next.js)

#### Ajouté
- **Architecture Monorepo (npm workspaces)** :
  - `apps/bot` : Application Discord.js v14 (commandes slash, événements, système d'audit logs, tickets, XP, rôles par boutons, modération).
  - `apps/dashboard` : Interface web d'administration Next.js (gestion des configurations de guilde, audit logs, classements XP).
  - `packages/database` : Schéma Prisma centralisé et client partagé (`@bot/database`).
- **Modération & Sécurité** :
  - Commandes `/ban`, `/kick`, `/timeout`, `/warn`, `/warnings`, `/clear`.
  - Système d'automodération (détection liens suspects / invitations).
- **Gestion des Membres & Logs** :
  - Système de bienvenue et au revoir configurable.
  - Salons d'audit logs dédiés (Modération, Messages, Membres, Vocaux).
- **Système de Support (Tickets)** :
  - Panneau interactif via bouton et gestion des permissions par salon dédié.
- **Système d'Engagement** :
  - Calcul et progression d'XP par message avec cooldown.
  - Commandes `/rank` et `/leaderboard`.
- **Rôles par Interaction** :
  - Panneaux de sélection de rôles par boutons (`/reactionrole-setup`).
- **Configuration & Environnement** :
  - Fichier de base de configuration `.env.example` et support SQLite / Prisma.
  - Configuration TypeScript partagée via `tsconfig.base.json`.

#### Notes Techniques
- Cohérence des modules TypeScript entre `apps` et `packages`.
- Validation stricte des intents Discord.js v14 requis pour les logs et événements de guilde.
