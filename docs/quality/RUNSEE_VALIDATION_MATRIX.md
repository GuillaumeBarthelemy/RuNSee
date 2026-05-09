# RunNSee - Matrice de validation

| Domaine | Derniere validation | Commit | Statut | Commentaire |
|---|---|---|---|---|
| Sync Strava | 2026-05-08 | `c33608d` | OK technique | Sync historique conservee, validation visuelle globale encore utile |
| Sync Garmin recovery | 2026-05-08 | `c33608d` | OK technique | Provider Garmin connecte en prod |
| Sync Garmin activites | 2026-05-09 | `c33608d` | OK technique | Deux fenetres backfill reelles traitees |
| Matching Garmin/Strava | 2026-05-09 | `c33608d` | OK | Dry-run doublons a 0 apres fenetre 2 |
| Soft-merge doublons | 2026-05-09 | `c33608d` | OK | Soft-merge non destructif valide sur fenetre 1 |
| Backfill Garmin | 2026-05-09 | `c33608d` | Partiel | Fenetres 1 et 2 OK ; validation visuelle UI post-fenetre 2 encore ouverte |
| Aujourd'hui | 2026-05-08 | `c33608d` | A verifier | Pas de double comptage a verifier apres backfill |
| Activites | 2026-05-08 | `c33608d` | A verifier | Validation visuelle post-fenetre 2 ouverte |
| Analytics | 2026-05-08 | `c33608d` | A verifier | Volumes/charges sans double comptage a verifier apres backfill |
| Performance | 2026-05-08 | `c33608d` | OK technique | Liens multi-source stabilises |
| Objectifs | 2026-05-08 | `c33608d` | A verifier | Validation UI objectif trail encore ouverte |
| Trail | 2026-05-08 | `c33608d` | OK technique | Champs et lectures trail presents |
