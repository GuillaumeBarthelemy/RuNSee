# RunNSee — Lot Réglages V5 strict

## 1. Objectif

Transformer Réglages en page claire, sécurisée et non technique, sans perdre les fonctions admin utiles.

## 2. Route

Route actuelle probable :

```text
/admin
```

Libellé visible :

```text
Réglages
```

## 3. Onglets obligatoires

| Onglet visible | Hash | Rôle |
|---|---|---|
| Compte | `#compte` | utilisateur, sécurité |
| Connexions | `#connexions` | Strava, Garmin |
| Entraînement | `#entrainement` | FC, zones, objectifs |
| Données | `#donnees` | sync, backfill, qualité |
| À propos | `#a-propos` | version, sources, limites |

## 4. Règles

- Aucun bouton destructeur ou long sans message clair.
- Strava et Garmin doivent être distingués.
- Garmin temporaire / non officiel doit être signalé si applicable.
- Les paramètres FC doivent indiquer leur impact sur les indicateurs.
- Les actions de backfill doivent être explicites.
- Pas de page admin brute.
- Pas de bouton actif sans handler.

## 5. Structure attendue

```text
Header Réglages
Sous-onglets
Cartes par section
Statuts
Actions
Messages de sécurité
```

## 6. Checklist GO

- [ ] 5 onglets présents.
- [ ] Actions sensibles lisibles.
- [ ] Aucun bouton sans handler.
- [ ] Connexions Strava/Garmin claires.
- [ ] Données / backfill séparés.
- [ ] Responsive vérifié.
- [ ] Tests/build exécutés.
- [ ] Quality gate rempli.
