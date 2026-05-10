# RunNSee — Recette transverse V5

## 1. Objectif

Valider que les lots ne sont pas seulement conformes isolément, mais cohérents entre eux.

## 2. Routes à tester

| Route | Attendu |
|---|---|
| `/` ou `/dashboard` | Accueil visuellement gelé |
| `/activities` | Activités recalée |
| `/analytics` | Analyse complète |
| `/performance` | Performance complète |
| `/progression` | Progression non-placeholder |
| `/admin` | Réglages propres |
| `/glossaire` | Glossaire dédié |

## 3. Contrôles UX transverses

- Header homogène.
- Sidebar homogène.
- Topbar homogène.
- Filtres compacts.
- Sous-onglets cohérents.
- Cartes homogènes.
- Rails droits cohérents.
- États vides homogènes.
- Wording FR homogène.
- Pas de termes techniques en titre principal.
- Pas de faux boutons.
- Pas de données fictives.

## 4. Contrôles techniques

Frontend :

```bash
cd frontend
npm test -- --run
npm run build
```

Backend si modifié :

```bash
cd backend
npm test
```

ou commande équivalente existante dans le projet.

## 5. Contrôles données

- Distance : format propre.
- Durée : format propre.
- D+ : format propre.
- FC : pas d'unité si valeur absente.
- Scores : pas de `/100` sauf score borné.
- Comparaisons : pas de division par zéro.
- Activités Strava/Garmin : pas de double comptage.
- États Garmin absent : propres.

## 6. Contrôles responsive

Tester au minimum :

- desktop large ;
- laptop ;
- tablette ;
- mobile 375 px.

À vérifier :

- sidebar / navigation ;
- cartes empilées ;
- rail droit repositionné ;
- filtres non envahissants ;
- graphiques lisibles.

## 7. Matrice de validation à produire

Créer ou mettre à jour :

```text
docs/quality/RUNSEE_VALIDATION_MATRIX.md
```

Format :

```md
| Page | Desktop | Mobile | Données réelles | État vide | PDF OK | Commentaire |
|---|---|---|---|---|---|---|
```

## 8. Critère GO transverse

GO si aucune page principale n'a :

- layout non conforme ;
- placeholder bloquant ;
- bouton sans action ;
- valeur technique brute ;
- build KO ;
- route KO.
