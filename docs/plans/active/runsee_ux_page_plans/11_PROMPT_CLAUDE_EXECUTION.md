# Prompt final à donner à Claude Code Pro

Copier-coller ce prompt dans Claude au début du chantier.

---

Tu reprends le chantier RunNSee Alpine Light après exécution des premiers lots. Le socle global, le layout Alpine Light et la page Aujourd'hui ont été travaillés. La page Activités n'a pas encore été jouée : c'est normal.

## Objectif

Implémenter l'interface proposée dans le PDF de mockups avec une fidélité maximale, page RunNSee par page RunNSee, sans casser la logique métier existante.

## Références obligatoires

Lis avant de coder :

- `00_README_CONTRAT_GLOBAL.md`
- `01_ORCHESTRATION_CHANTIER.md`
- `12_DESIGN_SYSTEM_ALPINE_LIGHT.md`
- `13_REPRISE_POST_LOTS_0_2_AUJOURDHUI.md` si tu reprends juste après les premiers lots
- le fichier `.md` de la page que tu traites
- `09_PLACEHOLDERS_ET_BACKLOG.md`
- `10_RECETTE_NON_REGRESSION.md`
- `.tmp/alpine_light/02_mockups/runsee_mockups_support_presentation_final.pdf`, pages 5 à 28
- `.tmp/alpine_light/00_CHECKLIST_ANTI_REGRESSION_ALPINE_LIGHT.md` si présent
- `.tmp/alpine_light/00_SUIVI_CHANTIER_ALPINE_LIGHT.md` si présent
- `docs/quality/RUNSEE_VALIDATION_MATRIX.md` si présent
- `docs/quality/RUNSEE_TEST_LOG.md` si présent

## Règle de priorité

1. Le PDF prime pour la cible visuelle.
2. Les fichiers `.md` de plan page par page priment pour le découpage et les critères d'acceptation.
3. Le code existant prime pour la logique métier.
4. Tu ne dois pas inventer une donnée pour coller au mockup.

## Interdictions

Ne modifie pas sans justification explicite :

- les calculs métier ;
- Prisma ;
- l'authentification ;
- la sync Strava/Garmin ;
- le matching Strava/Garmin ;
- le backend ;
- les routes API.

N'affiche jamais de donnée fictive comme réelle.

Interdit également :

- page Progression en placeholder ;
- Performance sans onglet Records ;
- Analyse sans 5 sous-onglets ;
- `YTD` en libellé utilisateur ;
- section Puissance dans Performance ;
- lien `/activities/undefined` ;
- météo ou séance suggérée hardcodée.

## Sous-onglets obligatoires

Analyse :

- Vue d'ensemble
- Charges
- Tendances
- Intensités
- Sommeil & récupération

Performance :

- Vue d'ensemble
- VDOT & profil
- Allures de référence
- FC de performance
- Records

Progression :

- Cumul annuel
- Volume
- Régularité
- Comparaisons

Réglages :

- Compte
- Connexions
- Entraînement
- Données
- À propos

## Méthode de travail

Travaille lot par lot :

1. inventaire avant code ;
2. design system ;
3. Aujourd'hui ;
3.5. recalage post-Aujourd'hui selon `13_REPRISE_POST_LOTS_0_2_AUJOURDHUI.md` ;
4. Activités ;
5. Analyse ;
6. Performance ;
7. Progression ;
8. Réglages ;
9. Glossaire ;
10. placeholders/backlog ;
11. recette finale.

Après chaque lot, fournis :

- fichiers lus ;
- fichiers modifiés ;
- composants créés ;
- décisions prises ;
- placeholders ajoutés ;
- tests exécutés ;
- risques de régression ;
- écarts restants vs PDF.

## Commandes obligatoires après chaque lot modifié

```bash
cd frontend
npm test -- --run
npm run build
```

En fin de chantier, exécute aussi :

```bash
cd backend
npm test
npx prisma validate
npm run prisma:pg:validate
npm run db:compare-schemas
node --check src/app.js
node --check src/server.js
```

## Première action demandée

Commence par le mini-lot de reprise : lis `13_REPRISE_POST_LOTS_0_2_AUJOURDHUI.md`, vérifie les écarts résiduels de la page Aujourd'hui, corrige uniquement ces écarts, puis passe à `03_PAGE_ACTIVITES.md`.

Ne relance pas une refonte globale des lots déjà joués.

Si tu n'as pas encore fait le Lot 0 dans cette session, commence par le Lot 0 : inventaire avant code.

Tu dois répondre avec :

1. état réel des pages principales ;
2. fichiers à modifier par lot ;
3. risques identifiés ;
4. écarts majeurs avec le PDF ;
5. confirmation que tu ne codes pas encore.

Ne commence pas le code tant que cet inventaire n'est pas posé.
