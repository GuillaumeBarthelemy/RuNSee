# Architecture multi-sources RunNSee

## Principe canonique

`Activity` represente maintenant l'activite canonique affichee par RunNSee, quelle que soit la source principale.

Identite canonique :

```text
appUserId + sourceProvider + sourceActivityId
```

Sources actuelles :

- `strava` : source historique et prioritaire quand un match fiable Garmin existe ;
- `garmin` : fallback canonique pour les activites Garmin sans match Strava fiable.

## Roles des tables

| Table | Role |
|---|---|
| `Activity` | Activite visible et analysee dans RunNSee. |
| `ActivityProviderEnrichment` | Donnees normalisees complementaires d'un provider pour une activite canonique. |
| `ActivityProviderLink` | Trace de matching entre une activite provider et une activite canonique. |
| `ExternalProviderRawData` | Payload brut provider, conserve hors frontend. |
| `ProviderBackfillCursor` | Curseur de backfill historique par provider et ressource. |

## Regles Garmin

- Si une activite Garmin matche une activite Strava de facon fiable, Strava reste canonique et Garmin enrichit.
- Si aucun match fiable n'existe et que le match n'est pas ambigu, une activite Garmin-only peut etre creee.
- Si le match est ambigu, RunNSee ne merge pas et ne cree pas de doublon automatiquement.
- Les types Garmin inclus sont course, trail, tapis, piste et randonnee.
- Le matching s'appuie sur heure de depart, distance, duree, D+, FC moyenne et compatibilite sport. Le nom de seance n'est jamais bloquant.
- Une activite Garmin deja liee ne doit pas recreer une activite Garmin-only lors d'une synchronisation suivante.

## Doublons inter-provider

La reparation des doublons Strava/Garmin est volontairement non destructive :

- `isMerged = true` masque l'activite doublon des lectures courantes ;
- `mergedIntoActivityId` conserve la cible canonique ;
- `ActivityProviderLink` garde la trace du rapprochement Garmin -> Strava ;
- les scripts DB fonctionnent en dry-run par defaut et exigent un `--confirm` explicite pour appliquer.

Le champ `totalElevationLoss` devient le stockage canonique du D- quand une source le fournit. Les calculs trail utilisent d'abord les segments, puis ce champ de synthese en fallback.

## Sync globale

Modes retournes par `/sync/all` :

- `strava_primary_garmin_enrichment_with_fallback`
- `strava_only`
- `garmin_primary`
- `no_provider`

La fenetre Garmin recente est bornee par `GARMIN_ACTIVITY_SYNC_RECENT_DAYS` avec un maximum produit de 30 jours.

## Backfill historique

Le modele est pret pour un backfill Garmin par tranches via `ProviderBackfillCursor`.

Parametres prevus :

- `GARMIN_BACKFILL_WINDOW_DAYS`
- `GARMIN_BACKFILL_MIN_INTERVAL_MINUTES`
- `GARMIN_BACKFILL_MAX_WINDOWS_PER_RUN`

La regle produit reste : lancement manuel, puis poursuite automatique par tranches de 180 jours maximum, une tranche par heure par defaut.
