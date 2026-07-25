# Phase 9 Evidence — 04 Local Verification

All commands run with Docker MongoDB and Redis healthy.

## Backend lint

```
cd backend && npm run lint
```

Result: passed.

## Backend tests

```
cd backend && npm test
```

Result: 52 files / 210 tests passed (includes the new `note-api`, `followup-api`,
`tag-api`, and `conversation-crm-api` suites).

## Index verification

```
cd backend && node src/scripts/verify-indexes.js
```

Result: passed. No new indexes were required for Phase 9 (reuses existing note, follow-up,
tag, activity, and conversation indexes).

## Format check

```
npm run format:check
```

Result: all matched files use Prettier code style.

## Manual smoke (optional)

With the API running (`cd backend && npm run dev`) and a seeded user:

1. `POST /api/v1/auth/login` → obtain `accessToken`.
2. `POST /api/v1/conversations/:id/notes` → add a note (role-visibility enforced).
3. `POST /api/v1/conversations/:id/follow-ups` → create a task; `GET /api/v1/follow-ups` lists it.
4. `POST /api/v1/tags` then `POST /api/v1/conversations/:id/tags` → define and attach a tag.
5. `PATCH /api/v1/conversations/:id/stage` → move the lead's stage.
6. `GET /api/v1/conversations/:id/activity` → the timeline shows the recorded events.
