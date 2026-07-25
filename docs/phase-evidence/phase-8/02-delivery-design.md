# Phase 8 Evidence — 02 Delivery Design

## Boundary

- Scope: deliver + retry only. Lifecycle `queued → sending → sent`, or `failed` →
  `failed_permanent`.
- Retry/attempt state lives on the Message model (no separate queue collection).
- Delivered/read receipts and realtime push to a UI are explicit non-goals (later phases).

## Components

### Message model (`modules/messages/message.model.js`)

Added delivery-tracking fields: `deliveryAttempts` (Number, default 0),
`lastDeliveryError` (String, safe text only), `nextAttemptAt` (Date). No new indexes — the
existing `{ organizationId, status, createdAt }` index serves the claim query, and the
partial-unique `providerMessageId` index stores the provider id on success.

### Message repository (`modules/messages/message.repository.js`)

- `claimNextOutboundMessage` — atomic `findOneAndUpdate` that selects the oldest deliverable
  outbound row (`queued`, or `failed` with `nextAttemptAt <= now` and
  `deliveryAttempts < maxAttempts`), flips it to `sending`, and increments
  `deliveryAttempts`. Atomicity guarantees overlapping ticks never claim the same row.
- `markOutboundMessageSent` — `sent` + `providerMessageId` + `sentAt`.
- `markOutboundMessageFailed` — `failed` (with backoff `nextAttemptAt`) or
  `failed_permanent`, storing a sanitized error string.

### Delivery service (`modules/whatsapp/delivery/outbound-delivery.service.js`)

`deliverNext` claims one message, resolves the recipient from the contact's encrypted
identifiers (`findContactPrivatePiiForInternalUse`, preferring the provider JID then the
phone), sends via the running session's `sendTextMessage`, and records the outcome.
`drainQueue` repeats up to the per-minute cap. Sending is gated by
`WHATSAPP_SEND_TEXT_POC_ENABLED`.

### Runner (`scripts/phase5-real-provider-manual.js`)

When `WHATSAPP_OUTBOUND_DELIVERY_ENABLED` is true, a `setInterval` loop reads the running
account from `inspectSingleSession()` and calls `drainQueue`. Safe counters are exposed on
`/status` and `/outbound-safe`; the interval is cleared on shutdown.

## Reuse

`sendTextMessage` (single-session service), `findContactPrivatePiiForInternalUse`, the
injectable-service pattern from the Phase 6 ingestion service, and the existing message
status constants.
