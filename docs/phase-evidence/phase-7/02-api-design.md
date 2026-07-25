# Phase 7 Evidence — 02 CRM Serving API Design

## Endpoints (all under `/api/v1`, all require authentication)

| Method | Path                            | Permission                              | Purpose                          |
| ------ | ------------------------------- | --------------------------------------- | -------------------------------- |
| GET    | `/conversations`                | conversations.read_assigned OR read_all | List conversations (scoped)      |
| GET    | `/conversations/:id`            | conversations.read (scoped)             | Conversation + contact summary   |
| GET    | `/conversations/:id/messages`   | conversations.read (scoped)             | Message thread (cursor)          |
| PATCH  | `/conversations/:id/assignment` | conversations.assign                    | Assign / reassign                |
| POST   | `/conversations/:id/messages`   | messages.send (scoped)                  | Enqueue outbound message         |
| GET    | `/contacts/:id`                 | conversations.read                      | Contact summary (no phone)       |
| POST   | `/contacts/:id/reveal-phone`    | client_pii.reveal                       | Decrypt + return phone (audited) |

## Pattern

Mirrors `modules/users`: `routes → controller (zod + asyncHandler) → service → repository`.
Responses use `{ data, meta }`; errors go through `createHttpError` and are mapped from
domain error codes (`CONVERSATION_NOT_FOUND`, `CONVERSATION_ACCESS_DENIED`,
`CONTACT_NOT_FOUND`).

## Read scoping

`conversation.service.js` derives visibility from `req.auth.permissions`:

- `conversations.read_all` → all organization conversations.
- only `conversations.read_assigned` → constrained to `assignedTo === self`, enforced both
  in the list query and re-checked on single-conversation and thread reads (403 otherwise).

## Outbound enqueue (idempotent send workflow)

`messages/outbound-message.service.js` persists an outbound Message with
`status: queued`, `direction: out`, `sentByUserId`, and the caller-supplied
`idempotencyKey`. Uniqueness is guaranteed by the existing partial-unique index
`{ organizationId, whatsappAccountId, idempotencyKey }`. A first insert returns `202`;
a replay with the same key returns `200` and the existing message (no duplicate). On a new
message the conversation preview and `lastHandledBy` are updated and a `MESSAGE_CREATED`
activity is logged.

Actual delivery through the WhatsApp socket is intentionally out of scope for this phase
(the socket runs in a separate process); a later phase adds a dispatcher that drains the
queue.

## Reused building blocks

- Auth/permission plumbing: `middleware/auth.middleware.js`, `auth/permission.service.js`
  (`userHasAnyPermission` added for assigned-OR-all).
- Serializers (already phone-free): conversation, contact, message.
- Repositories: `updateAssignment`, `updateConversationPreview`,
  `findMessagesByConversationCursor`, `createOutboundMessageRecord`, `createActivity`,
  `createAuditLog`, `findContactPrivatePiiForInternalUse`.
