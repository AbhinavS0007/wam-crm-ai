# Phase 7 Evidence — 03 Privacy Enforcement

Per scope §"Hide client phone number from ordinary staff — backend must not send the
number", privacy is enforced in the backend, never by frontend masking.

## Guarantees

1. **Default responses carry no phone.** `serializeContact`, `serializeConversation`, and
   `serializeMessage` do not include any phone/JID field. Every read endpoint
   (list, detail, thread) uses these serializers, so a phone can never appear by default.
   Verified: `conversation-api.test.js` and `contact-reveal-api.test.js` assert responses
   contain no `"phone"` field and not the seeded phone value.

2. **Phone leaves the backend only via an authorized, audited endpoint.**
   `POST /contacts/:id/reveal-phone` requires `client_pii.reveal`. It decrypts via
   `findContactPrivatePiiForInternalUse` and writes a `CLIENT_PII_REVEALED` audit record
   containing `{ contactId, leadId, field }` — never the phone. Verified: staff (no
   permission) → 403; admin → 200 with phone and exactly one audit record whose metadata
   does not contain the phone.

3. **Read scoping.** Staff limited to `conversations.read_assigned` cannot list, view, or
   read the thread of a conversation not assigned to them (403). Verified in
   `conversation-api.test.js`.

## Sensitive-data note

- No phone, JID, QR, auth payload, or key is recorded in this evidence.
- The reveal audit metadata is limited to non-PII identifiers (`contactId`, `leadId`).
