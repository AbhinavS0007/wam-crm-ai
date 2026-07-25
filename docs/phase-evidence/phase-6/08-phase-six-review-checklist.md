# Phase 6 Evidence — 08 Review Checklist

- [x] Inbound WhatsApp messages persist as Contact → Conversation → Message.
- [x] Returning senders reuse one contact and one conversation (blind-index dedup).
- [x] Duplicate provider messages are idempotent (no double unread, no preview bump).
- [x] Phone and provider JIDs stored only as AES-encrypted fields.
- [x] Lookup identity stored only as a non-reversible keyed HMAC (`providerContactKey`).
- [x] Partial-unique contact index added and verified.
- [x] Ingestion result summaries and safe logs contain no PII.
- [x] Ingestion failures do not crash the live WhatsApp session.
- [x] Persistence gated behind `WHATSAPP_PERSIST_INBOUND_ENABLED` and existing POC guards.
- [x] `CONTACT_LOOKUP_HMAC_KEY` documented as stable/non-rotatable in `.env.example`.
- [x] Backend lint, tests, index verification, and format check pass locally.
- [ ] GitHub Actions CI green (recorded in 07-ci-result.md).
