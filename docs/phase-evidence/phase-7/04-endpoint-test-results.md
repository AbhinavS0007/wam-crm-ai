# Phase 7 Evidence — 04 Endpoint Test Results

## Test files

- `backend/tests/conversation-api.test.js`
- `backend/tests/outbound-message-api.test.js`
- `backend/tests/contact-reveal-api.test.js`
- Shared fixtures: `backend/tests/fixtures/phase7-fixtures.js`

## Verified behaviours

Conversations:

- Admin (`read_all`) sees all conversations; staff (`read_assigned`) sees only assigned.
- List and detail responses contain no phone; detail embeds a contact summary.
- Scoped staff is blocked (403) from an unassigned conversation and its thread.
- Message thread returns the seeded inbound message.
- `conversations.assign` is required to reassign; staff (no assign) → 403; after an admin
  reassigns to the staff user, the staff user then sees that conversation.

Outbound send:

- First send returns `202` with `status: queued`, `direction: out`, `sentByUserId` set,
  `meta.queued: true`, and no phone in the response.
- Replay with the same `idempotencyKey` returns `200`, the same message id, and no
  duplicate row (`countDocuments` = 1).
- A user with `messages.send` denied → 403.
- Empty body / short idempotency key → 400.

Contact reveal:

- Default contact response omits the phone and does not contain the seeded value.
- Staff (no `client_pii.reveal`) → 403.
- Authorized admin → 200 with the decrypted phone and `leadId`, plus exactly one new
  `CLIENT_PII_REVEALED` audit record whose metadata does not contain the phone.

## Result

`npx vitest run tests/conversation-api.test.js tests/outbound-message-api.test.js tests/contact-reveal-api.test.js`
→ 3 files / 12 tests passed.
