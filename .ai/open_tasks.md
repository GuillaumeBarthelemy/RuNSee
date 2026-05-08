# Open Tasks

## Termines dans la passe de fiabilisation frontend/backend/science/UX

- [x] Monter la route backend assistant existante sur `/assistant`.
- [x] Enrichir `/health` avec un probe Prisma et un timestamp sans exposer de secrets.
- [x] Standardiser les erreurs backend avec un objet `error` tout en gardant le format legacy.
- [x] Renforcer la confiance de l'Aptitude RunNSee selon le poids de sources et la couverture recente.
- [x] Harmoniser le libelle canonique `Aptitude RunNSee` et garder l'ancien libelle en alias glossaire.
- [x] Ajouter un controle de drift Prisma SQLite/PostgreSQL.

## Termines dans la stabilisation pre-ajouts

- [x] Ajouter `.gitattributes` et un script d'archive source propre.
- [x] Rendre `validate-green-stack.ps1` compatible avec checks publics sans session et checks authentifies avec cookie.
- [x] Conserver les champs Garmin `recoveryTime*` dans le bridge activite.
- [x] Normaliser `recoveryTime` Garmin en heures cote backend.
- [x] Ne plus deplacer `ExternalProviderConnection.lastSyncAt` lors d'un enrichissement activite Garmin.
- [x] Ajouter un diagnostic non sensible `fieldCoverage` sur les activites Garmin recuperees.
- [x] Clarifier les libelles Garmin dans l'onglet activite.
- [x] Durcir le preflight de l'import PostgreSQL.
- [x] Ajouter des tests backend purs sur matching et normalisation Garmin.

## Termines dans la derniere passe

- [x] Securiser les ignore files et retirer de l'index les artefacts locaux/secrets/logs.
- [x] Appliquer les migrations SQLite locales et regenerer Prisma.
- [x] Completer `backend/scripts/db/tableDefinitions.js` pour toutes les tables actuelles.
- [x] Durcir `import-postgresql-dump.js` : dry-run, garde-fou truncate/append, comparaison de comptage.
- [x] Etendre `report-database-snapshot.js` aux tables Garmin/settings et indicateurs d'integrite.
- [x] Ajouter le service backend Garmin activites ciblees.
- [x] Ajouter `POST /providers/garmin/activities/enrich`.
- [x] Exposer l'enrichissement Garmin dans le detail activite.
- [x] Ajouter l'action frontend de completion Garmin sur la fiche activite.
- [x] Ajouter tests edge cases Garmin `activityEnrichment`.

## A faire / validation manuelle

- [x] Ajouter les statuts Strava/Garmin dans le layout global.
- [x] Ajouter la synchronisation globale Strava incremental + Garmin recovery recent + Garmin activites recentes bornees.
- [x] Ajouter le socle de calcul trail prudent avec tests frontend.
- [x] Ajouter le contexte trail minimal dans Aujourd'hui.
- [x] Ajouter la lecture trail conditionnelle sur le detail activite.
- [x] Ajouter la carte Specificite trail dans Analytics.
- [x] Ajouter les champs trail optionnels sur les objectifs course.
- [x] Ajouter les entrees glossaire trail.
- [x] Appliquer la nouvelle migration `20260507123000_add_trail_race_objective_fields` sur les environnements cibles.
- [ ] Tester `POST /sync/all` avec Strava seul, Garmin seul, puis les deux connectes.
- [ ] Verifier que le job `global_incremental` enrichit bien les activites Garmin recentes apres l'import Strava incremental.
- [ ] Verifier que `GARMIN_ACTIVITY_ENRICHMENT_GLOBAL_DAYS` reste borne a 30 jours et ne lance aucun backfill massif.
- [ ] Verifier visuellement la sidebar provider sur mobile et ecran etroit.
- [ ] Verifier visuellement la nouvelle carte `Lecture du jour` sur mobile et ecran etroit.
- [ ] Ouvrir une activite route plate : l'onglet Trail ne doit pas apparaitre.
- [ ] Ouvrir une activite vallonnee/trail enrichie : l'onglet Trail doit apparaitre avec D+/D- et vigilance prudente.
- [ ] Creer un objectif trail et verifier sa persistance en DB.
- [ ] Tester l'enrichissement Garmin sur une activite reelle apres connexion Garmin.
- [ ] Verifier que `ActivityProviderEnrichment.status` vaut `matched_exact` ou `matched_tolerated` quand le matching est fiable.
- [ ] Verifier qu'un cas ambigu ne cree pas d'association automatique.
- [ ] Verifier que les metriques affichees dans l'onglet Garmin correspondent au payload Garmin reel.
- [ ] Appliquer/valider l'import PostgreSQL sur une base cible de preprod ou prod uniquement avec backup et option explicite (`--truncate` ou `--allow-append`).
- [ ] Verifier le deploiement CI/CD GitHub Actions vers la VM apres le push final.

## Multi-sources Strava/Garmin

- [x] Ajouter le socle DB multi-source sur `Activity`.
- [x] Ajouter `ActivityProviderLink`.
- [x] Ajouter `ProviderBackfillCursor`.
- [x] Ajouter normalisation Garmin activity -> candidate canonique.
- [x] Ajouter matching provider exact/probable/ambiguous/not_found.
- [x] Autoriser la creation Garmin-only sur la sync Garmin recente si aucun match Strava fiable n'existe.
- [x] Adapter `/sync/all` aux modes `strava_primary_garmin_enrichment_with_fallback`, `strava_only`, `garmin_primary`.
- [x] Adapter la navigation liste/detail activite pour ne plus bloquer sans `stravaActivityId`.
- [x] Renforcer le matching Strava/Garmin contre les doublons inter-provider.
- [x] Ajouter une detection dry-run des doublons Strava/Garmin.
- [x] Ajouter une reparation explicite par soft-merge Garmin -> Strava.
- [x] Exclure les activites fusionnees des lectures courantes.
- [x] Corriger le lifecycle du job global pour ne pas terminer avant Garmin.
- [ ] Recette reelle Strava + Garmin avec une activite Garmin absente de Strava.
- [ ] Recette Garmin seul apres migration en environnement de test.
- [ ] Finaliser l'orchestration longue duree du backfill historique Garmin 180 j/h cote UI/admin.
- [x] Executer le script de detection de doublons en prod, valider le dry-run, puis appliquer si le rapport est coherent.
- [x] Corriger le matching UTC/local qui empechait la detection effective des doublons Garmin/Strava.
- [x] Valider en base que les doublons recents Garmin/Strava ne sont plus visibles dans les lectures `isMerged=false`.
- [ ] Valider visuellement la page Activites en session utilisateur apres refresh complet.
- [ ] Tester une nouvelle synchronisation Strava + Garmin et confirmer que le compteur de doublons reste a 0.

## Correctif UX Aujourd'hui

- [x] Rendre le filtre sport Aujourd'hui local et non persiste durablement.
- [x] Ajouter un chip de filtre actif et une action de reinitialisation.
- [x] Recentrer Aujourd'hui sur 4 blocs : header, decision, synthese 7 jours, activites a relire.
- [x] Fusionner les informations recovery/forme/volume dans une synthese compacte.
- [x] Remplacer la pile d'activites recentes par 3 activites utiles a relire, compatibles multi-sources.
- [x] Garder le trail comme contexte/vigilance, sans bloc analytique independant dans Aujourd'hui.
- [ ] Recette visuelle Aujourd'hui desktop/mobile apres deploiement CI/CD.
- [ ] Tester le filtre Aujourd'hui sur refresh/nouvelle session avec Course a pied / trail par defaut.

## Dette hors scope

- [ ] Backend sans configuration ESLint compatible ESLint 10 : les controles actuels reposent sur `node --check` et Prisma.
- [ ] Tests automatises backend providers a creer plus tard si une strategie test backend est ajoutee.
