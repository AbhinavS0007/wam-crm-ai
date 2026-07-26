# Phase 13 Evidence — 02 Account Management Design

## Session manager — `modules/whatsapp/sessions/session-manager.service.js`

A registry of live WhatsApp sessions keyed by `accountId`, running in the API process
(generalizes the Phase-5 single-session runtime to N accounts). `connectAccount` is gated by
`WHATSAPP_ENABLED`, opens a Baileys session with the account's encrypted auth-state, and wires:

- `onConnectionUpdate` → captures the raw QR (memory only), maps to an account status via
  `session-status.mapper`, writes the status (`updateAccountStatus`), and publishes
  `account.changed`.
- `onInboundMessage` → the existing ingestion service (inbound persists into the CRM).
  Also `getQrDataUrl` (renders the in-memory QR to a data URL), `getSessionState`,
  `listRuntimeStates`, `sendTextMessage({ accountId, ... })`, `disconnectAccount`, `stopAll`.
  A lazily-created singleton (`session-manager.instance.js`, swappable in tests) is shared by the
  account API, the delivery runner, and server shutdown.

## Account API — `modules/whatsapp-accounts/*`

Mounted at `/api/v1/whatsapp-accounts`, gated by `accounts.read` / `accounts.manage`:

- `GET /` list (merges live runtime state), `GET /:id`, `POST /` create (dup brandKey → 409).
- `POST /:id/connect` → `202` + session start; `GET /:id/qr` → `{ qrDataUrl }`.
- `POST /:id/pause` (stop session + `paused`), `/resume` (→ `disconnected`, ready to connect),
  `/disconnect` (stop session), `DELETE /:id` (disconnect + soft remove).
  Serialized with `serializeWhatsAppAccount` — **no phone/JID by default**.

## Delivery in the API — `modules/whatsapp/delivery/delivery-runner.js`

An interval runner drains queued outbound messages for each **active** account by reusing
`createOutboundDeliveryService` (already per-`whatsappAccountId`) with a `sessionService` bound
to `sessionManager.sendTextMessage`. Started in `server-lifecycle` only when `WHATSAPP_ENABLED`

- `WHATSAPP_SEND_TEXT_POC_ENABLED` + `WHATSAPP_OUTBOUND_DELIVERY_ENABLED` are set (default off ⇒
  tests and the plain API server never open sockets or send).

## Realtime

Added the `account.changed` event + `publishAccountChanged`; the hub delivers account events
**org-wide** (they carry no conversation/assignment). The Accounts screen refetches on it.

## Frontend — `pages/AccountsPage.jsx` + `components/accounts/*`

List with live status badges; add-number form (auto-derives the brand key); per-row
Connect / Pause / Resume / Disconnect / Remove (mutations gated by `accounts.manage`).
`ConnectQrModal` shows the QR image and polls status + QR every 2s until `active`. `AppShell`
gains an **Inbox / Accounts** nav toggle (Accounts visible with `accounts.read`).

## Safety

Disposable-POC gate retained; the QR modal reminds the operator to scan only a disposable
number. QR strings live in memory only and are never persisted or logged.
