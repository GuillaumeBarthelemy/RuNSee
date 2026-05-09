# Analysis Confidence Model

## Objectif

Le score de confiance RunNSee ne cherche pas a ajouter un nouveau KPI physiologique. Il qualifie la solidite de lecture des analyses deja presentes : donnees recentes, couverture cardio, recovery Garmin, denivele, splits, records et exclusions multi-source.

La sortie reste volontairement qualitative :

- `high` : donnees recentes, coherentes et suffisamment couvertes ;
- `medium` : analyse exploitable avec limites ;
- `low` : lecture fragile, prudence forte ;
- `insufficient` : donnees insuffisantes pour conclure.

## Donnees disponibles

### Aujourd'hui

- Activites filtrees sur 7 jours glissants.
- Charge calculee via `buildTrainingLoadStateModel`.
- Signaux multi-horizons deja lus par `buildDashboardDecisionSummary`.
- Snapshots Garmin recovery recuperes sur 56 jours.
- Contexte trail synthetique via `buildTrailContextSummary`.

### Analytics

- Activites sur periode filtree.
- Historique hors date via `analyticsScopeActivities`.
- Charge, efficience, intensites, volume hebdo/mensuel.
- Specificite trail via `buildTrailAnalyticsSummary`.
- Recovery Garmin recent si disponible.

### Performance

- Records route et best efforts via `buildBestEfforts`.
- Profil VDOT route via `buildVdotProfile`.
- Course objectif active via `buildRaceObjectiveProfile`.
- Recovery Garmin disponible sur 56 jours.

### Detail activite Trail

- Profil terrain via `buildTrailProfile`.
- D+, D-, distance, duree, splits/segments si disponibles.

## Donnees manquantes ou partielles

- Le dry-run doublons provider n'est pas une donnee frontend temps reel.
- Le backfill Garmin peut continuer en arriere-plan : le score doit rester prudent si une anomalie provider reapparait.
- Les donnees sommeil, HRV et RPE ne sont pas garanties pour toutes les dates.
- Les donnees D- et splits restent dependantes du provider et de l'enrichissement disponible.

## Regles retenues

### Fraicheur

- Activites recentes : positif si la periode est suffisamment alimentee.
- Recovery Garmin : positif si un snapshot est recent, limite si absent ou ancien.

### Couverture

- Cardio : utile pour Aujourd'hui, Analytics et Performance.
- D+ : utile pour volume terrain et trail.
- D- : critique pour charge descente et specificite trail.
- Splits : utiles pour une lecture trail plus fine, mais non bloquants.

### Performance

- Les records route et le VDOT augmentent la confiance.
- Peu de courses route recentes ou un seul record reduisent la confiance.
- Les randonnees doivent rester separees des lectures route.

### Objectifs

- Objectif actif, distance, bloc recent, sortie longue et recovery augmentent la confiance.
- Pour un objectif trail, D+ et D- recents deviennent importants.

## Limites assumees

- Le score numerique reste interne/discret : l'UX affiche surtout un niveau qualitatif.
- Le score ne remplace pas le ressenti, le sommeil, la douleur ou la fatigue subjective.
- La confiance n'est pas une garantie scientifique ; elle indique si les donnees supportent raisonnablement la lecture affichee.

## Fichiers principaux

- `frontend/src/utils/analysisConfidence.js`
- `frontend/src/components/AnalysisConfidenceBadge.jsx`
- `frontend/src/pages/DashboardPage.jsx`
- `frontend/src/pages/AnalyticsPage.jsx`
- `frontend/src/pages/PerformancePage.jsx`
- `frontend/src/components/ActivityTrailCard.jsx`
