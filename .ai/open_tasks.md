# Open Tasks

## Actif / bloquant

- Aucun blocage ouvert au 2026-05-09 apres validation visuelle post-fenetre 2 et dry-run prod `duplicateCount=0`.

## Actif / non bloquant

- [ ] Poursuivre la page Performance V5 strict onglet par onglet : prochain lot recommandé `VDOT & profil`, puis `Allures de référence`, `FC de performance`, `Records`.
- [ ] Surveiller la prochaine fenetre automatique du backfill Garmin historique.
- [ ] Relancer `detect-provider-activity-duplicates.js` en production apres la prochaine fenetre importante.
- [ ] Confirmer que le backfill poursuit jusqu'a `GARMIN_BACKFILL_MIN_DATE` sans status `error`.
- [x] Valider visuellement les badges de confiance sur Aujourd'hui, Analytics, Performance, VDOT, Objectif, TrailSpecificity et detail activite Trail en session authentifiee desktop + mobile (utilisateur, 2026-05-09), correctif charge recente applique, tag `runsee-stable-analysis-confidence` pose.
- [ ] Tester `POST /sync/all` avec Strava seul, Garmin seul, puis les deux connectes lors d'une prochaine recette globale.
- [ ] Verifier visuellement la sidebar provider et Aujourd'hui sur mobile/ecran etroit.
- [ ] Revalider un objectif trail si un nouvel objectif critique est cree.

## Dette / hors scope non bloquant

- [ ] **Tooltips pedagogiques globaux Alpine Light** — Brancher le composant `InfoTooltip` sur les indicateurs cles a travers RunNSee (Analyse onglets Vue d'ensemble / Charges / Tendances / Intensites / Sommeil, ainsi que Performance, Progression, Activites). Textes pedagogiques scientifiquement sources. Decision 2026-05-16 : reporte volontairement pour une passe globale unique, plutot que onglet par onglet.
- [ ] **CTAs Analyse "Voir l'analyse complete" / "En savoir plus" / "Voir tous les conseils"** — Brancher les boutons CTAs des rails et footers (Tendances, Intensites...) sur des destinations concretes. Pour le moment ils sont en placeholders sans `onClick`. Decision 2026-05-16 : passe globale apres la stabilisation des contenus.
- [ ] Completer des tests backend providers plus larges si une strategie de tests backend avec mocks DB est ajoutee.
- [ ] Ajouter des tests workflow backfill avec repository mocke pour couvrir start/pause/resume et preflight/post-window duplicats de bout en bout.
- [ ] Valider l'import PostgreSQL sur une base cible uniquement avec backup et option explicite (`--truncate` ou `--allow-append`).
- [x] Preparer et implementer le chantier produit recommande : score de confiance / qualite des analyses.
- [ ] Backend sans configuration ESLint compatible ESLint 10 : les controles actuels reposent sur `node --check`, Prisma et `npm test`.
- [x] **Charge recente Aujourd'hui** : correctif applique le 2026-05-09. La valeur affichee est maintenant le cumul 7 j (coherent bareme glossaire), et la charge du jour est mentionnee en hint. Aucune modification du moteur de calcul de charge.

## Termines recemment

- [x] **Lot 04 Alpine Light V5 — Page Analyse refonte complete (2026-05-16/17)**. 5 onglets refondus selon mockup PDF V5 (Vue d'ensemble, Charges, Tendances, Intensites, Sommeil & recuperation). Seuils scientifiques valides (Seiler, Coggan, Mujika, Gabbett, Foster, Esteve-Lanao, Millet, Tudor-Locke, NSF/AASM, Plews, Buchheit, Halson, Le Meur). 4 nouveaux helpers utils (`analyticsFocus`, `analyticsTrends`, `analyticsIntensities`, `analyticsRecovery`). Bridge Garmin Python corrige pour exposer `activityTrainingLoad` (pivot EPOC -> Training Load Firstbeat). 211/211 tests, ESLint 0, build OK, deploye en production sur la VM, valide visuellement.
- [x] Creer le cadre qualite permanent (`docs/quality`, ADR, releases, plans actifs/archives).
- [x] Archiver les anciens plans sous `docs/plans/old/`.
- [x] Valider les fenetres Garmin reelles 1 et 2.
- [x] Valider visuellement apres fenetre 2 : Activites, Aujourd'hui, Analytics, Performance.
- [x] Executer le dry-run doublons prod apres validation visuelle : `duplicateCount=0`.
- [x] Autoriser la poursuite automatique surveillee du backfill Garmin.
- [x] Durcir la selection scheduler des fenetres backfill dues.
