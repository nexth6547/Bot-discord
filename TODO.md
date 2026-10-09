# Bloomera — feuille de route vers un fonctionnement complet

État audité le 9 octobre 2026. « 100 % opérationnel » signifie que les fonctions présentées sont réellement branchées, sécurisées, testées sur Discord et redémarrent sans intervention manuelle.

## Vérifié et corrigé lors de l'audit du 8 octobre

- [x] Les pages de configuration d'un serveur et les routes API par serveur vérifient la session, les permissions Discord et la présence du bot.
- [x] Les écritures de configuration n'acceptent plus les champs Prisma arbitraires ; les types, tailles et formats des identifiants sont validés, ainsi que l'appartenance des salons/rôles au serveur.
- [x] Le jeton OAuth Discord est renouvelé avec son jeton de rafraîchissement ; les échecs sont journalisés sans divulguer de secrets.
- [x] La suppression d'un panneau de rôle est limitée au serveur autorisé et supprime également son message Discord ; l'API n'invente plus de message `pending`.
- [x] Les commandes sensibles revalident les permissions au moment de l'exécution ; les sanctions vérifient la hiérarchie des rôles et les boutons de rôle vérifient leur enregistrement et la hiérarchie du bot.
- [x] Le panneau de tickets du bot réutilise les textes enregistrés et sa fermeture est limitée à l'auteur, au support ou au personnel autorisé.
- [x] L'invitation du bot ne demande plus la permission Administrator ; les échecs de suppression Auto-Mod ne sont plus présentés comme des succès.

Ces corrections ne valident pas les parcours Discord réels et ne remplacent pas les éléments encore ouverts ci-dessous. Les pages de configuration actuellement livrées sont reliées à leurs API et données réelles ; les parcours Discord réels, les contrôles d'erreur exhaustifs et les éléments encore ouverts ci-dessous restent à valider. Ne pas considérer les critères de livraison comme atteints.

## Déjà validé

- [x] Monorepo installé avec pnpm, client Prisma généré automatiquement après installation.
- [x] Build réussi pour `@bot/database`, `@bot/core` et `@bot/dashboard`.
- [x] Sélection du dashboard alimentée par OAuth Discord, limitée aux serveurs où le compte a les permissions requises ; la route répond `401` sans session.
- [x] Présence du bot dans la liste déterminée à partir des configurations enregistrées en base.

La connexion OAuth avec un vrai compte, l’accès aux serveurs réels et les commandes Discord n’ont pas encore été validés de bout en bout dans cette session.

## P0 — Sécurité et parcours réels du dashboard

- [x] Protéger toutes les pages `/dashboard/[guildId]` : session obligatoire, permission Discord `Administrator` ou `ManageGuild`, bot réellement présent sur le serveur.
- [x] Appliquer la même autorisation à chaque route `/api/guilds/[guildId]`, y compris `GET`, `POST` et `DELETE` ; vérifier l’appartenance de l’objet supprimé au serveur demandé.
- [x] Compléter la validation des écritures par le calcul des permissions effectives du bot (rôles cumulés et overwrites @everyone/rôles/membre), avec les permissions d'envoi/embeds, de gestion des salons et de hiérarchie d'attribution nécessaires aux références utilisées.
- [x] Gérer l’expiration/révocation du jeton OAuth et demander une reconnexion claire plutôt que laisser échouer le chargement.
- [ ] Remplacer les valeurs locales et boutons de sauvegarde simulés de chaque onglet par les valeurs de l’API et des enregistrements Prisma :
  - [x] Vue d’ensemble : supprimer les compteurs fictifs (membres, sanctions, tickets, XP), afficher des données réelles avec leur source et leur date d’actualisation.
  - [x] Paramètres généraux : retirer les contrôles du préfixe et de la langue tant qu'ils ne pilotent pas réellement les commandes du bot.
  - [x] Accueil/départ : brancher lecture et sauvegarde, utiliser les vrais salons et rôles Discord et afficher les vraies valeurs initiales.
  - [x] Modération : charger/sauvegarder la configuration et l’historique réel des sanctions ; retirer les lignes d’exemple.
  - [x] Journaux : charger/sauvegarder les salons réels ; les catégories vocales et rôles ont leurs handlers d'événements.
  - [x] Tickets : charger/sauvegarder les paramètres et tickets réels ; publier ou mettre à jour le vrai panneau Discord depuis le dashboard.
  - [x] Niveaux : charger/sauvegarder les paramètres et le vrai classement XP ; retirer les membres d'exemple.
  - [x] Rôles interactifs : lister les panneaux réellement publiés ; créer/supprimer à la fois les messages Discord et leurs enregistrements. Ne jamais créer d’entrée avec `messageId: "pending"` comme si le bouton fonctionnait.
- [x] Ajouter une route serveur protégée fournissant les salons, catégories et rôles réels du serveur ; les sélecteurs de la page Accueil/Départ utilisent désormais les IDs Discord, les noms restent des libellés.
- [x] Synchroniser aussi l’icône du serveur dans le layout et les pages ; le nom et l'icône sont chargés depuis Discord dans le layout.
- [ ] Ajouter chargement, état vide, erreur, sauvegarde en cours et confirmation réelle pour chaque formulaire ; une sauvegarde affichée comme réussie doit avoir reçu une réponse serveur positive.

## P0 — Cohérence entre configuration et comportement du bot

- [x] Faire utiliser au panneau de tickets les valeurs `panelTitle`, `panelDescription` et `buttonText` enregistrées par le dashboard et mettre à jour le panneau Discord existant lors d'une demande explicite de publication/mise à jour ; `/ticket-setup` réutilise aussi les valeurs enregistrées.
- [x] Masquer le réglage anti-spam dans le dashboard tant que sa protection configurable n'est pas implémentée.
- [x] Refuser aussi par API les réglages de modération et de journalisation sans effet ; ne retourner à la page Modération que les options effectivement prises en charge.
- [x] Définir le périmètre des rôles de modération : `modRoleId` exempte uniquement du filtre anti-liens ; les commandes de sanction exigent toujours les permissions Discord appropriées et respectent la hiérarchie. Les champs historiques `adminRoleId` et `muteRoleId`, sans comportement implémenté, ne sont plus modifiables par l'API du dashboard.
- [x] Ajouter les événements manquants pour que les journaux vocaux et de rôles fonctionnent réellement (états vocaux et changements de membre/rôle).
- [ ] Vérifier les valeurs de bienvenue et de départ, les salons, l’auto-rôle et les couleurs de secours entre schéma, dashboard et handlers ; garder la palette Bloomera cohérente.
- [ ] Vérifier le cycle de vie d’un serveur : création/synchronisation de la configuration à l’ajout du bot, mise à jour du nom/icône, traitement du retrait du bot et nettoyage/archivage des données associées.
- [ ] Compléter les contrôles de toutes les commandes slash sur les cibles invalides, la hiérarchie et les permissions du bot ; les commandes sensibles revalident désormais les permissions du membre, et les sanctions vérifient la hiérarchie de leur cible.

## P1 — Données, tests et qualité

- [ ] Ajouter une validation de configuration au démarrage : variables requises, formats Discord/OAuth, URL de callback et refus des secrets de développement en production.
- [x] Charger dans Next.js les variables du `.env` à la racine du monorepo, y compris `NEXT_PUBLIC_DISCORD_CLIENT_ID` au build du dashboard.
- [ ] Remplacer `prisma db push` comme procédure de production par des migrations versionnées, avec une procédure documentée de sauvegarde et restauration SQLite.
- [ ] Garantir qu’une base fraîche peut être initialisée automatiquement et que le bot et le dashboard attendent une base prête avant de traiter les requêtes.
- [ ] Ajouter des tests automatisés : permissions et autorisations API, persistance des réglages, calcul XP/cooldown, modération, tickets, rôles interactifs et handlers d’événements.
- [ ] Ajouter des scripts de test et de vérification des types/lint dans le monorepo, puis une CI qui exécute installation verrouillée, tests et builds sur chaque changement.
- [ ] Tester sur un serveur Discord de test avec des permissions minimales, des rôles proches de la hiérarchie du bot et des salons supprimés/renommés.
- [ ] Vérifier les limites Discord : délais d’interaction, rate limits, contenu d’embed, permissions manquantes, utilisateurs/canaux partiels et réponses après une interaction déjà différée.
- [ ] Encadrer la collecte et la conservation des données : contenu des messages journalisés, sanctions, données XP, suppression à la demande et durée de rétention.

## P1 — Démarrage et exploitation automatiques

- [ ] Ajouter une commande unique de développement qui lance dashboard et bot ensemble, avec arrêt propre des deux processus ; aujourd’hui ils sont lancés dans des terminaux séparés.
- [ ] Définir la cible de déploiement et fournir une configuration reproductible (service Windows/Linux ou conteneurs), variables d’environnement documentées, build de production et commande de démarrage.
- [ ] Configurer redémarrage automatique après crash/redémarrage machine, arrêt propre (`SIGINT`/`SIGTERM`) et fermeture de Prisma ; vérifier la reconnexion Discord.
- [ ] Automatiser migrations et génération Prisma au déploiement, sans exécuter de migration destructive sans sauvegarde.
- [ ] Mettre en place logs exploitables, niveaux de gravité, rotation/rétention, suivi des erreurs et alertes de disponibilité ; ne jamais journaliser les tokens.
- [ ] Ajouter une vérification de santé du dashboard, du bot et de la base, plus une procédure de diagnostic lorsque Discord, SQLite ou OAuth est indisponible.
- [ ] Planifier des sauvegardes SQLite automatiques et tester périodiquement leur restauration.
- [ ] Documenter l’invitation Discord avec uniquement les permissions/intents requis, l’activation des intents privilégiés, la création OAuth et la rotation des secrets.

## Critères de livraison

- [ ] Depuis un clone propre : installation pnpm, préparation de la base, configuration guidée des secrets et lancement réussissent sans manipulations cachées.
- [ ] Un administrateur se connecte, voit uniquement ses serveurs gérables et ne peut ni lire ni modifier les données d’un autre serveur.
- [ ] Chaque réglage affiché est persisté, relu après rechargement/redémarrage et consommé par le bot ; chaque action Discord est vérifiable sur le serveur.
- [ ] Les tests, le lint/typecheck et les builds passent en CI ; les échecs externes (Discord/OAuth/SQLite) sont visibles et récupérables.
- [ ] En production, bot et dashboard redémarrent automatiquement, les données sont sauvegardées et les secrets ne sont pas exposés.
