# RunNSee — Lot Réglages V5 strict — MAJ Alpine Light

## 1. Objectif

Transformer la vue **Réglages** en page claire, sécurisée, non technique et fidèle au mockup Alpine Light validé.

La page doit permettre de gérer :

- le compte utilisateur ;
- les connexions Strava / Garmin ;
- les paramètres d'entraînement ;
- les données et synchronisations ;
- les informations projet / méthodologie.

Cette page ne doit pas redevenir une page admin brute.

---

## 2. Route et libellé

Route actuelle probable :

```text
/admin
```

Libellé visible dans la navigation :

```text
Réglages
```

Ne pas renommer la route sans demande explicite si cela casse la navigation existante.

---

## 3. Cible mockup validée

Le mockup validé pour Réglages est la vue en **5 sous-onglets** :

```text
Compte
Connexions
Entraînement
Données
À propos
```

La page globale doit garder :

```text
Header Réglages
Sous-titre : Gère ton compte, tes connexions et tes préférences.
Sous-onglets horizontaux
Cartes Alpine Light
Actions sécurisées
Messages explicatifs
Colonne droite facultative selon largeur
```

---

## 4. Sous-onglets obligatoires

| Onglet visible | Hash | Rôle | Statut attendu |
|---|---|---|---|
| Compte | `#compte` | utilisateur, profil, sécurité | complet |
| Connexions | `#connexions` | Strava, Garmin, intégrations | complet |
| Entraînement | `#entrainement` | FC, zones, unités, calculs | complet |
| Données | `#donnees` | sync, imports, qualité, actions données | complet |
| À propos | `#a-propos` | version, sources, limites, crédits | complet |

Règle : les sous-onglets doivent être accessibles par hash, supporter le retour navigateur et rester scrollables sur mobile.

---

# 5. Onglet Compte

## 5.1 Objectif

Afficher les informations du compte et les préférences utilisateur sans surcharge.

## 5.2 Structure attendue

```text
Carte Informations du compte
Carte Sécurité
Carte Préférences d'affichage
```

## 5.3 Champs visibles

### Informations du compte

```text
Photo / avatar si disponible
Prénom
Nom
Email
Langue
Fuseau horaire
Bouton Enregistrer les modifications
```

### Sécurité

```text
Mot de passe
Sessions actives
Déconnexion de tous les appareils
```

### Préférences d'affichage

```text
Thème
Unités
Densité d'affichage
```

## 5.4 Règles UX

- Pas de champ technique visible inutile.
- Les actions de sécurité doivent être visuellement séparées.
- Les boutons sensibles doivent avoir un libellé clair.
- Aucun bouton sans handler.
- Si une action n'est pas encore développée : la désactiver et l'inscrire dans le registre des placeholders.

---

# 6. Onglet Connexions

## 6.1 Objectif

Clarifier les plateformes connectées et leur état.

## 6.2 Structure attendue

```text
Plateformes connectées
- Strava
- Garmin Connect

Autres intégrations
- Apple Santé
- TrainingPeaks
```

## 6.3 Pour chaque provider connecté

Afficher :

```text
Nom du provider
Statut : Connecté / Déconnecté / Erreur / Synchronisation en cours
Compte connecté
Dernière synchronisation
Données synchronisées
Bouton Re-synchroniser
Menu actions
```

## 6.4 Strava

Afficher clairement :

```text
Activités
Fréquence cardiaque
Puissance si donnée reçue, mais ne pas l'afficher dans Performance
Parcours si disponible
```

## 6.5 Garmin

Afficher clairement :

```text
Activités
Fréquence cardiaque
Appareils
Sommeil & récupération
Statut Garmin bridge si applicable
```

Si Garmin est basé sur un connecteur temporaire / non officiel, afficher un message discret :

```text
Connexion Garmin temporaire. Certaines données peuvent varier selon la disponibilité du service.
```

## 6.6 Règles fortes

- Strava et Garmin doivent être distingués visuellement.
- Ne pas masquer un état erreur.
- Ne pas déclencher une synchro longue sans feedback utilisateur.
- Les actions de re-sync doivent afficher un état en cours / terminé / erreur.
- Aucun bouton actif sans handler.

---

# 7. Onglet Entraînement

## 7.1 Objectif

Regrouper les paramètres qui influencent les calculs sportifs.

## 7.2 Structure attendue

```text
Fréquence cardiaque
Zones de fréquence cardiaque
Zones de puissance / FTP si conservé en paramètre
Unités d'entraînement
Préférences de calcul
```

## 7.3 Fréquence cardiaque

Afficher :

```text
FC max
Date de définition
Bouton Modifier
```

Les paramètres FC doivent mentionner leur impact :

```text
Utilisé pour calculer les zones, la charge, l'intensité et certaines lectures de performance.
```

## 7.4 Zones de fréquence cardiaque

Afficher les zones :

```text
Z1 Récupération
Z2 Endurance
Z3 Tempo
Z4 Seuil
Z5 VO2max
```

Chaque zone doit afficher :

```text
borne basse
borne haute
pourcentage de FC max
```

## 7.5 FTP / puissance

Si un champ FTP existe dans l'existant, il peut rester dans Réglages comme paramètre technique.

Règle non négociable :

```text
Le maintien éventuel de FTP dans Réglages ne doit pas réintroduire de section Puissance dans Performance.
```

## 7.6 Unités

Afficher :

```text
Distance : km
Allure : min/km
Puissance : watts si conservé
Poids : kilogrammes
```

## 7.7 Préférences de calcul

Afficher :

```text
Méthode de charge
Calcul des zones
Allure de référence
Dénivelé corrigé GPS
```

## 7.8 Règles

- Ne pas modifier les calculs sans justification.
- Ne pas inventer de zone si FC max absente.
- Prévoir état vide si FC max non renseignée.
- Tooltip obligatoire sur les paramètres qui influencent plusieurs pages.

---

# 8. Onglet Données

## 8.1 Objectif

Rendre visibles les synchronisations, la qualité des données et les actions avancées sans exposer une page admin technique.

## 8.2 Structure attendue

```text
Synchronisations
Historique des imports
Qualité des données
Actions sur données
```

## 8.3 Synchronisations

Afficher :

```text
Dernière synchronisation globale
Mode automatique
Prochaine synchronisation
Bouton Synchroniser maintenant
```

## 8.4 Historique des imports

Afficher par ligne :

```text
date / heure
source
nombre d'activités
statut
détail / voir
```

## 8.5 Qualité des données

Afficher :

```text
Activités complètes
FC connue
Altitude / dénivelé
Doublons potentiels
Garmin-only
Backfill Garmin
```

Ne pas confondre absence de donnée et valeur zéro.

## 8.6 Actions sur données

Regrouper dans une zone explicitement nommée :

```text
Actions avancées
```

Actions possibles :

```text
Combler les données manquantes
Recalculer les métriques
Réinitialiser les caches
Lancer / suivre le backfill Garmin
```

## 8.7 Règles de sécurité

- Toute action longue doit afficher un message clair.
- Toute action destructive doit demander confirmation.
- Ne pas placer purge / reset au même niveau qu'une action simple.
- Les actions de backfill doivent mentionner leur portée.
- Si l'action est placeholder, bouton désactivé + mention dans registre.

---

# 9. Onglet À propos

## 9.1 Objectif

Expliquer RunNSee, sa méthodologie et ses limites.

## 9.2 Structure attendue

```text
À propos de RunNSee
Méthodologie
Sources scientifiques
Version
Crédits
Glossaire
Liens utiles
```

## 9.3 Contenu recommandé

### À propos de RunNSee

```text
RunNSee transforme tes données d'entraînement en indicateurs simples, fiables et actionnables.
```

### Méthodologie

Lien vers :

```text
docs/methodologie si existant
Glossaire
```

### Sources scientifiques

Lien ou section vers les principes utilisés :

```text
charge d'entraînement
récupération
VFC
intensité
progression
```

### Version

Afficher :

```text
version application
date dernière mise à jour
```

### Crédits

Afficher :

```text
Projet personnel / crédits techniques
```

---

# 10. Placeholders autorisés

Créer ou mettre à jour :

```text
docs/ux/PLACEHOLDERS_ALPINE_LIGHT.md
```

Placeholders possibles sur Réglages :

| Élément | Autorisé ? | Condition |
|---|---:|---|
| Apple Santé | oui | intégration future, bouton désactivé |
| TrainingPeaks | oui | intégration future, bouton désactivé |
| Export complet | oui | si backend non disponible |
| Purge données | non actif | uniquement si confirmation forte |
| Recalcul caches | oui | si action réelle branchée |
| Sources scientifiques détaillées | oui | lien ou carte informative |

---

# 11. Non-régression

Vérifier :

```text
hash routing conservé
back/forward navigateur OK
tabs scrollables mobile
connexions Strava/Garmin fonctionnelles
statuts provider non cassés
aucune modification auth
aucune modification sync
aucune modification backfill
aucune action destructive sans confirmation
aucun bouton actif sans handler
```

---

# 12. Checklist GO

- [ ] 5 onglets présents.
- [ ] Hash routing fonctionnel.
- [ ] Actions sensibles lisibles.
- [ ] Aucun bouton sans handler.
- [ ] Connexions Strava/Garmin claires.
- [ ] Données / backfill séparés.
- [ ] FTP ne réintroduit pas Puissance dans Performance.
- [ ] Responsive vérifié.
- [ ] États vides propres.
- [ ] Placeholders inscrits.
- [ ] Tests/build exécutés.
- [ ] Quality gate rempli.
