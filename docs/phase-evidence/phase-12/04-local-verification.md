# Phase 12 Evidence — 04 Local Verification

## Automated checks

```
cd backend && npm run lint && npm test        # lint clean; 54 files / 221 tests
cd frontend && npm run lint && npm test && npm run build   # lint clean; 10 files / 26 tests; build OK
npm run format:check                          # repo root — all files Prettier-clean
node backend/src/scripts/verify-indexes.js    # unchanged (no new indexes)
```

All pass.

## Manual end-to-end (two terminals)

The API server must be **restarted** to load the realtime route + subscriber, and the browser
hard-refreshed to load the new bundle.

1. Terminal A: `cd backend && npm run dev` (starts the SSE subscriber).
2. Terminal B (for live inbound): the session script with
   `WHATSAPP_PERSIST_INBOUND_ENABLED=true` and `WHATSAPP_OUTBOUND_DELIVERY_ENABLED=true`.
3. `cd frontend && npm run dev`, sign in.
4. Open a lead and **send a message** → the outbound bubble appears immediately (no 15s wait),
   and its status advances as the delivery worker runs.
5. Change the **stage** in the lead panel → the inbox chip updates instantly.
6. From the POC WhatsApp number, send an inbound message → it appears in the inbox/thread live
   (bridged from the session process via Redis pub/sub).

Network tab shows a single long-lived `GET /api/v1/realtime/stream` (`text/event-stream`)
carrying `event: conversation.changed` frames; only counts/ids travel on it, never message
bodies.
