# Phase 12 Evidence — 03 Test Results

## Backend

### `tests/realtime-hub.test.js`

- `shouldDeliverToClient`: read-all client in the same org receives; cross-org never; an
  assigned-only client receives only its own conversations (not others', not unassigned).
- `formatSseEvent` builds a well-formed frame.
- `deliverEvent` writes to a matching client, skips a filtered-out one, and drops a client
  whose `write` throws.

### `tests/realtime-publisher.test.js`

- Publishes a stringified, **non-PII** event to the channel (no body/phone/JID).
- Stringifies ObjectId-like ids and tolerates a null assignee.
- No-op when Redis isn't ready; swallows a publish error; refuses without org/conversation ids.

## Frontend

### `src/tests/realtime.test.jsx`

- `parseSseBuffer` extracts complete frames, keeps the trailing partial, assembles an event
  split across two chunks, and ignores heartbeat/comment frames.
- Integration: with a fake SSE `ReadableStream`, a `conversation.changed` event makes the
  inbox refetch (`listConversations` called a second time).

## Result

```
cd backend && npm run lint && npm test        # 54 files / 221 tests
cd frontend && npm run lint && npm test && npm run build   # 10 files / 26 tests, build OK
```

All green. Existing Phase 8 delivery unit tests were updated to inject the new
`findConversationById` / `publishEvent` collaborators (DI).
