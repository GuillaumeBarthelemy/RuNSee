# RuNSee

Plateforme personnelle d'analyse d'entraînement running, alimentée par les données Strava et Garmin Connect.

## Statut

Projet **personnel propriétaire**. Ce repository est rendu publiquement consultable pour transparence et démonstration, mais **aucune licence d'utilisation n'est accordée**.

→ Voir [LICENSE](./LICENSE) pour les conditions complètes.

## Stack

- Frontend : React 19 + Vite + Recharts
- Backend : Node.js + Express + Prisma (PostgreSQL)
- Intégrations : Strava OAuth, Garmin Connect (bridge Python), OpenAI Responses API
- Déploiement : VM Ubuntu + Docker Compose, exposée via Cloudflare Tunnel
- CI/CD : GitHub Actions (self-hosted runner sur la VM de production)

## Modules principaux

- **Analyse** : compréhension de l'état d'entraînement (charge, fatigue, intensité, récupération)
- **Performance** : mesure du niveau et des capacités (VDOT, allures de référence, FC de performance, records)
- **Progression** : construction long terme (vue d'ensemble, volume, régularité, comparaisons)

## Démos

Application en production : <https://runsee.runnsee.net> (accès restreint).

## Contributions

Ce projet n'accepte pas de contributions externes pour le moment. Les issues sont les bienvenues pour signaler des bugs ou suggérer des améliorations, mais les pull requests ne seront pas mergées sans accord préalable.

## Contact

Pour toute question concernant le code ou une éventuelle collaboration, ouvrir une issue ou contacter le propriétaire du repository via GitHub.

---

© 2026 Guillaume Barthélemy. All rights reserved.
