# Phase 13 Evidence — 04 Local Verification

## Automated checks

```
cd backend && npm run lint && npm test        # lint clean; 56 files / 233 tests
cd frontend && npm run lint && npm test && npm run build   # lint clean; 11 files / 30 tests; build OK
npm run format:check                          # repo root — Prettier clean
node backend/src/scripts/verify-indexes.js    # unchanged (no new indexes)
```

All pass.

## Manual end-to-end (disposable number only)

Restart the backend with the POC flags:

```
WHATSAPP_ENABLED=true \
WHATSAPP_SEND_TEXT_POC_ENABLED=true \
WHATSAPP_OUTBOUND_DELIVERY_ENABLED=true \
npm run dev
```

In the UI (signed in as an admin/super-admin):

1. Top nav → **Accounts**.
2. **Add a number** (name + brand key) → it appears with status `pending`.
3. **Connect** → the QR modal opens; scan it with the **disposable** WhatsApp number.
4. Status flips `connecting → active` (live, via the `account.changed` realtime event).
5. Message the connected number from another phone → it lands in the **Inbox** live.
6. Reply from the CRM → the delivery runner sends it through this account's session.
7. **Pause / Resume / Disconnect / Remove** behave as labelled; status updates in realtime.

QR strings are shown in the modal only, held in memory, and never persisted or logged.
Connect only a disposable number — never a personal or client number (Baileys ban risk).
