# Phase 8 Evidence — 04 Test Results

## New suites

### `tests/outbound-delivery.service.test.js` (unit, mocked session + repositories)

- Delivers a queued message → `sent` with the provider message id.
- Prefers the provider JID as the recipient.
- No recipient → `failed_permanent` and no send attempted.
- Send throws below the cap → `failed` with an incremented attempt count and a computed
  `nextAttemptAt`.
- Send throws at the cap → `failed_permanent`.
- Stored delivery error never contains a phone or JID.
- Empty queue → no-op.
- Sending disabled → does not claim or send.
- `drainQueue` delivers multiple messages up to the per-minute cap.

### `tests/outbound-delivery.repository.test.js` (DB-backed)

- Two concurrent `claimNextOutboundMessage` calls never return the same row (atomic claim).
- `markOutboundMessageSent` persists `sent`, `providerMessageId`, and `sentAt`.
- A `failed` row is re-claimable only after `nextAttemptAt` has passed, and its attempt
  count increments on re-claim.
- A `failed` row that reached the attempt cap is not re-claimed.

## Result

```
cd backend && npx vitest run tests/outbound-delivery.service.test.js tests/outbound-delivery.repository.test.js
```

Result: 2 files / 13 tests passed.
