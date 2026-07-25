# Phase 8 Evidence — 05 Local Verification

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

Result: 48 files / 194 tests passed (includes the new `outbound-delivery.service` and
`outbound-delivery.repository` suites).

## Index verification

```
cd backend && node src/scripts/verify-indexes.js
```

Result: passed. No new indexes were required for Phase 8 (the delivery claim reuses the
existing `{ organizationId, status, createdAt }` message index).

## Format check

```
npm run format:check
```

Result: all matched files use Prettier code style.

## Manual end-to-end (disposable POC only)

Gated by `WHATSAPP_SEND_TEXT_POC_ENABLED=true` and `WHATSAPP_OUTBOUND_DELIVERY_ENABLED=true`:

```
cd backend && node src/scripts/phase5-real-provider-manual.js
```

1. Scan the QR with the disposable POC number only.
2. Enqueue an outbound message through the Phase 7 API
   (`POST /api/v1/conversations/:id/messages`).
3. The delivery loop drains it: `/outbound-safe` shows `delivery.delivered` incrementing,
   and the Message flips `queued → sending → sent` with a provider message id.
4. Only counts and error codes are printed; no QR, phone, JID, body, or auth payload.
