# Phase 8 Evidence — 07 Review Checklist

- [x] Message model gains `deliveryAttempts`, `lastDeliveryError`, `nextAttemptAt`.
- [x] `claimNextOutboundMessage` claims deliverable rows atomically (no double-send).
- [x] Successful send → `sent` with the provider message id.
- [x] Failure below the cap → `failed` with an exponential backoff `nextAttemptAt`.
- [x] Failure at the cap (or no recipient) → `failed_permanent`; never re-claimed.
- [x] Sending gated by `WHATSAPP_SEND_TEXT_POC_ENABLED`; loop gated by `WHATSAPP_OUTBOUND_DELIVERY_ENABLED`.
- [x] Throughput bounded by `WHATSAPP_MAX_OUTBOUND_PER_MINUTE`.
- [x] Stored delivery error contains no phone/JID (asserted in tests).
- [x] Runner reads the running account from `inspectSingleSession()`; interval cleared on shutdown.
- [x] Safe counters on `/status` and `/outbound-safe`; no PII logged.
- [x] Backend lint, tests, index verification, and format check pass locally.
- [ ] GitHub Actions CI green (recorded in 06-ci-result.md).

## Known boundaries

- No delivered/read receipt tracking (follow-on).
- No realtime push to a UI (needs frontend + websockets — later phase).
- Text only; no media sends.
