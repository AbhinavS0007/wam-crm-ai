# Phase 7 Evidence — 05 Local Verification

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

Result: 46 files / 181 tests passed (includes the new `conversation-api`,
`outbound-message-api`, and `contact-reveal-api` suites).

## Index verification

```
cd backend && node src/scripts/verify-indexes.js
```

Result: passed. No new indexes were required for Phase 7 (reuses existing conversation,
message idempotency, and audit indexes).

## Format check

```
npm run format:check
```

Result: all matched files use Prettier code style.

## Manual smoke (optional)

With the API running (`cd backend && npm run dev`) and a seeded user:

1. `POST /api/v1/auth/login` → obtain `accessToken`.
2. `GET /api/v1/conversations` (Bearer token) → scoped conversation list.
3. `GET /api/v1/conversations/:id/messages` → thread.
4. `POST /api/v1/conversations/:id/messages` with `{ body, idempotencyKey }` → 202 queued.
5. `POST /api/v1/contacts/:id/reveal-phone` with an authorized user → phone + audit record.
