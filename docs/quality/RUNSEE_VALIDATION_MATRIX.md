# RunNSee - Matrice de validation

| Domaine | Derniere validation | Commit | Statut | Commentaire |
|---|---|---|---|---|
| Sync Strava | 2026-05-08 | `c33608d` | OK technique | Sync historique conservee, validation visuelle globale encore utile |
| Sync Garmin recovery | 2026-05-08 | `c33608d` | OK technique | Provider Garmin connecte en prod |
| Sync Garmin activites | 2026-05-09 | `main` | OK | Deux fenetres backfill reelles traitees, validation UI post-fenetre 2 confirmee |
| Matching Garmin/Strava | 2026-05-09 | `main` | OK | Dry-run prod a 0 apres validation UI (`scannedActivities=928`) |
| Soft-merge doublons | 2026-05-09 | `c33608d` | OK | Soft-merge non destructif valide sur fenetre 1 |
| Backfill Garmin | 2026-05-09 | `main` | GO surveille | Poursuite automatique autorisee apres validation UI et dry-run prod a 0 |
| Score confiance analyses | 2026-05-09 | `main` | OK visuel | Validation visuelle authentifiee desktop + mobile confirmee par utilisateur ; correction wording VDOT et correctif charge recente appliques ; tag `runsee-stable-analysis-confidence` a poser apres push |
| Aujourd'hui / Charge recente | 2026-05-09 | `main` | OK | Correctif applique : valeur affichee = cumul 7 j (coherent bareme glossaire), charge du jour mentionnee separement dans le detail |
| Aujourd'hui | 2026-05-09 | `main` | OK visuel | Recette utilisateur post-fenetre 2 : pas de double comptage visible remonte |
| Activites | 2026-05-09 | `main` | OK visuel | Recette utilisateur post-fenetre 2 : doublons non observes |
| Analytics | 2026-05-09 | `main` | OK visuel | Recette utilisateur post-fenetre 2 : volumes/charges coherents visuellement |
| Performance | 2026-05-09 | `main` | OK visuel | Liens multi-source stabilises, pas d'anomalie remontee pendant recette |
| Objectifs | 2026-05-09 | `main` | OK conditionnel | Aucun blocage remonte ; a revalider si nouvel objectif trail critique |
| Trail | 2026-05-08 | `c33608d` | OK technique | Champs et lectures trail presents |
