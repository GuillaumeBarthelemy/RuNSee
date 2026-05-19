# RunNSee — Lot Glossaire V5 strict — MAJ Alpine Light

## 1. Objectif

Créer ou finaliser une page **Glossaire** dédiée, stable, lisible et utile.

Le glossaire doit aider l'utilisateur à comprendre les indicateurs sans polluer les pages principales.

La page Glossaire est la référence de vocabulaire. Les autres pages doivent utiliser des libellés simples et renvoyer vers le glossaire via tooltip ou lien.

---

## 2. Route

```text
/glossaire
```

Libellé visible :

```text
Glossaire
```

---

## 3. Cible mockup validée

Structure validée :

```text
Header Glossaire
Sous-titre : Comprendre les termes clés de RunNSee.
Recherche large
Filtres par catégories
Index alphabétique
Cartes termes en grille
Message suggestion de terme
```

---

## 4. Structure attendue

```text
Header Glossaire
Recherche
Catégories
Index alphabétique
Cartes termes
Définition courte
Exemple / lecture
Alias techniques
Sources si disponibles
CTA suggestion
```

---

## 5. Catégories

Catégories visibles recommandées :

```text
Tous
Charge & entraînement
Physiologie
Performance
Récupération
Mesures
Planification
```

Règle : les catégories doivent filtrer les cartes sans changer de route.

---

## 6. Index alphabétique

Afficher :

```text
A B C D E F G H I J K L M N O P Q R S T U V W X Y Z
```

Règles :

- lettre active mise en avant ;
- lettres sans terme désactivées ou grisées ;
- pas d'overflow horizontal sur mobile ;
- scroll horizontal autorisé sur petit écran.

---

# 7. Vocabulaire canonique obligatoire

| Terme technique / alias | Terme visible principal |
|---|---|
| HRV | VFC |
| Body Battery | Énergie |
| GAP | Allure ajustée |
| Decoupling | Dérive cardiaque |
| EPOC | Dette d'oxygène |
| YTD | Cumul annuel |
| CTL | Condition |
| ATL | Fatigue |
| TSB | Équilibre charge/fatigue |
| Training Readiness | Aptitude RuNSee |
| Load | Charge d'entraînement |

Règle : les termes techniques restent trouvables comme alias, mais ne doivent pas être les titres principaux des pages.

---

# 8. Termes prioritaires à créer / vérifier

## 8.1 Charge & entraînement

```text
Charge d'entraînement
Fatigue
Condition
Équilibre charge/fatigue
Volume
Intensité
Zones d'intensité
Endurance fondamentale
Régularité
Cumul annuel
```

## 8.2 Physiologie

```text
VFC
FC repos
FC max
FC seuil
Dérive cardiaque
Dette d'oxygène
VO2max
VDOT
```

## 8.3 Performance

```text
Allure ajustée
Allures de référence
Économie de course
Records
Meilleurs segments
Estimation prudente
```

## 8.4 Récupération

```text
Énergie
Sommeil
Stress
Aptitude RuNSee
Récupération
Disponibilité
```

## 8.5 Trail

```text
Dénivelé positif
Dénivelé négatif
Dénivelé par kilomètre
Sortie trail
Randonnée
Charge descente
```

---

# 9. Structure d'une carte terme

Chaque carte doit contenir :

```text
icône
terme principal
catégorie
définition courte
alias techniques
chevron / ouverture détail
```

Exemple :

```text
VFC
Variation de l'intervalle entre deux battements cardiaques. Indicateur de récupération et d'équilibre du système nerveux autonome.
Alias : HRV, RMSSD
Catégorie : Physiologie / Récupération
```

---

# 10. Détail d'un terme

Si un panneau détail existe, afficher :

```text
définition courte
comment le lire
où l'indicateur est utilisé dans RunNSee
limites
alias
source / référence si disponible
```

Règle : le détail doit rester pédagogique, pas académique lourd.

---

# 11. Interdits

- Ne pas réintroduire une modale globale obligatoire.
- Ne pas casser les ancres existantes.
- Ne pas dupliquer les définitions dans chaque page.
- Ne pas supprimer les alias techniques.
- Ne pas utiliser les termes techniques comme libellés principaux.
- Ne pas créer de jargon non expliqué.
- Ne pas afficher une vérité médicale.

---

# 12. Liens avec le reste de l'application

## 12.1 InfoTooltip

Les tooltips doivent renvoyer vers le terme du glossaire si possible.

Exemple :

```text
/glossaire#vfc
/glossaire#allure-ajustee
/glossaire#dette-oxygene
```

## 12.2 GlossaryLink

Si un composant `GlossaryLink` existe, le conserver et vérifier :

```text
anchor valide
terme existant
accessibilité clavier
pas de modale globale
```

---

# 13. Placeholders autorisés

Créer ou mettre à jour :

```text
docs/ux/PLACEHOLDERS_ALPINE_LIGHT.md
```

Placeholders possibles :

| Élément | Autorisé ? | Condition |
|---|---:|---|
| Envoi suggestion de terme | oui | bouton désactivé ou feedback local si pas de backend |
| Sources scientifiques complètes | oui | lien vers page À propos ou méthodologie |
| Termes avancés Trail | oui | si non encore calculés dans l'app |
| Illustrations pédagogiques | oui | si non prioritaires |
| Recherche fuzzy avancée | oui | recherche simple minimale obligatoire |

---

# 14. États vides

Prévoir :

```text
aucun terme trouvé
aucune catégorie sélectionnée
recherche vide
terme non trouvé depuis une ancre
```

Exemples :

```text
Aucun terme ne correspond à ta recherche.
Essaie un alias technique comme HRV, GAP ou EPOC.
```

---

# 15. Non-régression

Vérifier :

```text
recherche fonctionnelle
catégories fonctionnelles
index alphabétique fonctionnel
ancres conservées
InfoTooltip conserve ses liens
GlossaryLink conserve ses liens
mobile sans overflow
pas de retour GlossaryModal globale
```

---

# 16. Checklist GO

- [ ] Route `/glossaire` fonctionnelle.
- [ ] Recherche fonctionnelle.
- [ ] Catégories lisibles.
- [ ] Index alphabétique fonctionnel.
- [ ] Termes FR principaux.
- [ ] Alias techniques retrouvables.
- [ ] Ancres conservées.
- [ ] InfoTooltip / GlossaryLink non cassés.
- [ ] États vides propres.
- [ ] Placeholders inscrits.
- [ ] Responsive vérifié.
- [ ] Tests/build exécutés.
- [ ] Quality gate rempli.
