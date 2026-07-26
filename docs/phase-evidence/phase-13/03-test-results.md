# Phase 13 Evidence — 03 Test Results

## Backend

### `tests/session-manager.service.test.js` (fake provider)

- Refuses to connect when `WHATSAPP_ENABLED=false`.
- Connect registers a session and writes `connecting`.
- A QR connection-update stores the QR and exposes a PNG data URL; a connecting signal is published.
- `connection: open` advances to `active` and clears the QR.
- Inbound messages route to the ingestion service with the right org/account.
- Outbound text sends through the running session.
- Disconnect destroys the session, drops it, and writes `disconnected`.
- Connecting an already-running account is idempotent (one session).

### `tests/whatsapp-account-api.test.js` (supertest, fake session manager)

- Admin lists/creates accounts; duplicate brand key → 409; no phone/JID in responses.
- Full connect (202) / qr (data URL) / pause / resume / disconnect / remove lifecycle.
- `accounts.read` / `accounts.manage` gating (staff → 403); create body validation → 400.

## Frontend

### `src/tests/accounts-page.test.jsx`

- Lists accounts with status; creates a new account (brand key auto-derived).
- Connect calls the API and opens the QR modal (QR image renders).
- Management controls are hidden without `accounts.manage`.

## Result

```
cd backend && npm run lint && npm test        # 56 files / 233 tests
cd frontend && npm run lint && npm test && npm run build   # 11 files / 30 tests, build OK
```

All green. The Phase-8 delivery unit tests already inject the collaborators they need; the
account API test injects a fake session manager so no real WhatsApp sockets are opened.
