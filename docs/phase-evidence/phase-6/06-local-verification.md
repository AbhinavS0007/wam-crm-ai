# Phase 6 Evidence — 06 Local Verification

All commands run from the repository with Docker MongoDB and Redis healthy.

## Backend lint

```
cd backend && npm run lint
```

Result: passed.

## Backend tests

```
cd backend && npm test
```

Result: 43 files / 169 tests passed (includes the new Phase 6 suites:
`blind-index.service`, `contact-provider-key.repository`, `inbound-message.service`, plus
the updated `single-session.service` and `baileys.provider` tests).

## Index verification

```
cd backend && node src/scripts/verify-indexes.js
```

Result: passed. Verified models include Contact with the new partial-unique
`{ organizationId, providerContactKey }` index.

## Format check

```
npm run format:check
```

Result: all matched files use Prettier code style.

## Manual end-to-end (disposable POC only)

Optional, gated by `WHATSAPP_PERSIST_INBOUND_ENABLED=true`:

```
cd backend && node src/scripts/phase5-real-provider-manual.js
```

- Scan the QR with the disposable POC number only.
- Send a message from the POC phone twice.
- `GET /conversations-safe` and `GET /status` show `persistence.persisted` incrementing
  for new messages and `persistence.duplicate` for repeats.
- The stored data shows one Contact, one Conversation, and two Messages, with unread
  incremented once per new message.
- Only masked/safe values are printed; no QR, phone, JID, or auth payload is logged.
