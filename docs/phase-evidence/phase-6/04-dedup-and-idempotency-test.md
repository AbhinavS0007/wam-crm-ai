# Phase 6 Evidence — 04 Dedup and Idempotency Tests

## Test files

- `backend/tests/blind-index.service.test.js` — blind-index primitive.
- `backend/tests/contact-provider-key.repository.test.js` — contact dedup by provider key.
- `backend/tests/inbound-message.service.test.js` — end-to-end ingestion.
- `backend/tests/single-session.service.test.js` — inbound wiring into the session.
- `backend/tests/baileys.provider.test.js` — `pushName` added to normalized event.

## Verified behaviours

Blind index:

- Deterministic for the same value/purpose/key; 64-hex output.
- Different values, purposes, or keys produce different digests.
- Digest never contains the plaintext value.
- Missing/short key and missing purpose are rejected.

Contact dedup:

- First sight creates a contact (`source: 'whatsapp'`, generated `leadId`).
- Same provider key reuses the existing contact (no duplicate).
- Phone and provider JIDs round-trip through encryption; stored document contains no
  plaintext phone.
- Partial-unique index enforces one contact per provider key per organization.

Ingestion:

- First inbound creates exactly one Contact, one Conversation, one Message; unread = 1;
  `lastMessagePreview` set; `providerTimestamp` stored as a Date.
- A returning sender reuses the same contact and conversation; second message brings the
  conversation to 2 messages and unread = 2.
- A duplicate `providerMessageId` is idempotent: message count and unread stay at 1,
  result is `{ persisted:false, duplicate:true }`.
- Non-`message.received` events are ignored and persist nothing.
- The result summary contains no phone digits and no raw JID.

Session wiring:

- Inbound events run through the injected ingestion service with the running session's
  organization/account ids, and the caller callback receives the ingestion result.
- If ingestion throws, the session stays alive and the caller callback is still invoked
  with a null result.

## Result

`npx vitest run tests/blind-index.service.test.js tests/contact-provider-key.repository.test.js tests/inbound-message.service.test.js tests/single-session.service.test.js tests/baileys.provider.test.js`
→ all passed.
