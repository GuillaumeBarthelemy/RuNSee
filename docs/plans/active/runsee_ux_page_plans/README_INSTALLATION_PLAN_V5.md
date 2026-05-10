# Installation du plan V5 RunNSee

## 1. Emplacement cible

Copier le contenu de ce dossier dans le repo local RunNSee :

```text
docs/plans/active/runsee_ux_page_plans/
```

## 2. Méthode recommandée

Depuis la racine du repo RunNSee :

```powershell
Copy-Item -Recurse -Force "<chemin_extraction>\docs\plans\active\runsee_ux_page_plans\*" ".\docs\plans\active\runsee_ux_page_plans\"
```

Alternative manuelle :

1. dézipper l'archive ;
2. ouvrir le dossier `docs/plans/active/runsee_ux_page_plans` ;
3. copier tous les fichiers `.md` ;
4. les coller dans le même dossier du repo RunNSee ;
5. accepter l'écrasement uniquement pour les fichiers portant le même nom V5.

## 3. Fichier à donner à Claude

Démarrer avec :

```text
docs/plans/active/runsee_ux_page_plans/16_PROMPT_CLAUDE_REPRISE_V5_FINALISATION.md
```

## 4. Fichiers V5 prioritaires

Les fichiers V5 priment sur les versions précédentes :

- `00_README_CONTRAT_GLOBAL_V5_FINALISATION.md`
- `01_ORCHESTRATION_CHANTIER_V5_FINALISATION.md`
- `04_PAGE_ANALYSE_V5_STRICT.md`
- `05_PAGE_PERFORMANCE_V5_STRICT.md`
- `06_PAGE_PROGRESSION_V5_STRICT.md`
- `07_PAGE_REGLAGES_V5_STRICT.md`
- `08_PAGE_GLOSSAIRE_V5_STRICT.md`
- `15_QUALITY_GATE_VISUEL_PAR_LOT_V5.md`
- `16_PROMPT_CLAUDE_REPRISE_V5_FINALISATION.md`
- `17_RECETTE_TRANSVERSE_V5.md`
- `18_DEPLOIEMENT_LOCAL_ET_VALIDATION_V5.md`
- `19_CLOTURE_CHANTIER_ET_BASELINE_V5.md`
- `20_GRILLE_ANALYSE_CODE_AVANT_CHAQUE_LOT_V5.md`
- `21_CHECKLIST_SECURISATION_POST_CHANTIER_V5.md`

## 5. Ordre de travail

1. Recalage Activités.
2. Analyse.
3. Performance.
4. Progression.
5. Réglages.
6. Glossaire.
7. Recette transverse.
8. Déploiement local.
9. Clôture / baseline.

## 6. Vérification après copie

Depuis la racine du repo :

```powershell
Get-ChildItem .\docs\plans\active\runsee_ux_page_plans\*V5*.md
```

Tu dois voir les fichiers V5 listés ci-dessus.
