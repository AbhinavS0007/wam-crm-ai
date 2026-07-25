# Phase 6 Evidence — 02 Inbound Ingestion Design

## Purpose

Turn a normalized inbound WhatsApp event (from the Phase 5 Baileys provider) into
durable CRM records, safely and idempotently.

## Flow

```
Baileys messages.upsert
  → normalizeBaileysInboundMessage (provider)
  → single-session.service onInboundMessage wrapper
  → inboundMessageService.ingestInboundMessage
       1. compute blind-index provider key from sender JID
       2. findOrCreateContactByProviderKey (encrypts phone + provider JIDs)
       3. upsertConversationForContact
       4. createInboundMessage
       5. updateConversationPreview (unread + preview) — only for new messages
  → caller onInboundMessage(inboundMessage, ingestionResult) for safe logging
```

## Key components

- `backend/src/modules/whatsapp/ingestion/inbound-message.service.js`
  - `createInboundMessageIngestionService(...)` → `ingestInboundMessage({ organizationId, whatsappAccountId, inboundMessage })`.
  - All collaborators are injectable for testing; real repositories are used by default.
- `backend/src/modules/whatsapp/sessions/single-session.service.js`
  - New optional `inboundMessageService`. The provider `onInboundMessage` is wrapped so
    ingestion runs first, then the caller's callback receives the result. Ingestion
    failures are caught and logged safely; they never crash the live session.

## Reused Phase 3 building blocks

- `messages/message.repository.js` — `createInboundMessage` (unique `providerMessageId`).
- `conversations/conversation.repository.js` — `upsertConversationForContact`, `updateConversationPreview`.
- `contacts/contact.repository.js` — `createContact` + `createUniqueLeadId`.
- `privacy/protected-pii.service.js` — encrypted phone / provider JID storage.

## Idempotency

- Message dedup is enforced by the existing partial-unique index
  `{ organizationId, whatsappAccountId, providerMessageId }`.
- On a duplicate provider message, ingestion returns `{ persisted:false, duplicate:true }`
  and skips the unread increment and preview bump, so retries never inflate counters.

## Return summary (PII-free)

`{ persisted, duplicate, contactId, conversationId, leadId, messageId }` — no phone, no JID.
