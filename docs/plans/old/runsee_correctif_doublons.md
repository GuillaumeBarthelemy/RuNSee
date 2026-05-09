# RunNSee - Plan correctif final : doublons Strava/Garmin, Aujourd'hui, sync globale, Trail et non-regression

## 0. Objectif

Ce document est destine a CODEX / Claude Code Pro.

Objectif : corriger les regressions et incoherences constatees apres les evolutions multi-sources Strava/Garmin et la refonte de l'onglet Aujourd'hui.

Constats :
1. Des doublons d'activites apparaissent dans la liste Toutes les activites.
2. Les doublons correspondent souvent a une activite Strava et une activite Garmin identique ou tres proche.
3. La page Aujourd'hui a connu une regression de persistance de filtre.
4. L'UX de Aujourd'hui doit rester compacte et fiable.
5. Le job global /sync/all doit etre securise.
6. Le calcul Trail / D- / charge descente doit etre fiabilise.
7. Le frontend reste partiellement centre sur stravaActivityId.
8. L'export source doit etre propre et sans artefacts.

Le but n'est pas d'ajouter des fonctionnalites.
Le but est de fiabiliser l'existant avant toute nouvelle evolution.

---

## 1. Priorites

| Priorite | Sujet | Objectif |
|---:|---|---|
| P0 | Doublons Strava/Garmin | Empecher les futurs doublons et reparer les doublons existants |
| P0 | Job global sync | Eviter les etats job incoherents pendant /sync/all |
| P0 | Liens activite multi-source | Ne plus dependre de stravaActivityId cote frontend |
| P0 | Export source / runtime | Garantir que le code revu est celui reellement servi |
| P1 | Page Aujourd'hui | Corriger filtre + compacter UX |
| P1 | Trail D- / charge descente | Eviter une lecture Trail fausse |
| P1 | Wording | Corriger les libelles visibles |
| P2 | Backfill Garmin historique | Clarifier ce qui est pret vs implemente |

---

# PARTIE A - Diagnostic des doublons Strava/Garmin

## 2. Probleme constate

Dans la page Toutes les activites, des lignes doublonnees apparaissent.

Exemples :
- Garmin : Aubagne Course a pied - 6.70 km - 35 min - 45 m - 144 bpm
- Strava : Course a pied dans l'apres-midi - 6.70 km - 35 min - 45 m - 144 bpm

Autre exemple :
- Strava : Trail en soiree - 8.35 km - 54 min - 345 m - 151 bpm
- Garmin : Aubagne Trail - 8.35 km - 53 min - 345 m - 151 bpm

Ces cas doivent etre reconnus comme des correspondances probables ou exactes, pas comme deux activites differentes.

## 3. Cause probable

Causes possibles :
1. Matching Strava/Garmin trop strict.
2. Noms differents consideres a tort comme discriminants.
3. Fenetre temporelle trop etroite.
4. startTimeLocal vs startTimeGMT mal gere.
5. Garmin-only cree avant que Strava incremental soit termine.
6. Contrainte unique intra-provider mais pas anti-doublon inter-provider.
7. Frontend affiche toutes les activites canonisees sans regroupement Strava + Garmin.

## 4. Regle metier cible

Si Garmin correspond a Strava :
- ne pas creer Garmin-only ;
- creer ou mettre a jour ActivityProviderLink ;
- creer ou mettre a jour ActivityProviderEnrichment ;
- afficher une seule activite : Strava + Garmin.

Si Garmin n'a aucun match Strava fiable :
- creer Garmin-only.

Si match ambigu :
- ne pas creer Garmin-only ;
- ne pas enrichir automatiquement ;
- stocker raw Garmin ;
- journaliser et compter dans le resume de sync.

---

# PARTIE B - Prevenir les futurs doublons

## 5. Lot 1 - Renforcer le matching Strava/Garmin

Creer ou renforcer une fonction pure :

matchProviderActivityToCanonicalActivity(garminCandidate, existingActivities)

Statuts attendus :
- exact
- probable
- ambiguous
- not_found
- rejected

Criteres :
- date/heure depart : exact +/- 2 min, probable +/- 10 min, possible +/- 20 min si distance/duree identiques ;
- distance : exact +/- 1 %, probable +/- 3 %, possible +/- 5 % ;
- duree : exact +/- 2 %, probable +/- 5 %, possible +/- 8 % ;
- D+ : utile si disponible, tolerance +/- 10 % ;
- FC moyenne : utile si disponible, tolerance +/- 3 bpm ;
- type sport : compatible running/trail/hiking ;
- nom activite : ne doit pas etre bloquant.

Regle speciale anti-doublon :
Si distance, duree, D+ et FC moyenne sont quasiment identiques sur la meme date, considerer au minimum probable, meme si le nom differe.

Actions :
- exact : lier Garmin a Strava + enrichir ;
- probable : lier Garmin a Strava + enrichir ;
- ambiguous : ne pas creer Garmin-only, journaliser ;
- not_found : creer Garmin-only ;
- rejected : ignorer ou raw only.

Tests obligatoires :
1. meme date, distance identique, duree identique, D+ identique, FC identique, noms differents ;
2. duree 53 min vs 54 min ;
3. deux activites le meme jour mais distances differentes ;
4. deux activites Strava candidates proches ;
5. decalage startTimeLocal / startTimeGMT ;
6. randonnee Garmin vs course Strava incompatible ;
7. activite Garmin deja liee ;
8. activite Garmin deja importee Garmin-only.

Commit :
fix(sync): harden strava garmin activity matching

---

## 6. Lot 2 - Securiser la creation Garmin-only

Avant tout upsert Activity sourceProvider=garmin, verifier :
1. aucun lien provider Garmin existant ;
2. aucune activite Garmin-only existante avec meme sourceActivityId ;
3. aucun match Strava exact ;
4. aucun match Strava probable ;
5. aucun match ambiguous ;
6. activite Garmin suffisamment complete ;
7. type sport autorise.

Pseudo-regle :
if matchStatus in ["exact", "probable"]:
  link to Strava activity
  enrich Strava
  do not create Garmin-only

if matchStatus == "ambiguous":
  store raw
  record ambiguous summary
  do not create Garmin-only

if matchStatus == "not_found":
  create Garmin-only

Ne pas creer une contrainte DB approximative sur date/distance.
Le garde-fou doit etre applicatif + ActivityProviderLink.

Commit :
fix(sync): prevent garmin fallback duplicates

---

# PARTIE C - Reparer les doublons existants

## 7. Lot 3 - Script de detection des doublons inter-provider

Creer :
backend/scripts/db/detect-provider-activity-duplicates.js

Mode dry-run obligatoire par defaut.

Comparer activites sourceProvider=strava et sourceProvider=garmin pour un meme utilisateur.

Criteres :
- meme date locale ;
- start time proche si disponible ;
- distance proche ;
- duree proche ;
- D+ proche ;
- FC moyenne proche ;
- type compatible.

Sortie attendue :
{
  "duplicates": [
    {
      "stravaActivityId": "...",
      "garminActivityId": "...",
      "confidence": 0.96,
      "reasons": [
        "same_date",
        "distance_delta_0.0%",
        "duration_delta_2.0%",
        "elevation_gain_equal",
        "average_hr_equal"
      ],
      "recommendedAction": "merge_garmin_into_strava"
    }
  ]
}

Commit :
chore(db): add provider duplicate detection script

## 8. Lot 4 - Script de reparation des doublons

Creer :
backend/scripts/db/repair-provider-activity-duplicates.js

Ou ajouter :
node detect-provider-activity-duplicates.js --apply

Le mode --apply doit etre explicite.

Pour chaque doublon fiable :
1. conserver l'activite Strava comme canonique ;
2. creer/mettre a jour ActivityProviderLink Garmin vers Strava ;
3. transferer/creer ActivityProviderEnrichment Garmin vers Strava ;
4. conserver raw Garmin ;
5. supprimer ou marquer comme fusionnee l'activite Garmin-only.

Recommandation :
Preferer soft-delete si possible :
- isMerged
- mergedIntoActivityId
- mergedAt

Le script --apply doit refuser :
- confiance < seuil ;
- match ambiguous ;
- plusieurs candidats ;
- absence de backup ;
- transaction impossible.

Chaque reparation doit etre transactionnelle.

Sortie :
{
  "processed": 12,
  "merged": 10,
  "skippedAmbiguous": 2,
  "errors": []
}

Commit :
fix(db): repair existing strava garmin duplicate activities

---

## 9. Lot 5 - Adapter la liste des activites

Regles :
- afficher Strava enrichi Garmin comme une seule ligne ;
- badge : Strava + Garmin ;
- afficher Garmin-only uniquement si non fusionnee ;
- masquer isMerged=true si soft-delete ;
- ne pas compter les activites fusionnees dans le total ;
- pagination coherente.

Exemple cible :
Au lieu de deux lignes :
- Garmin Aubagne Course a pied
- Strava Course a pied dans l'apres-midi

Afficher :
- Course a pied dans l'apres-midi - Strava + Garmin

Criteres :
- plus aucun doublon visible pour les cas evidents ;
- total lignes coherent ;
- pagination stable ;
- badge source clair ;
- detail activite accessible.

Commit :
fix(activities): hide merged provider duplicates from list

---

# PARTIE D - Job global /sync/all

## 10. Lot 6 - Corriger le lifecycle du job global

Probleme :
Le job global peut appeler une fonction Strava incremental qui marque le job success avant que Garmin ait fini.

Correction :
Separer logique metier Strava incremental et lifecycle SyncJob.

Creer :
runStravaIncrementalSyncStep(appUserId, options)

Flux cible :
global job = running
  step 1: strava incremental -> stepResult
  step 2: garmin recovery -> stepResult
  step 3: garmin activities recent -> stepResult
global job = success / partial_success / failed

Criteres :
- /sync/jobs/current voit le job global jusqu'a la fin reelle ;
- pas de statut success intermediaire ;
- erreurs provider isolees ;
- resume provider complet.

Commit :
fix(sync): keep global sync job running until all provider steps finish

---

# PARTIE E - Liens activite multi-source

## 11. Lot 7 - Ne plus dependre de stravaActivityId cote frontend

Creer un helper frontend :
getActivityPublicId(activity)

Priorite possible :
- activity.id
- activity.publicId
- activity.sourceActivityId
- activity.stravaActivityId

Aligner avec le backend.

Auditer :
- BestEffortsPanel.jsx
- PerformancePage.jsx
- ActivityDetailPage.jsx
- activity.service.js
- App.jsx
- RecentActivitiesCard ou equivalent
- TodayUsefulActivities
- ActivitiesTable

A court terme, la route peut rester /activities/:stravaActivityId, mais le nom est trompeur.
A moyen terme : /activities/:activityPublicId.

Criteres :
- activite Garmin-only cliquable ;
- activite Strava cliquable ;
- activite Strava + Garmin cliquable ;
- aucun lien /activities/undefined ;
- records / best efforts ne plantent pas.

Commit :
fix(frontend): use provider agnostic activity links

---

# PARTIE F - Trail / D- / charge descente

## 12. Lot 8 - Fiabiliser D- et charge descente

Ajouter un champ canonique si absent :
Activity.totalElevationLoss

Mapper :
- Garmin elevationLoss ;
- Strava si disponible ;
- sinon calcul depuis streams/splits si fiable.

Adapter :
- trailProfile.js
- ActivityTrailCard
- TrailSpecificityCard
- TodaySevenDaySummary
- DashboardDecisionSummaryCard

Si D- absent :
Charge descente non calculable : donnees de descente insuffisantes.

Ne pas afficher charge faible si donnee absente.

Criteres :
- D- affiche si disponible Garmin ;
- charge descente non sous-estimee ;
- Today ne sur-alerte pas si D- absent ;
- Analytics Trail coherent.

Commit :
fix(trail): use canonical elevation loss for downhill load

---

# PARTIE G - Aujourd'hui et filtre

## 13. Lot 9 - Recetter et corriger le filtre Aujourd'hui

Tests manuels :
1. ouvrir Aujourd'hui ;
2. changer filtre ;
3. naviguer vers Activites ;
4. revenir Aujourd'hui ;
5. refresh navigateur ;
6. fermer/reouvrir app ;
7. verifier retour au defaut attendu ;
8. verifier chip Lecture filtree si filtre actif.

Regle :
Afficher "Lecture filtree" seulement si l'utilisateur a explicitement choisi un filtre different du defaut.

Commit si correction :
fix(today): clarify temporary sport filter state

## 14. Lot 10 - Finaliser UX Aujourd'hui compacte

Actions :
- reduire hauteur TodayHeader ;
- reduire hauteur items TodayUsefulActivities ;
- limiter textes secondaires ;
- rendre carte decision plus compacte ;
- conserver 4 blocs max ;
- pas de bloc Trail analytique independant.

Criteres :
- lecture claire en moins de 10 secondes ;
- peu ou pas de scroll desktop ;
- pas d'overflow mobile ;
- 3 activites utiles max ;
- Trail uniquement contexte/vigilance/synthese.

Commit :
fix(today): compact daily view layout

---

# PARTIE H - Packaging / export source

## 15. Lot 11 - Corriger definitivement l'export source

Creer ou corriger :
Export-RunSeeSourceArchive.ps1

Ou utiliser :
git archive --format=zip --output runsee-source.zip HEAD

Exclusions obligatoires :
- node_modules/
- dist/
- generated/
- runtime/
- .tmp/
- *.log
- *.pid
- *.db
- .env
- .env.*.local
- *.zip

Critere :
Archive sans artefact runtime ni secret.

Commit :
chore(repo): ensure clean source archive export

---

# PARTIE I - Wording

## 16. Lot 12 - Corriger les libelles visibles

Exemples :
- Randonnee -> Randonnée
- Activite -> Activité
- Specificite -> Spécificité
- Denivele -> Dénivelé
- donnees -> données
- seance -> séance
- recuperation -> récupération
- Garmin Â· Randonnee -> Garmin · Randonnée

Auditer :
- ActivitiesTable
- ActivityTrailCard
- TrailSpecificityCard
- AnalyticsPage
- ActivityDetailPage
- DashboardDecisionSummaryCard
- TodaySevenDaySummary
- TodayUsefulActivities
- CurrentAccountPanel
- sync.controller.js
- syncJob.service.js

Ne pas renommer les variables techniques uniquement pour ajouter des accents.

Commit :
fix(ui): restore french accents in visible labels

---

# PARTIE J - Backfill Garmin historique

## 17. Lot 13 - Clarifier l'etat reel du backfill

Si ProviderBackfillCursor existe mais orchestration absente, mettre a jour .ai/open_tasks.md :

ProviderBackfillCursor créé.
Backfill historique Garmin activités par tranches 180 j/h non encore implémenté fonctionnellement.

Ne pas declarer termine tant que :
- endpoint lancement manuel absent ;
- scheduler absent ;
- reprise automatique absente ;
- pause/reprise absente ;
- tests absents.

Commit :
docs(ai): clarify garmin historical backfill status

---

# PARTIE K - Tests et recette complete

## 18. Tests backend obligatoires

cd backend
npm ci
npm run prisma:generate
npx prisma validate
npm run prisma:pg:validate
npm run db:compare-schemas
npm test
node --check src/app.js
node --check src/server.js

Ajouter / adapter tests pour :
- matching exact ;
- matching probable ;
- matching ambiguous ;
- creation Garmin-only uniquement si not_found ;
- non-creation Garmin-only si probable ;
- script detection doublons dry-run ;
- script reparation doublons ;
- job global lifecycle ;
- D- Garmin normalise ;
- activite randonnee Garmin ;
- sourceProvider / sourceActivityId uniques.

## 19. Tests frontend obligatoires

cd frontend
npm ci
npm test -- --run
npm run build

Ajouter / adapter tests pour :
- liste activites sans doublons visibles ;
- badge Strava + Garmin ;
- activite Garmin-only cliquable ;
- aucun lien /activities/undefined ;
- filtre Aujourd'hui temporaire ;
- TodayUsefulActivities max 3 ;
- D- / Trail affiche correctement ;
- wording source Garmin · Randonnée.

## 20. Recette manuelle obligatoire

Doublons :
- Strava + Garmin meme activite -> une seule ligne Strava + Garmin
- Garmin sans match -> ligne Garmin-only
- Match ambigu -> pas de ligne dupliquee creee automatiquement

Sync globale :
- /sync/all avec Strava + Garmin
- /sync/all Strava seul
- /sync/all Garmin seul
- /sync/all aucun provider

Activites :
- pagination ;
- total lignes ;
- tri date ;
- detail activite ;
- badge source ;
- Garmin-only ;
- randonnee Garmin.

Aujourd'hui :
- filtre non persiste ;
- pas de scroll excessif ;
- 4 blocs maximum ;
- activites utiles max 3 ;
- Trail contexte seulement.

---

# PARTIE L - Mise a jour .ai/*.md

Fichiers :
- .ai/current_context.md
- .ai/open_tasks.md
- .ai/regression_risks.md
- .ai/codebase_map.md

current_context.md :
- doublons Strava/Garmin corriges ;
- regle Garmin-only ;
- script detection/reparation ;
- job global corrige ;
- D- canonique ;
- filtre Aujourd'hui recette.

open_tasks.md :
- marquer termine uniquement si teste ;
- laisser ouvert backfill historique complet si non implemente.

regression_risks.md :
- matching Strava/Garmin ;
- script reparation doublons ;
- soft-delete/merge ;
- job global ;
- liens multi-source ;
- D- Trail.

codebase_map.md :
- scripts doublons ;
- helper activity link ;
- champs D- ;
- services matching ;
- job global refactore.

---

# PARTIE M - Ordre recommande

1. Matching anti-doublon.
2. Garde-fou creation Garmin-only.
3. Script detection doublons dry-run.
4. Script reparation doublons.
5. Masquage/fusion dans liste activites.
6. Job global lifecycle.
7. Liens activite multi-source.
8. D- / charge descente.
9. Filtre Aujourd'hui.
10. UX compacte Aujourd'hui.
11. Export source propre.
12. Wording.
13. Documentation .ai.

---

## Definition de termine

Le chantier est termine uniquement si :
- les doublons visibles Strava/Garmin ont disparu ;
- une activite Strava + Garmin apparait en une seule ligne ;
- une activite Garmin-only reelle reste affichee ;
- les doublons existants sont detectes et repares ;
- les futurs doublons sont empeches ;
- le job global reste running jusqu'a la fin reelle ;
- aucune activite Garmin-only ne cree de lien casse ;
- D- Garmin est exploite pour Trail ;
- Aujourd'hui ne persiste plus de filtre durable ;
- Aujourd'hui reste compact ;
- l'archive source est propre ;
- les libelles visibles sont corriges ;
- les tests backend/frontend passent ;
- les fichiers .ai/*.md sont a jour.

## Message final attendu de CODEX / Claude Pro

Correctifs realises :
- Matching anti-doublon : ...
- Creation Garmin-only securisee : ...
- Detection doublons : ...
- Reparation doublons : ...
- Liste activites : ...
- Job global : ...
- Liens multi-source : ...
- D- Trail : ...
- Aujourd'hui filtre/UX : ...
- Export source : ...
- Wording : ...
- Documentation .ai : ...

Tests executes :
- backend : ...
- frontend : ...
- build : ...
- recette manuelle : ...

Doublons :
- detectes : ...
- repares : ...
- restants : ...

Risques residuels :
- ...
