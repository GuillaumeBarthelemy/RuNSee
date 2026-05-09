# RunNSee - Checklist baseline / tag

## 1. Preconditions

- [ ] Repo clean
- [ ] Branche correcte
- [ ] Aucun secret
- [ ] Archive source propre
- [ ] `.ai/*.md` alignes

## 2. Tests

- [ ] Backend tests OK
- [ ] Frontend tests OK
- [ ] Build OK
- [ ] Prisma validate OK
- [ ] PostgreSQL validate OK
- [ ] db compare OK

## 3. Recette metier

- [ ] Activites OK
- [ ] Aujourd'hui OK
- [ ] Analytics OK
- [ ] Performance OK
- [ ] Objectifs OK si concernes
- [ ] Sync providers OK si concernes
- [ ] Backfill OK si concerne

## 4. Non-regression specifique

- [ ] Pas de doublons provider
- [ ] Pas de double comptage
- [ ] Pas de lien undefined
- [ ] Pas de merged visible
- [ ] Garmin-only reel conserve

## 5. Archive de review

- [ ] Archive generee depuis Git
- [ ] Archive basee sur HEAD ou tag
- [ ] Archive controlee
- [ ] Aucun artefact interdit
- [ ] Archive referencee dans `RUNSEE_TEST_LOG.md`

## 6. Decision

- [ ] GO tag
- [ ] NO-GO

## 7. Tag

```bash
git tag <tag-name>
git push origin <tag-name>
```
