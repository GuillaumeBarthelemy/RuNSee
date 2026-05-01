# Specification technique - Integration Garmin non officielle

## 1. Objet du document

Ce document formalise le plan d'evolution de RunNSee pour permettre a un utilisateur connecte de connecter son compte Garmin via une integration non officielle basee sur la librairie Python `garminconnect`.

Cette specification sert de base de travail pour une implementation future. Elle ne constitue pas une implementation et ne modifie pas l'existant.

Objectif produit :

- Enrichir RunNSee avec des donnees Garmin prioritaires de recuperation.
- Ameliorer la synthese decisionnelle avec des signaux physiologiques quotidiens.
- Conserver Strava comme source principale des activites sportives.
- Utiliser Garmin uniquement comme source complementaire et d'enrichissement.
- Preparer une migration future vers l'API officielle Garmin.

## 2. Decisions validees

| Sujet | Decision |
|---|---|
| Disponibilite | Connecteur Garmin non officiel disponible pour tous les comptes RunNSee connectes |
| Statut produit | Integration experimentale, non officielle |
| Authentification | Saisie temporaire des identifiants Garmin pendant la connexion |
| Mot de passe Garmin | Jamais stocke |
| Tokens / sessions | Stockage chiffre obligatoire |
| Donnees prioritaires | Sommeil, HRV, frequence cardiaque de repos, stress, Body Battery |
| Backfill initial | 180 jours |
| Activites Garmin | Enrichissement des activites Strava existantes uniquement |
| Source principale activite | Strava reste prioritaire |
| API officielle Garmin | Cible future a preparer architecturalement |

## 3. Principes directeurs

### 3.1 Ne pas remplacer Strava

Garmin ne doit pas devenir la source principale des activites dans cette premiere phase.

Strava reste responsable :

- de la liste visible des activites ;
- des activites principales ;
- des donnees sportives actuellement exploitees ;
- des comparaisons et historiques deja en place.

Garmin peut uniquement :

- enrichir une activite Strava deja identifiee ;
- apporter des signaux de recuperation et de contexte physiologique ;
- fournir des donnees secondaires utiles a l'analyse.

### 3.2 Ne pas coupler les dashboards aux payloads Garmin

Les composants React et les calculs analytics ne doivent jamais consommer directement des payloads natifs Garmin.

Le flux attendu est :

1. Donnees natives Garmin.
2. Donnees brutes stockees avec leur source.
3. Donnees normalisees RunNSee.
4. Donnees analytics.
5. UI.

### 3.3 Assumer le caractere experimental

L'integration doit etre clairement presentee comme :

- non officielle ;
- experimentale ;
- susceptible de cesser de fonctionner ;
- distincte d'une future API officielle Garmin.

### 3.4 Eviter les faux signaux physiologiques

Les donnees Garmin doivent ameliorer la decision, pas produire une verite absolue.

Exemples :

- Une HRV basse doit etre interpretee par rapport a une baseline personnelle.
- Un Body Battery faible ne doit pas imposer seul une recommandation de repos.
- Une absence de donnee Garmin ne doit jamais etre interpretee comme une valeur nulle.

## 4. Donnees prioritaires

### 4.1 Priorite P0 - Recuperation quotidienne

| Donnee | Usage RunNSee | Fenetre initiale | Niveau de confiance |
|---|---|---:|---|
| Sommeil | Dette sommeil, recuperation, fatigue non sportive | 180 jours | Eleve si donnees presentes regulierement |
| HRV | Tendance de recuperation vs baseline personnelle | 180 jours | Eleve si disponible, sinon absent |
| Frequence cardiaque de repos | Fatigue, stress, maladie potentielle | 180 jours | Eleve |
| Stress | Charge non sportive et contexte de recuperation | 180 jours | Moyen a eleve |
| Body Battery | Signal Garmin complementaire de disponibilite | 180 jours | Moyen, score proprietaire |

### 4.2 Priorite P1 - Signaux Garmin secondaires

| Donnee | Usage RunNSee | Remarque |
|---|---|---|
| Training Readiness | Comparaison avec synthese RunNSee | Ne doit pas remplacer la logique RunNSee |
| Training Status | Signal Garmin externe | Score proprietaire |
| VO2max Garmin | Repere comparatif | Ne pas melanger avec VDOT RunNSee sans label |
| Predictions Garmin | Comparaison informative | Score proprietaire |
| FC quotidienne detaillee | Baseline et anomalies | Volumetrie a maitriser |

### 4.3 Priorite P2 - Enrichissement activite

| Donnee | Usage RunNSee |
|---|---|
| Splits / laps Garmin | Classification seance, detection fractionne/seuil/EF |
| Zones FC activite | Dominante d'intensite plus fiable |
| Cadence | Analyse technique |
| Puissance | Trail, effort vallonne, intensite complementaire |
| Training Effect | Signal secondaire sur la fiche activite |
| Fichiers FIT / TCX / GPX | Audit avance eventuel |

## 5. Architecture conceptuelle cible

### 5.1 Couches recommandees

| Couche | Role |
|---|---|
| Connector | Dialogue avec `garminconnect` et gere les erreurs specifiques |
| Provider | Abstraction metier de la source Garmin non officielle |
| Raw storage | Stockage brut source, date, payload, statut sync |
| Normalization | Transformation vers un format RunNSee stable |
| Analytics | Calculs de tendances, baselines et signaux decisionnels |
| UI | Affichage vulgarise et robuste |

### 5.2 Provider codes

Prevoir explicitement des codes source distincts :

| Provider code | Usage |
|---|---|
| `strava` | Source principale actuelle des activites |
| `garminconnect_unofficial` | Source Garmin non officielle temporaire |
| `garmin_official` | Cible future via API officielle Garmin |

### 5.3 Separation brute / normalisee / analytics

| Type de donnee | Description | Exemple |
|---|---|---|
| Brute | Payload natif conserve pour audit et migration | Reponse Garmin originale |
| Normalisee | Donnee stable consommee par RunNSee | Sommeil total, HRV moyenne, FC repos |
| Analytics | Donnee calculee ou interpretee | HRV basse vs baseline, dette sommeil |

## 6. Modele de donnees conceptuel

Cette section decrit les concepts a prevoir. Elle ne prescrit pas encore de schema SQL definitif.

### 6.1 Connexion provider

Concept : connexion externe d'un utilisateur a une source de donnees.

Champs conceptuels :

| Champ | Role |
|---|---|
| utilisateur | Proprietaire de la connexion |
| provider_code | `garminconnect_unofficial` |
| status | Connecte, expire, erreur, deconnecte |
| encrypted_session | Tokens ou session chiffrés |
| last_sync_at | Derniere synchronisation reussie |
| last_error_code | Derniere erreur technique |
| last_error_message | Message sanitise |
| consent_accepted_at | Date d'acceptation du consentement |
| created_at / updated_at | Tracabilite |

Regles :

- Ne jamais stocker le mot de passe Garmin.
- Chiffrer les tokens et sessions.
- Ne jamais logger les secrets.
- Permettre une deconnexion complete.

### 6.2 Donnees brutes provider

Concept : stockage brut optionnel et source.

Champs conceptuels :

| Champ | Role |
|---|---|
| utilisateur | Proprietaire |
| provider_code | Source |
| data_type | `sleep`, `hrv`, `stress`, `body_battery`, etc. |
| provider_date | Date metier Garmin |
| payload | Payload brut |
| payload_hash | Detection changement / idempotence |
| synced_at | Date recuperation |
| status | Succes, partiel, erreur |

Regles :

- Le payload brut peut contenir des donnees sensibles.
- L'acces doit etre limite.
- Les logs ne doivent jamais exposer le payload complet.

### 6.3 Snapshot quotidien de recuperation

Concept : donnees Garmin normalisees par jour.

Champs conceptuels :

| Champ | Role |
|---|---|
| utilisateur | Proprietaire |
| source_provider | Source |
| date | Jour local |
| timezone | Fuseau horaire |
| sleep_duration_seconds | Duree totale sommeil |
| sleep_score | Score Garmin si disponible |
| hrv_avg_ms | HRV moyenne si disponible |
| hrv_status | Statut Garmin si disponible |
| resting_hr | FC repos |
| stress_avg | Stress moyen |
| stress_max | Stress max |
| body_battery_morning | Body Battery debut de jour |
| body_battery_min | Minimum |
| body_battery_max | Maximum |
| body_battery_end | Fin de jour |
| data_quality | Complet, partiel, absent |
| synced_at | Date sync |

Regles :

- Une absence de donnee ne doit pas devenir zero.
- Les donnees doivent rester sourcees.
- Une donnee Garmin proprietaire doit rester identifiable.

### 6.4 Enrichissement activite

Concept : liaison entre une activite Strava et des donnees Garmin complementaires.

Champs conceptuels :

| Champ | Role |
|---|---|
| activity_id | Activite RunNSee principale |
| provider_code | `garminconnect_unofficial` |
| provider_activity_id | Identifiant Garmin |
| match_confidence | Niveau de confiance |
| matched_at | Date de matching |
| enrichment_status | Aucun, partiel, complet, erreur |
| normalized_enrichment | Donnees utiles normalisees |
| raw_payload_ref | Reference vers brut si conserve |

Regles :

- Ne pas creer une activite principale Garmin en doublon.
- Ne pas enrichir si le matching est ambigu.
- Conserver la source des donnees enrichies.

## 7. Authentification Garmin non officielle

### 7.1 Flux utilisateur cible

1. L'utilisateur ouvre les Reglages.
2. Il choisit "Garmin experimental".
3. RunNSee affiche un avertissement clair.
4. L'utilisateur accepte le consentement.
5. Il saisit ses identifiants Garmin.
6. RunNSee tente la connexion via `garminconnect`.
7. Si Garmin demande un code MFA, RunNSee affiche l'etape MFA.
8. RunNSee obtient une session ou des tokens.
9. RunNSee chiffre et stocke uniquement la session/tokens.
10. Le mot de passe est oublie immediatement.
11. Le backfill 180 jours demarre en arriere-plan.

### 7.2 Etats de connexion

| Etat | Description |
|---|---|
| Non connecte | Aucun token/session |
| Consentement requis | L'utilisateur doit accepter les conditions |
| Connexion en cours | Authentification Garmin en cours |
| MFA requis | Code Garmin requis |
| Connecte | Session utilisable |
| Sync en cours | Backfill ou sync quotidienne |
| Expire | Session invalide ou refresh impossible |
| Erreur Garmin | Erreur externe temporaire |
| Deconnecte | Connexion supprimee |

### 7.3 Contraintes securite auth

- Ne jamais stocker le mot de passe Garmin.
- Ne jamais logger email, mot de passe, token, cookie ou header sensible.
- Chiffrer les sessions/tokens.
- Prevoir suppression des tokens.
- Afficher clairement le caractere non officiel.

## 8. Synchronisation des donnees Garmin

### 8.1 Backfill initial 180 jours

Objectif : recuperer un historique suffisant pour construire des baselines personnelles fiables.

Ordre de recuperation recommande :

1. Frequence cardiaque de repos / heart rate daily.
2. Sommeil.
3. HRV.
4. Stress.
5. Body Battery.
6. Training Readiness / Training Status si disponible.
7. Donnees d'activite pour enrichissement.

Regles :

- Decouper par fenetres courtes.
- Sauvegarder l'avancement.
- Reprendre en cas d'interruption.
- Ne pas retraiter inutilement les jours deja synchronises.
- Marquer les jours sans donnee comme absents, pas comme zeros.

### 8.2 Synchronisation quotidienne

Frequence recommandee :

- Sync automatique quotidienne.
- Relecture glissante J-3 a J pour absorber les retards Garmin.
- Sync manuelle disponible dans les Reglages.

Etats a afficher :

- Derniere synchronisation.
- Nombre de jours synchronises.
- Nombre de jours partiels.
- Nombre d'erreurs.
- Prochaine tentative.

### 8.3 Gestion des erreurs

| Erreur | Comportement attendu |
|---|---|
| Session expiree | Passer en reconnexion requise |
| MFA requis | Passer en action utilisateur requise |
| Rate limit | Backoff et nouvelle tentative plus tard |
| Donnee absente | Marquer absent, ne pas echouer globalement |
| Endpoint indisponible | Erreur temporaire |
| Payload inattendu | Stocker erreur sanitisee, ne pas casser analytics |

## 9. Synthese decisionnelle enrichie

### 9.1 Objectif

Faire evoluer la synthese decisionnelle pour combiner :

- charge recente ;
- tendance de charge ;
- socle d'entrainement ;
- signaux de recuperation Garmin ;
- signaux subjectifs existants ou futurs.

### 9.2 Horizons recommandes

| Dimension | Fenetre |
|---|---|
| Charge recente | 7 jours |
| Tendance charge | 28 jours |
| Socle | 42 jours |
| Sommeil court terme | 3 jours |
| Sommeil recent | 7 jours |
| HRV | 7 jours vs baseline 28 a 60 jours |
| FC repos | 7 jours vs baseline 28 a 60 jours |
| Stress | 3 et 7 jours |
| Body Battery | 3 et 7 jours, signal secondaire |

### 9.3 Sortie utilisateur cible

La synthese doit rester compacte.

Elements recommandes :

| Element | Exemple |
|---|---|
| Decision | "Seance structuree possible" |
| Pourquoi | "Charge stable, sommeil correct, HRV dans ta norme" |
| Point de vigilance | "Stress en hausse depuis 3 jours" |
| Confiance | "Forte : Garmin complet sur 7 jours" |
| Action | "Garde la seance prevue, surveille les sensations" |

### 9.4 Regles de prudence

| Signal | Effet attendu |
|---|---|
| HRV basse + FC repos haute | Allègement recommande |
| Sommeil faible plusieurs nuits | Eviter intensite forte |
| Stress eleve + charge haute | Endurance facile ou repos |
| Body Battery faible seul | Signal secondaire, pas decision seul |
| Donnees Garmin absentes | Recommandation basee charge uniquement |

## 10. Enrichissement des activites Strava

### 10.1 Principe

Garmin ne cree pas d'activites principales dans RunNSee sur cette phase.

Une activite Garmin peut enrichir une activite Strava existante si le matching est fiable.

### 10.2 Criteres de matching conceptuels

| Critere | Role |
|---|---|
| Date et heure de depart | Critere principal |
| Duree | Verification de coherence |
| Distance | Verification de coherence |
| Type sport | Course, trail, marche sportive si utile |
| GPS | Optionnel |
| Titre | Secondaire |

### 10.3 Donnees d'enrichissement

| Donnee Garmin | Usage |
|---|---|
| Splits/laps | Typologie seance |
| Zones FC activite | Dominante intensite |
| Cadence | Analyse technique |
| Puissance | Effort trail / vallonne |
| Training Effect | Signal secondaire |
| FIT/TCX | Recalcul avance eventuel |

### 10.4 Restrictions

- Ne pas remplacer automatiquement les donnees Strava.
- Ne pas creer de doublon visible.
- Ne pas enrichir une activite si le matching est incertain.
- Afficher la source lorsqu'une donnee vient de Garmin.

## 11. UX et wording

### 11.1 Nom du connecteur

Nom recommande :

> Garmin experimental

Sous-titre recommande :

> Connexion non officielle pour enrichir tes signaux de recuperation.

### 11.2 Consentement utilisateur

Message recommande :

> Cette connexion Garmin est experimentale et non officielle. Elle sert a enrichir tes signaux de recuperation. Ton mot de passe Garmin n'est jamais stocke. La connexion peut cesser de fonctionner si Garmin modifie ses acces.

### 11.3 Statuts visibles

| Statut | Message |
|---|---|
| Connecte | "Garmin connecte. Derniere synchronisation : ..." |
| Sync en cours | "Recuperation de ton historique Garmin en cours." |
| Partiel | "Certaines donnees Garmin sont absentes sur la periode." |
| Expire | "Connexion Garmin expiree. Reconnexion necessaire." |
| Erreur | "Garmin est temporairement indisponible ou limite les appels." |
| Non officiel | "Connecteur experimental non fourni par Garmin." |

## 12. Securite

### 12.1 Donnees sensibles

Les donnees suivantes doivent etre considerees sensibles :

- identifiants Garmin pendant l'authentification ;
- tokens/session ;
- sommeil ;
- HRV ;
- frequence cardiaque ;
- stress ;
- Body Battery ;
- payloads bruts Garmin ;
- donnees de sante ou bien-etre derivees.

### 12.2 Regles obligatoires

- Ne jamais stocker le mot de passe Garmin.
- Chiffrer les tokens/session.
- Ne jamais exposer les secrets dans les logs.
- Ne jamais logger de payload brut complet par defaut.
- Permettre la suppression des donnees Garmin.
- Isoler les donnees par utilisateur.
- Ne pas rendre une erreur Garmin bloquante pour RunNSee.

## 13. Conformite et RGPD

### 13.1 Points de vigilance

Cette integration repose sur une librairie non officielle et traite des donnees sensibles.

Il faut donc prevoir :

- consentement explicite ;
- information claire sur le caractere non officiel ;
- suppression des donnees Garmin ;
- deconnexion simple ;
- tracabilite minimale ;
- minimisation des donnees collectees ;
- conservation limitee ou configurable ;
- aucune revendication d'integration officielle Garmin.

### 13.2 Usage a proscrire

- Presenter l'integration comme officielle.
- Stocker le mot de passe Garmin.
- Collecter plus de donnees que necessaire.
- Partager des donnees Garmin entre utilisateurs.
- Faire dependre RunNSee entierement de Garmin.

## 14. Lots d'implementation proposes

### Lot 1 - Cadrage produit et wording

Objectif :

- Ajouter le vocabulaire produit "Garmin experimental".
- Preparer les textes de consentement.
- Definir les statuts utilisateur.

Livrables attendus :

- wording final ;
- etats de connexion ;
- textes d'aide ;
- conditions d'affichage.

Critere d'acceptation :

- L'utilisateur comprend que le connecteur est non officiel et experimental.

### Lot 2 - Modele provider et securite

Objectif :

- Preparer la structure provider multi-source.
- Prevoir stockage chiffre des sessions.
- Distinguer `garminconnect_unofficial` et future API officielle.

Livrables attendus :

- modele conceptuel traduit en schema ;
- strategie de chiffrement ;
- strategie de suppression ;
- separation source brute / normalisee.

Critere d'acceptation :

- Aucun dashboard ne depend d'un payload Garmin natif.

### Lot 3 - Connexion Garmin utilisateur

Objectif :

- Permettre a un utilisateur connecte d'etablir une connexion Garmin experimentale.
- Gerer MFA si necessaire.
- Ne jamais stocker le mot de passe.

Livrables attendus :

- flux de connexion ;
- etats de session ;
- deconnexion ;
- erreurs explicites.

Critere d'acceptation :

- Une connexion Garmin peut etre etablie sans stockage du mot de passe.

### Lot 4 - Backfill recuperation 180 jours

Objectif :

- Recuperer les donnees P0 sur 180 jours.

Livrables attendus :

- orchestration par lots ;
- reprise idempotente ;
- statut de progression ;
- gestion erreurs.

Critere d'acceptation :

- Un utilisateur peut lancer un backfill 180 jours sans bloquer l'application.

### Lot 5 - Sync quotidienne

Objectif :

- Maintenir les donnees Garmin a jour.

Livrables attendus :

- sync quotidienne ;
- relecture J-3 a J ;
- bouton sync manuelle ;
- gestion expiration.

Critere d'acceptation :

- Les donnees recentes se mettent a jour sans intervention quotidienne.

### Lot 6 - Normalisation recuperation

Objectif :

- Produire des snapshots quotidiens stables.

Livrables attendus :

- donnees normalisees sommeil, HRV, FC repos, stress, Body Battery ;
- qualite de donnee ;
- source provider.

Critere d'acceptation :

- Les analytics consomment des donnees normalisees, pas des payloads Garmin.

### Lot 7 - Synthese decisionnelle enrichie

Objectif :

- Integrer les signaux Garmin a la synthese decisionnelle.

Livrables attendus :

- decision ;
- facteurs explicatifs ;
- niveau de confiance ;
- point limitant principal ;
- fallback sans Garmin.

Critere d'acceptation :

- La synthese reste utile avec ou sans Garmin.

### Lot 8 - Enrichissement activites Strava

Objectif :

- Utiliser Garmin pour enrichir les activites Strava existantes.

Livrables attendus :

- matching prudent ;
- enrichissement splits / zones / cadence / puissance ;
- statut d'enrichissement ;
- absence de doublons.

Critere d'acceptation :

- Aucune activite Garmin ne cree un doublon visible.

### Lot 9 - Observabilite et durcissement

Objectif :

- Fiabiliser l'exploitation.

Livrables attendus :

- suivi erreurs ;
- progression sync ;
- rate limit ;
- logs sanitises ;
- suppression donnees Garmin.

Critere d'acceptation :

- Un incident Garmin est visible, non bloquant et recuperable.

### Lot 10 - Preparation API officielle Garmin

Objectif :

- Assurer que la future API officielle pourra remplacer le provider non officiel.

Livrables attendus :

- provider officiel reserve ;
- mapping donnees normalisees ;
- strategie migration source ;
- comparaison `garminconnect_unofficial` / `garmin_official`.

Critere d'acceptation :

- La migration future n'impose pas de reecrire les dashboards.

## 15. Verification et recette

### 15.1 Connexion

- Connexion Garmin reussie.
- Connexion avec MFA.
- Echec login.
- Session expiree.
- Deconnexion.
- Suppression tokens.

### 15.2 Synchronisation

- Backfill 180 jours complet.
- Backfill interrompu puis repris.
- Donnees absentes sur certains jours.
- Rate limit Garmin.
- Sync quotidienne.
- Sync manuelle.

### 15.3 Donnees

- Sommeil recupere et normalise.
- HRV recuperee si disponible.
- FC repos coherente.
- Stress coherently renseigne.
- Body Battery source comme signal proprietaire.
- Aucune valeur absente convertie en zero.

### 15.4 Analytics

- Synthese decisionnelle avec Garmin complet.
- Synthese avec Garmin partiel.
- Synthese sans Garmin.
- Confiance adaptee a la qualite de donnees.
- Aucune regression sur charge, forme, activites et analyses existantes.

### 15.5 Activites

- Matching Garmin/Strava fiable.
- Refus d'enrichissement en cas d'ambiguite.
- Pas de doublon visible.
- Source Garmin visible pour les donnees enrichies.

### 15.6 Securite

- Aucun secret dans les logs.
- Aucun mot de passe stocke.
- Tokens chiffres.
- Donnees Garmin supprimables.
- Isolation par utilisateur.

## 16. Points ouverts avant developpement

Points a valider ou surveiller lors de l'audit technique :

1. Capacite reelle de `garminconnect` a exposer HRV sur les comptes cibles.
2. Comportement MFA exact selon compte Garmin.
3. Limites d'appel Garmin observees en backfill 180 jours.
4. Format exact des donnees Body Battery et Training Readiness.
5. Strategie de conservation des payloads bruts Garmin.
6. Niveau de chiffrement deja disponible dans RunNSee et reutilisable.
7. Emplacement produit final : Reglages, page Aujourd'hui, Analyses.
8. Politique de suppression des donnees Garmin utilisateur.

## 17. Recommandation finale

L'integration `garminconnect` peut etre lancee dans RunNSee si elle est traitee comme un connecteur experimental non officiel, disponible a tous les comptes mais fortement encadre.

La valeur prioritaire est claire :

- sommeil ;
- HRV ;
- frequence cardiaque de repos ;
- stress ;
- Body Battery ;
- enrichissement prudent des activites Strava.

Les conditions minimales avant implementation sont :

- consentement explicite ;
- aucun stockage du mot de passe Garmin ;
- tokens chiffres ;
- provider abstrait ;
- donnees normalisees ;
- dashboards decouples des payloads Garmin ;
- suppression utilisateur ;
- fallback complet sans Garmin ;
- preparation d'un futur provider officiel.

Cette specification doit servir de contrat de travail pour les futurs lots d'implementation.
