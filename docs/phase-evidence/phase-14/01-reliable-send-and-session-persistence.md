# Phase 14 — Reliable send loop & session persistence

Hardening pass before the AI reply assistant: make outbound replies actually deliver, and keep
connected numbers connected across restarts. Disposable-POC gate and "synthetic data only"
retained.

## Problem

1. **Outbound never sent.** The delivery runner selects accounts to drain with
   `state.running && state.status === ACTIVE`, then `if (!accountId || !organizationId) continue;`.
   But `serializeState()` in the session manager omitted `organizationId`, so `state.organizationId`
   was always `undefined` and the runner skipped every account — queued replies stayed `queued`
   forever even when the number was Active and the POC/delivery flags were on.
   Observed live: a reply showed **"Queued"** in the thread and never sent.

2. **Sessions dropped on every restart**, forcing a fresh QR scan each time.

## Fix

- **Runtime state now carries identity** — `serializeState()` includes `organizationId` (and keeps
  `accountId`). `getSessionState()` and `listRuntimeStates()` expose it, so the delivery runner can
  locate active accounts and call `drainQueue({ organizationId, whatsappAccountId })`. This is the
  whole fix for outbound; `delivery-runner.js` already read those fields.

- **Startup auto-reconnect** — `reconnectPersistedSessions()` on the session manager fetches accounts
  in `ACTIVE` / `RECONNECTING` / `CONNECTING` status (new repo helper `findAccountsByStatuses`) and
  calls the existing `connectAccount({ account })` for each, gated by `WHATSAPP_ENABLED`, per-account
  try/catch (never throws). Baileys reuses each account's saved **encrypted** auth-state, so a still
  valid link reconnects with no QR; a revoked one lands on `disconnected`. Wired into
  `startServer` (best-effort, non-fatal, injectable as `reconnectSessionsFn` for tests).

## Files
- `backend/src/modules/whatsapp/sessions/session-manager.service.js` — `organizationId` in state;
  `reconnectPersistedSessions()`.
- `backend/src/modules/whatsapp-accounts/whatsapp-account.repository.js` — `findAccountsByStatuses`.
- `backend/src/modules/whatsapp/delivery/delivery-runner.js` — injectable `createDeliveryService`.
- `backend/src/server-lifecycle.js` — startup reconnect (injectable, non-fatal).
- Tests: `session-manager.service.test.js` (org id exposure, reconnect, disabled-skip),
  `delivery-runner.test.js` (drains with org id; skips when org id missing), lifecycle test stub.

## Verification
- `npm run lint` clean; `npm test` — **242 passed (57 files)**.
- Startup reconnect confirmed running against real data: on boot it attempted every previously
  connected account. Numbers logged out phone-side earlier resolve to `disconnected` (a revoked
  session cannot be revived — expected). A number that is freshly connected and stays Active drains
  its queue and sends within one poll (~5s).

## Non-goals
- No AI (next phase), no delivered/read receipt ticks, no media.
- Phone-side-logged-out numbers still need a manual re-scan.
