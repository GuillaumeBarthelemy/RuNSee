# Prompt Claude — Reprise V5 finalisation RunNSee

À copier-coller dans Claude.

---

Tu reprends le chantier RunNSee Alpine Light.

## Situation

- Le visuel de la page Accueil est validé : ne plus le modifier sauf bug.
- La fiabilité métier des indicateurs peut être discutée séparément : ne pas bloquer l'UX.
- La page Activités a été développée mais doit passer par le mini-lot de recalage.
- Les lots restants doivent être réalisés avec une fidélité forte au PDF de mockups.

## Problème constaté

Les lots précédents nécessitent trop souvent un recalage UX après coup.
À partir de maintenant, tu dois appliquer un processus strict de conception, développement, recette et déploiement.

## Références à lire avant tout code

- `00_README_CONTRAT_GLOBAL_V5_FINALISATION.md`
- `01_ORCHESTRATION_CHANTIER_V5_FINALISATION.md`
- `14_RECALAGE_LOT_03_ACTIVITES_AVANT_LOT_04.md`
- `15_QUALITY_GATE_VISUEL_PAR_LOT_V5.md`
- `17_RECETTE_TRANSVERSE_V5.md`
- `18_DEPLOIEMENT_LOCAL_ET_VALIDATION_V5.md`
- `19_CLOTURE_CHANTIER_ET_BASELINE_V5.md`
- `20_GRILLE_ANALYSE_CODE_AVANT_CHAQUE_LOT_V5.md`
- le fichier V5 du lot courant
- le PDF des mockups

## Règle de priorité

1. PDF mockups.
2. Plans V5.
3. Code existant pour la logique métier.
4. Données réellement disponibles.
5. Placeholders documentés.

## Interdictions

- Ne code pas immédiatement.
- Ne modifie pas visuellement Accueil.
- Ne démarre pas Analyse avant le recalage Activités.
- Ne livre pas une page ou sous-page obligatoire en placeholder.
- Ne change pas un calcul métier sans preuve de non-régression.
- Ne touche pas au backend sauf nécessité démontrée.
- Ne laisse aucun bouton actif sans action.
- Ne laisse aucun libellé visible sans accent.
- Ne laisse aucun affichage `NaN`, `undefined`, `null`, `— km`, `— bpm`, `— m`.
- Ne passe pas au lot suivant sans GO explicite.

## Méthode obligatoire par lot

1. Lire le PDF et le plan V5.
2. Produire le mapping `PDF -> composants -> données -> risques`.
3. Lire les fichiers existants.
4. Déclarer les placeholders nécessaires.
5. Développer.
6. Exécuter :
   ```bash
   cd frontend
   npm test -- --run
   npm run build
   ```
7. Tester les routes et le responsive.
8. Comparer le rendu au PDF.
9. Remplir le bilan du quality gate.
10. Conclure GO / NO GO.

## Ordre de travail

1. `14_RECALAGE_LOT_03_ACTIVITES_AVANT_LOT_04.md`
2. `04_PAGE_ANALYSE_V5_STRICT.md`
3. `05_PAGE_PERFORMANCE_V5_STRICT.md`
4. `06_PAGE_PROGRESSION_V5_STRICT.md`
5. `07_PAGE_REGLAGES_V5_STRICT.md`
6. `08_PAGE_GLOSSAIRE_V5_STRICT.md`
7. `17_RECETTE_TRANSVERSE_V5.md`
8. `18_DEPLOIEMENT_LOCAL_ET_VALIDATION_V5.md`
9. `19_CLOTURE_CHANTIER_ET_BASELINE_V5.md`

## Première réponse attendue

Ne code pas.

Réponds d'abord avec :

1. état des lots déjà réalisés ;
2. confirmation que Accueil est gelé visuellement ;
3. plan de recalage Activités ;
4. mapping des lots restants vers pages PDF ;
5. risques principaux ;
6. fichiers que tu vas lire ;
7. méthode de quality gate ;
8. plan de recette et déploiement final.
