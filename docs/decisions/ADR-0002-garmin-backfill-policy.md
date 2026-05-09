# ADR-0002 - Politique de backfill historique Garmin

## Statut

Accepte

## Contexte

Le backfill Garmin doit enrichir progressivement l'historique sans saturer Garmin et sans recreer de doublons Garmin/Strava.

## Decision

- Le backfill historique Garmin fonctionne par fenetres de 180 jours par defaut.
- Une seule fenetre est traitee par sweep en production.
- L'intervalle minimal par defaut est de 60 minutes.
- `GARMIN_BACKFILL_ALLOW_FORCE_RUN=false` en production.
- Les compteurs et resultats sont persistants via `ProviderBackfillWindowLog`.
- Un controle doublon est execute avant ecriture.
- Un controle doublon est execute apres ecriture.
- Si un doublon apparait apres fenetre, un soft-merge non destructif est tente.
- Le curseur ne progresse que si le controle residuel revient a 0.

## Consequences

- Le backfill est plus lent, mais plus robuste.
- Les validations metier doivent s'appuyer sur les logs persistants et sur le dry-run doublons.
- Le backfill est valide pour une VM mono-instance ; un lock DB sera necessaire en multi-instance.

## Risques

- Rate limit Garmin.
- Payloads Garmin anciens incomplets.
- Validation visuelle UI necessaire apres les premieres fenetres reelles.

## Date

2026-05-09
