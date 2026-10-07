# Bloomera — feuille de route vers un fonctionnement complet

État audité le 25 septembre 2026. « 100 % opérationnel » signifie que les fonctions présentées sont réellement branchées, sécurisées, testées sur Discord et redémarrent sans intervention manuelle.

## Déjà validé

- [x] Monorepo installé avec pnpm, client Prisma généré automatiquement après installation.
- [x] Build réussi pour `@bot/database`, `@bot/core` et `@bot/dashboard`.
- [x] Sélection du dashboard alimentée par OAuth Discord, limitée aux serveurs où le compte a les permissions requises ; la route répond `401` sans session.
- [x] Présence du bot dans la liste déterminée à partir des configurations enregistrées en base.

La connexion OAuth avec un vrai compte, l’accès aux serveurs réels et les commandes Discord n’ont pas encore été validés de bout en bout dans cette session.

## P0 — Sécurité et parcours réels du dashboard

- [ ] Protéger toutes les pages `/dashboard/[guildId]` : session obligatoire, permission Discord `Administrator` ou `ManageGuild`, bot réellement présent sur le serveur.
- [ ] Appliquer la même autorisation à chaque route `/api/guilds/[guildId]`, y compris `GET`, `POST` et `DELETE` ; vérifier l’appartenance de l’objet supprimé au serveur demandé.
- [ ] Valider les corps de requête, les identifiants Discord, les permissions du bot et la hiérarchie des rôles avant toute écriture ; renvoyer des erreurs propres sans exposer les détails Prisma.
- [ ] Gérer l’expiration/révocation du jeton OAuth et demander une reconnexion claire plutôt que laisser échouer le chargement.
- [ ] Remplacer les valeurs locales et boutons de sauvegarde simulés de chaque onglet par les valeurs de l’API et des enregistrements Prisma :
  - [ ] Vue d’ensemble : supprimer les compteurs fictifs (membres, sanctions, tickets, XP), afficher des données réelles avec leur source et leur date d’actualisation.
  - [ ] Paramètres généraux : charger et sauvegarder les valeurs réelles. Le préfixe et la langue sont actuellement présentés dans l’interface mais ne pilotent pas les commandes du bot ; les implémenter réellement ou retirer ces réglages.
  - [ ] Accueil/départ : brancher lecture et sauvegarde, utiliser les vrais salons et rôles Discord et afficher les vraies valeurs initiales.
  - [ ] Modération : charger/sauvegarder la configuration et l’historique réel des sanctions ; retirer les lignes d’exemple.
  - [ ] Journaux : charger/sauvegarder les salons réels et ne pas annoncer les catégories vocales/rôles tant que leurs événements ne sont pas traités.
  - [ ] Tickets : charger/sauvegarder les paramètres et tickets réels ; publier ou mettre à jour le vrai panneau Discord depuis le dashboard.
  - [ ] Niveaux : charger/sauvegarder les paramètres et le vrai classement XP ; retirer les membres d’exemple.
  - [ ] Rôles interactifs : lister les panneaux réellement publiés ; créer/supprimer à la fois les messages Discord et leurs enregistrements. Ne jamais créer d’entrée avec `messageId: "pending"` comme si le bouton fonctionnait.
- [ ] Ajouter une route serveur protégée fournissant les salons, catégories et rôles réels du serveur ; les sélecteurs ne doivent plus contenir de noms fictifs ni confondre nom affiché et ID Discord.
- [ ] Synchroniser le nom et l’icône du serveur dans le layout et les pages au lieu d’utiliser un nom constant.
- [ ] Ajouter chargement, état vide, erreur, sauvegarde en cours et confirmation réelle pour chaque formulaire ; une sauvegarde affichée comme réussie doit avoir reçu une réponse serveur positive.

## P0 — Cohérence entre configuration et comportement du bot

- [ ] Faire utiliser au panneau de tickets les valeurs `panelTitle`, `panelDescription` et `buttonText` ; actuellement `/ticket-setup` envoie un contenu codé en dur. Confirmer que les paramètres modifiés dans le dashboard sont ceux lus par `TicketService`.
- [ ] Implémenter la protection anti-spam annoncée (seuil, fenêtre temporelle, sanction configurable), ou supprimer/masquer le réglage `autoModAntiSpam` tant qu’elle n’existe pas.
- [ ] Implémenter et vérifier les contrôles liés aux rôles modérateur, administrateur et muet ; ces valeurs existent en base mais leur usage effectif doit être défini et testé.
- [ ] Ajouter les événements manquants pour que les journaux vocaux et de rôles fonctionnent réellement (états vocaux et changements de membre/rôle), ou retirer ces choix des réglages.
- [ ] Vérifier les valeurs de bienvenue et de départ, les salons, l’auto-rôle et les couleurs de secours entre schéma, dashboard et handlers ; garder la palette Bloomera cohérente.
- [ ] Vérifier le cycle de vie d’un serveur : création/synchronisation de la configuration à l’ajout du bot, mise à jour du nom/icône, traitement du retrait du bot et nettoyage/archivage des données associées.
- [ ] Vérifier chaque commande slash contre les permissions Discord, la hiérarchie des rôles, les cibles invalides et les échecs d’API ; les permissions déclarées sur une commande ne remplacent pas les contrôles nécessaires dans le handler.

## P1 — Données, tests et qualité

- [ ] Ajouter une validation de configuration au démarrage : variables requises, formats Discord/OAuth, URL de callback et refus des secrets de développement en production.
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
