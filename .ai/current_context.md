# Current Context

## Validation post-backfill Garmin

- Plan traite : `docs/plans/active/runsee_analyse_actualisee_plan_suite.md`, a archiver sous `docs/plans/old/` apres commit.
- Recette visuelle post-fenetre 2 confirmee par l'utilisateur en session authentifiee : Activites, Aujourd'hui, Analytics et Performance sans anomalie visible remontee.
- Dry-run doublons provider execute en production : `scannedActivities=928`, `duplicateCount=0`.
- Decision : GO surveille pour laisser le backfill Garmin poursuivre automatiquement selon le scheduler et les intervalles configures.
- Durcissement ajoute : le scheduler selectionne maintenant les fenetres dues apres avoir charge un lot de candidats, afin qu'une fenetre non due ne bloque pas une fenetre eligible.
- Suite a surveiller : prochaine fenetre automatique, puis dry-run doublons a 0 avant toute baseline/tag stable final.

## Cadre qualite permanent

- Plan qualite traite puis archive sous `docs/plans/old/runsee_cadre_recette_suivi_qualite_v3.md`.
- Documentation reorganisee : les plans termines sont centralises dans `docs/plans/old/`, les plans actifs futurs dans `docs/plans/active/`, les decisions dans `docs/decisions/`, les releases dans `docs/releases/`, les operations dans `docs/operations/`.
- Les documents multi-source sont maintenant ranges sous `docs/architecture/`.
- Cadre qualite cree : `docs/quality/RUNSEE_QUALITY_GATE.md`, `docs/quality/RUNSEE_TEST_LOG.md`, `docs/quality/RUNSEE_VALIDATION_MATRIX.md`, `docs/quality/RUNSEE_RELEASE_CHECKLIST.md`.
- ADR initiaux crees : multi-source Strava/Garmin, politique backfill Garmin, quality gate.
- Regle de travail : chaque chantier significatif doit mettre a jour le test log, la matrice de validation et `.ai` avant commit ; aucun tag stable ne doit etre pose sans checklist release complete.

## Mise a jour de fiabilisation en cours

- Nouveau plan actif lu : `docs/plans/old/runsee_plan_fiabilisation_frontend_backend_science_ux.md`.
- Objectif de cette passe : finaliser les garde-fous frontend/backend sans modifier les calculs metier centraux.
- Backend : route assistant existante montee sur `/assistant`, `/health` enrichi avec probe DB, reponse d'erreur standardisee en conservant le format legacy `message/details`.
- Frontend : confiance de l'Aptitude RunNSee rendue plus explicite (`coveredWeight`, `sourcesCount`, statut `Insuffisante` quand aucune source exploitable).
- Glossaire : libelle canonique `Aptitude RunNSee`, ancien `Aptitude RunSee` conserve en alias.
- DB : ajout d'un controle `npm run db:compare-schemas` pour detecter une divergence de modeles Prisma SQLite/PostgreSQL.
- Nouveau plan de stabilisation pre-ajouts lu : `docs/plans/old/runsee_plan_stabilisation_pre_ajouts_codex.md`.
- Stabilisation pre-ajouts en cours : packaging Git, validation GREEN auth-aware, bridge Garmin activite, timestamps Garmin, import PostgreSQL, tests backend purs.
- `lastSyncAt` reste reserve a la synchronisation recovery Garmin ; l'enrichissement activite Garmin ne doit plus le deplacer.
- Les metriques Garmin de seance sont libellees comme estimations/donnees Garmin, pas comme mesures physiologiques directes.

## Objectif actif

Finalisation de la stabilisation RunNSee autour de 4 priorites :

1. securiser les fondations du repo et exclure les artefacts locaux/secrets ;
2. completer la chaine SQLite vers PostgreSQL ;
3. terminer Garmin Phase K : enrichir les activites Strava avec les metriques d'activite Garmin ;
4. renforcer les garde-fous frontend sur les metriques Garmin d'activite.

## Etat realise dans cette passe

- `.gitignore`, `backend/.gitignore`, `frontend/.gitignore`, `.dockerignore` backend/frontend renforces.
- Artefacts locaux suivis par erreur retires de l'index Git : bases SQLite, `.env` frontend, logs runtime.
- Migration SQLite locale appliquee jusqu'a schema a jour.
- `tableDefinitions.js` couvre maintenant les 15 modeles Prisma actuels dans un ordre compatible FK.
- Export SQLite valide avec les tables Garmin et settings recentes.
- Import PostgreSQL durci : refus par defaut sans `--truncate` ou `--allow-append`, dry-run disponible, comparaison de comptage post-import.
- Snapshot DB etendu : comptes des tables providers/settings + integrite Garmin.
- Garmin Phase K cablee cote backend et frontend :
  - bridge Node expose `fetchGarminActivities`.
  - service `garminActivityEnrichment.service.js` recupere une fenetre courte, stocke le brut, matche prudemment Strava/Garmin et cree `ActivityProviderEnrichment`.
  - endpoint `POST /providers/garmin/activities/enrich`.
  - fiche activite : bouton de completion Garmin ciblee, sans backfill massif.
  - reponse detail activite expose `garminActivityEnrichment`.

## Decisions metier conservees

- Strava reste la source principale des activites.
- Garmin non officiel sert uniquement d'enrichissement.
- Pas de backfill massif Garmin activites depuis l'UI detail : ciblage par activite ou fenetre bornee max 180 jours.
- Matching ambigu non applique automatiquement.
- Donnees brutes provider conservees dans `ExternalProviderRawData`; donnees normalisees exposees via `ActivityProviderEnrichment`.

## Validations realisees

- `backend`: `npm run prisma:generate`, `npx prisma validate`, `npm run prisma:pg:validate`, `npm run prisma:pg:generate`.
- `backend`: `node --check` sur services, routes, controllers et scripts DB touches.
- `frontend`: ESLint zero warning sur les fichiers touches.
- `frontend`: `npm test -- --run` -> 139 tests verts.
- `frontend`: `npm run build` OK.
- DB: `npm run db:export:sqlite`, puis `npm run db:import:postgres -- --dry-run` OK.

## Points restant a valider manuellement

- Test Garmin reel sur une activite Strava connue avec session Garmin connectee.
- Verification d'un cas ambiguous : aucune association automatique ne doit etre appliquee.
- Verification VM/prod apres push CI/CD : endpoint provider, fiche activite, onglet Garmin.

## Plan Trail + statuts providers + sync globale

- Nouveau plan execute : `docs/plans/old/runsee_plan_trail_sync_global_codex_v2_20260507.md`.
- Backend : ajout de `GET /providers/status` pour exposer un etat filtre Strava/Garmin sans secret.
- Backend : ajout de `POST /sync/all`, orchestration prudente Strava incremental + Garmin recovery recent ; Garmin activity enrichment reste volontairement skippe hors contexte activite.
- Frontend layout : le panneau compte affiche maintenant les pastilles Strava/Garmin et un bouton de synchronisation globale compact.
- Trail : ajout du socle `trailProfile.js` avec classification terrain prudente, D+/D-/km, temps montee/descente, charge descente et qualite altitude.
- Aujourd'hui : le contexte trail reste minimal et conditionnel dans la synthese decisionnelle.
- Detail activite : onglet `Lecture trail` affiche uniquement si le profil terrain est pertinent.
- Analytics : nouvelle carte `Specificite trail` sur la selection filtree.
- Objectifs : les courses peuvent porter des champs trail optionnels (D+, D-, terrain, duree cible, montee/descente longue, priorite).
- Glossaire : entrees trail ajoutees pour D+, D-, D+/km, VAM, charge descente et specificite trail.

## Correctif post Trail + providers + sync globale

- Nouveau plan traite : `docs/plans/old/runsee_plan_correctif_post_trail_provider_sync.md`, archive ensuite sous `docs/plans/old/`.
- Sidebar compte : le statut Strava historique du header est retire ; Strava et Garmin sont affiches une seule fois au meme niveau dans les pastilles provider.
- `Lecture du jour` : la carte est reorganisee en verdict, action du jour, vigilance et signaux cles ; le contexte trail est integre a la decision au lieu d'un bloc analytique separe.
- Sync globale : `/sync/all` cree un job `global_incremental` sequentiel qui lance Strava incremental, Garmin recuperation recente puis Garmin activites recentes bornees.
- Garmin activites global : enrichissement recent en mode `recent_missing`, fenetre configuree par `GARMIN_ACTIVITY_ENRICHMENT_GLOBAL_DAYS` avec plafond applicatif a 30 jours.
- Documentation : convention d'archive standardisee sur `docs/plans/old/`.

## Plan multi-sources Strava/Garmin avec fallback Garmin

- Nouveau plan traite : `docs/plans/old/runsee_plan_multisource_garmin_fallback_v2.md`, archive ensuite sous `docs/plans/old/`.
- Modele : `Activity` porte maintenant une identite canonique multi-source (`appUserId`, `sourceProvider`, `sourceActivityId`, `sourcePriority`) en conservant `stravaActivityId` pour compatibilite.
- Modele : ajout de `ActivityProviderLink` pour tracer les matchs provider et de `ProviderBackfillCursor` pour preparer le backfill Garmin historique par fenetres.
- Backend Garmin : ajout d'un normaliseur d'activites Garmin et d'un scorer de matching provider reutilisable.
- Sync globale : Garmin activites recentes peut maintenant creer des activites Garmin-only quand aucun match Strava fiable n'existe et que le cas n'est pas ambigu.
- Frontend : les listes et fiches activites utilisent un identifiant stable (`id` puis fallback source/Strava) et affichent un badge source Strava/Garmin.
- Documentation : ajout de `docs/architecture/MULTI_SOURCE_AUDIT.md` et `docs/architecture/MULTI_SOURCE_ARCHITECTURE.md`.

## Correctif UX Aujourd'hui

- Nouveau plan traite : `docs/plans/old/runsee_plan_correctif_ux_aujourdhui.md`, a archiver sous `docs/plans/old/`.
- Aujourd'hui reste une lecture fixe sur 7 jours glissants ; seul le perimetre sport est ajustable localement.
- Le filtre sport d'Aujourd'hui n'est plus persiste dans le state dashboard long terme ; il revient par defaut sur `Course a pied / trail` et affiche un chip + reset lorsqu'il est modifie.
- La page Aujourd'hui est ramenee a 4 blocs majeurs : header compact, lecture du jour, synthese 7 jours, activites a relire.
- Les anciens blocs empiles (`TodayReadinessCard`, `TodayFormCards`, `TodayVolumeStrip`, `TodaySecondaryRow`, `TodaySnapshotToday`, `RecentActivitiesCard`) ne sont plus rendus dans Aujourd'hui ; leurs informations utiles sont fusionnees.
- Le trail reste un contexte/vigilance dans Aujourd'hui ; les analyses detaillees restent dans Activite, Analytics et Objectifs.

## Correctif doublons Strava/Garmin et stabilisation multi-source

- Nouveau plan traite : `docs/plans/old/runsee_correctif_doublons.md`, archive ensuite sous `docs/plans/old/`.
- Matching Strava/Garmin renforce : fenetre possible 20 min si les metriques sont fortes, controle distance/duree/D+/FC, sport compatible, nom non bloquant.
- Garmin-only securise : une activite Garmin deja liee ou ambigue ne recree pas de fallback canonique.
- Duplicats existants : ajout de scripts dry-run/apply pour detecter puis soft-merger Garmin vers Strava sans suppression physique.
- `Activity` porte maintenant `isMerged`, `mergedIntoActivityId`, `mergedAt` et `totalElevationLoss`.
- Les lectures repository excluent les activites fusionnees et les profils trail peuvent utiliser le D- stocke en fallback.
- `/sync/all` ne laisse plus le job global etre marque success par la sous-sync Strava avant la fin des etapes Garmin.
- Frontend : liens activites importants centralises sur un identifiant public canonique compatible Strava/Garmin-only.

## Recette post soft-merge doublons Garmin/Strava

- Correctif supplementaire deploye : le matching provider compare maintenant `startDate` UTC avant `startDateLocal`, ce qui evite un decalage artificiel de 2 h entre Strava et Garmin.
- CI/CD VM vert sur le commit `8eff8fd`.
- Dry-run prod apres correctif : 29 doublons Garmin/Strava detectes, tous en statut `exact`, scores >= 91,9.

## Score de confiance des analyses

- Nouveau chantier traite : `docs/plans/active/runsee_chantier_score_confiance_analyses.md`, a archiver sous `docs/plans/old/` apres commit.
- Nouveau moteur pur : `frontend/src/utils/analysisConfidence.js`.
- Le score ne cree pas de KPI physiologique ; il qualifie la solidite de lecture selon les donnees disponibles, manquantes ou partielles.
- Niveaux exposes : `high`, `medium`, `low`, `insufficient`, rendus comme confiance elevee/moyenne/faible ou insuffisante.
- Nouveau composant UI : `frontend/src/components/AnalysisConfidenceBadge.jsx`, compact et utilisable dans les headers.
- Integrations faites : synthese Aujourd'hui, Analytics, Performance route/objectif, specificite trail et detail activite trail.
- Tests purs ajoutes : `frontend/src/utils/analysisConfidence.test.js`.
- Documentation modele : `docs/architecture/ANALYSIS_CONFIDENCE_MODEL.md`.
- Limite volontaire : le score reste qualitatif et ne remplace pas les calculs metier existants ; il doit aider a lire les incertitudes sans sur-vendre la precision.

## Backfill historique Garmin activites

- Nouveau chantier traite : `docs/plans/old/runsee_chantier_backfill_garmin.md`, archive ensuite sous `docs/plans/old/`.
- Baseline de depart conservee : tag `runsee-stable-post-garmin-dedup`.
- Le backfill historique Garmin utilise `ProviderBackfillCursor` existant, sans migration Prisma.
- Le backfill est lance manuellement depuis Admin, puis poursuivi automatiquement par scheduler backend.
- Chaque fenetre couvre au maximum `GARMIN_BACKFILL_WINDOW_DAYS` jours, par defaut 180.
- Le delai minimal entre deux fenetres est `GARMIN_BACKFILL_MIN_INTERVAL_MINUTES`, par defaut 60 minutes.
- Le traitement reutilise `garminActivityEnrichment.service.js` et le matching stabilise `activityProviderMatching.service.js`.
- Apres chaque fenetre, un controle anti-doublon reutilise la logique de detection provider et met le curseur en erreur si un doublon actif est detecte.
- L'UI Admin expose le statut, les fenetres, les compteurs, la pause et la reprise.
- Soft-merge prod applique : 29/29 activites Garmin marquees `isMerged=true`, aucune suppression physique.
- Verification post-merge : detection dry-run a 0 doublon, 923 activites Strava actives, 0 Garmin actif visible, 29 liens/enrichissements Garmin conserves.
- Controle volumes recent : les jours 27/04-06/05 ne sont plus doubles dans les lectures `isMerged=false`.
- API publique `/db/health` OK ; `/activities` reste protegee par session, donc la validation visuelle finale doit etre faite avec un navigateur authentifie.

## Review finale post-correctif Garmin/Strava

- Plan de controle traite : `docs/plans/old/runsee_review_finale.md`, archive sous `docs/plans/old/runsee_review_finale.md`.
- Git : diff applicatif nul avant review, seul le plan etait non suivi ; archive source generee via `git archive` depuis `HEAD`.
- Backend : Prisma SQLite/PostgreSQL valides, schemas alignes, tests backend verts (15/15), `node --check` OK sur `src/app.js` et `src/server.js`.
- Frontend : tests Vitest verts (148/148) et build Vite OK.
- Prod : dry-run doublons toujours a 0 ; controle DB confirme 923 activites actives, 29 merged, 0 merged sans cible, 0 Strava merged, 0 Garmin actif.
- Review code : `activity.repository.js` exclut `isMerged=false` sur les lectures courantes ; `activityProviderMatching.service.js` conserve les statuts exact/probable/ambiguous/not_found/rejected ; `/sync/all` utilise `manageJobLifecycle=false` pour eviter la fin prematuree du job global.
- Baseline stable non taggee a ce stade : la validation visuelle authentifiee et le dry-run apres une nouvelle sync globale restent ouverts.

## Review code post-dedup et durcissement matching exact

- Plan traite : `docs/plans/old/runsee_review_code_post_dedup.md`, archive sous `docs/plans/old/runsee_review_code_post_dedup.md`.
- Correction appliquee : le statut provider `exact` exige maintenant un timestamp proche ET des ecarts distance/duree de grade exact ; les matches proches mais moins stricts restent `probable/matched_tolerated`.
- Tests adaptes : un cas proche avec duree differente d'environ une minute reste matche, mais n'est plus surclasse en exact.
- Verification enrichissements post-merge prod : 0 enrichment Garmin reste attache a une activite merged, 0 cible Strava sans enrichment, 0 mismatch de providerActivityId sur les cibles.
- Route `DELETE /providers/garmin/data` conservee comme action admin hardening existante : elle exige `PURGE_GARMIN`, est authentifiee et ne supprime pas les activites Strava ; elle reste a considerer comme action destructive Garmin.
- Archive de review source a regenerer apres commit final depuis `git archive`.

## Stabilisation pre-usage reel du backfill historique Garmin

- Plan traite : `docs/plans/old/runsee_review_backfill_garmin_derniere_version.md`, archive ensuite sous `docs/plans/old/`.
- Ajout de `ProviderBackfillWindowLog` (SQLite + PostgreSQL) pour historiser chaque fenetre Garmin : dates, statut, compteurs, erreur, doublons detectes et resultat JSON redige.
- Le statut Admin ne depend plus uniquement des extras de la derniere requete : les compteurs `matched`, `Garmin-only`, `ambiguous` et `rejected` sont recalcules depuis les logs persistants.
- Le backfill controle les doublons avant ecriture ; si un doublon actif existe deja, la fenetre est bloquee et le curseur passe en `error` sans avancer.
- Apres ecriture, si un doublon Garmin/Strava apparait, un soft-merge non destructif est tente immediatement ; le curseur ne progresse que si le controle residuel revient a 0.
- `run-window force` est desactive par defaut et ne fonctionne que si `GARMIN_BACKFILL_ALLOW_FORCE_RUN=true`.
- Les snapshots `.ai/git_status*` et `.ai/handoff*` obsoletes ont ete supprimes pour eviter de propager un faux etat Git.

## Recette controlee backfill Garmin - fenetre 1

- Plan traite : `docs/plans/old/runsee_plan_suite_backfill_garmin.md`, archive ensuite sous `docs/plans/old/`.
- Production alignee sur le commit `d4e612d` avant recette ; migration `ProviderBackfillWindowLog` deja appliquee.
- Variables prod explicites : `GARMIN_BACKFILL_WINDOW_DAYS=180`, `GARMIN_BACKFILL_MIN_INTERVAL_MINUTES=60`, `GARMIN_BACKFILL_MAX_WINDOWS_PER_RUN=1`, `GARMIN_BACKFILL_SCAN_INTERVAL_MINUTES=10`, `GARMIN_BACKFILL_ALLOW_FORCE_RUN=false`, `GARMIN_BACKFILL_MIN_DATE=2015-01-01`.
- Dry-run doublons initial prod : `duplicateCount=0`.
- Premiere fenetre reelle traitee : 2025-11-10 -> 2026-05-08, 186 activites Garmin lues, 144 matchees Strava, 2 Garmin-only creees puis soft-mergees si doublon, 39 rejetees/non supportees, 0 ambigu.
- Dry-run doublons apres fenetre 1 : `duplicateCount=0`.
- Pause/reprise validee : statut `paused` puis `running`, prochaine fenetre planifiee 2025-05-14 -> 2025-11-09, prochain lancement apres le delai minimal.
- Validation immediate de la fenetre 2 effectuee sans activer `force` : le curseur a ete rendu eligible puis `runDueGarminActivityBackfillWindows()` a traite une seule fenetre via le chemin scheduler existant.
- Deuxieme fenetre reelle traitee : 2025-05-14 -> 2025-11-09, 163 activites Garmin lues, 112 matchees Strava, 0 Garmin-only creee, 0 ambigu, 51 rejetees/non supportees, `duplicateCountAfterWindow=0`.
- Compteurs cumules apres 2 fenetres : 349 activites Garmin lues, 256 matchees Strava, 2 Garmin-only creees, 0 ambigu, 90 rejetees.
- Dry-run doublons apres fenetre 2 : `duplicateCount=0`.
- Les logs des deux fenetres indiquent maintenant `duplicateCountAfterWindow=0`; le log de la fenetre 1 a ete corrige apres validation du dry-run residuel, car il avait ete ecrit avant le correctif `??`.
- Commit documentaire de validation : `40fadd1`, CI/CD GitHub Actions verte et deploiement VM OK.
- Archive review regeneree depuis `HEAD` propre : `runsee-source-review.zip`, 910592 octets, generee le 2026-05-08 23:09:41.
