# ADR-0001 - Modele multi-source Strava / Garmin

## Statut

Accepte

## Contexte

RunNSee utilise Strava comme source historique principale des activites, puis Garmin Connect non officiel comme source d'enrichissement et de recuperation de donnees manquantes.

## Decision

- Strava reste la source principale lorsqu'un match Garmin/Strava fiable existe.
- Garmin enrichit l'activite Strava via `ActivityProviderEnrichment`.
- Une activite Garmin-only peut etre creee uniquement si le matching retourne `not_found`.
- Un match `ambiguous` ne cree pas de Garmin-only.
- Les rapprochements provider sont traces dans `ActivityProviderLink`.

## Consequences

- Les dashboards doivent lire les activites canoniques, pas les payloads Garmin bruts.
- Les doublons provider doivent etre repares par soft-merge non destructif, jamais par suppression directe Strava.
- Les activites `isMerged=true` sont conservees en base mais masquees des lectures courantes.

## Risques

- Mauvais matching si deux seances proches ont des metriques similaires.
- Divergence temporaire entre Strava et Garmin apres sync partielle.
- Garmin non officiel reste instable et peut retourner des payloads partiels.

## Date

2026-05-09
