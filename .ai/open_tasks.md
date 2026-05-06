# Open Tasks

## Termines dans la passe de fiabilisation frontend/backend/science/UX

- [x] Monter la route backend assistant existante sur `/assistant`.
- [x] Enrichir `/health` avec un probe Prisma et un timestamp sans exposer de secrets.
- [x] Standardiser les erreurs backend avec un objet `error` tout en gardant le format legacy.
- [x] Renforcer la confiance de l'Aptitude RunNSee selon le poids de sources et la couverture recente.
- [x] Harmoniser le libelle canonique `Aptitude RunNSee` et garder l'ancien libelle en alias glossaire.
- [x] Ajouter un controle de drift Prisma SQLite/PostgreSQL.

## Termines dans la derniere passe

- [x] Securiser les ignore files et retirer de l'index les artefacts locaux/secrets/logs.
- [x] Appliquer les migrations SQLite locales et regenerer Prisma.
- [x] Completer `backend/scripts/db/tableDefinitions.js` pour toutes les tables actuelles.
- [x] Durcir `import-postgresql-dump.js` : dry-run, garde-fou truncate/append, comparaison de comptage.
- [x] Etendre `report-database-snapshot.js` aux tables Garmin/settings et indicateurs d'integrite.
- [x] Ajouter le service backend Garmin activites ciblees.
- [x] Ajouter `POST /providers/garmin/activities/enrich`.
- [x] Exposer l'enrichissement Garmin dans le detail activite.
- [x] Ajouter l'action frontend de completion Garmin sur la fiche activite.
- [x] Ajouter tests edge cases Garmin `activityEnrichment`.

## A faire / validation manuelle

- [ ] Tester l'enrichissement Garmin sur une activite reelle apres connexion Garmin.
- [ ] Verifier que `ActivityProviderEnrichment.status` vaut `matched_exact` ou `matched_tolerated` quand le matching est fiable.
- [ ] Verifier qu'un cas ambigu ne cree pas d'association automatique.
- [ ] Verifier que les metriques affichees dans l'onglet Garmin correspondent au payload Garmin reel.
- [ ] Appliquer/valider l'import PostgreSQL sur une base cible de preprod ou prod uniquement avec backup et option explicite (`--truncate` ou `--allow-append`).
- [ ] Pousser le commit et surveiller la CI/CD GitHub Actions vers la VM.

## Dette hors scope

- [ ] Backend sans configuration ESLint compatible ESLint 10 : les controles actuels reposent sur `node --check` et Prisma.
- [ ] Tests automatises backend providers a creer plus tard si une strategie test backend est ajoutee.
