# RunNSee — Plan page Glossaire

Référence PDF : page 27  
Route : `/glossaire`  
Fichier principal : `frontend/src/pages/GlossairePage.jsx`  
Priorité : P2 — page existante à harmoniser.

---

## 1. Compréhension du besoin

Le Glossaire doit être une page pédagogique dédiée.  
Il aide l'utilisateur à comprendre les indicateurs RunNSee sans surcharger les pages métier.

---

## 2. État actuel connu

`GlossairePage.jsx` existe déjà avec :

- recherche ;
- catégories ;
- ancres ;
- contenu dans `frontend/src/content/glossary.js` ;
- `InfoTooltip` peut pointer vers le glossaire.

L'objectif est donc un polissage UX, pas une refonte complète.

---

## 3. Structure attendue

1. header `Glossaire` ;
2. sous-texte pédagogique ;
3. barre de recherche ;
4. filtres catégories ;
5. éventuellement index alphabétique ;
6. grille ou liste de cartes ;
7. chaque entrée : terme, définition courte, alias techniques, usage dans RunNSee.

---

## 4. Fichiers à lire avant modification

- `frontend/src/pages/GlossairePage.jsx`
- `frontend/src/content/glossary.js`
- `frontend/src/content/glossary.test.js`
- `frontend/src/components/InfoTooltip.jsx`
- `frontend/src/components/GlossaryLink.jsx`
- `frontend/src/components/visuals/alpine/EmptyState.jsx`
- `frontend/src/styles.css`

---

## 5. Vocabulaire à contrôler

Les termes principaux doivent être les libellés utilisateur :

| Alias technique possible | Terme principal attendu |
|---|---|
| HRV | VFC |
| Body Battery | Énergie |
| GAP | Allure ajustée |
| Decoupling | Dérive cardiaque |
| EPOC | Dette d'oxygène |
| Fitness | Aptitude RuNSee |
| YTD | Cumul annuel |

Les acronymes peuvent rester en alias, synonymes ou détail.

---

## 6. Développement attendu

### 6.1 Harmonisation visuelle

- utiliser des cartes Alpine Light ;
- hiérarchie claire ;
- titres lisibles ;
- badges catégories ;
- recherche compacte ;
- mobile propre.

### 6.2 Recherche

Conserver la recherche existante.  
Vérifier :

- recherche par terme principal ;
- recherche par alias ;
- recherche insensible à la casse ;
- état vide propre.

### 6.3 Ancres

Vérifier que les liens de type `/glossaire#vfc` fonctionnent depuis `InfoTooltip`.

### 6.4 Suppression de l'ancien modèle modal

Ne pas réintroduire `GlossaryModal`.  
Si du CSS `GlossaryModal` reste inutilisé, le supprimer seulement dans le lot de nettoyage final.

---

## 7. Risques / points de vigilance

| Risque | Contrôle |
|---|---|
| Terme technique en titre principal | vérifier `glossary.js` |
| Recherche cassée | tester termes + alias |
| Ancres cassées | tester depuis tooltip |
| Modal réintroduite | rechercher `GlossaryModal` |
| CSS mort supprimé trop tôt | nettoyer en dernier |

---

## 8. Vérification de non-régression

Commandes :

```bash
cd frontend
npm test -- --run
npm run build
```

Recherches :

```bash
rg "GlossaryModal|HRV|Body Battery|GAP|Decoupling|EPOC|YTD" frontend/src/content frontend/src/pages frontend/src/components
```

Contrôles manuels :

- `/glossaire` ;
- recherche `VFC` ;
- recherche `HRV` ;
- recherche `Allure ajustée` ;
- recherche `GAP` ;
- lien `/glossaire#vfc` ;
- mobile 375 px.

---

## 9. Critères d'acceptation

- Glossaire est une page dédiée.
- La recherche fonctionne.
- Les alias techniques restent accessibles.
- Les termes principaux sont en français canonique.
- Le rendu est Alpine Light.
- Aucun retour à une modale globale.
- Build frontend OK.
