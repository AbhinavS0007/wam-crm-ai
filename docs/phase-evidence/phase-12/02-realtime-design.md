# Phase 12 Evidence — 02 Realtime Design

## Transport & bus

- **Server-Sent Events** over a `fetch` stream with an `Authorization: Bearer` header (browser
  `EventSource` can't send headers, and we avoid tokens in URLs). No new dependencies.
- **Redis pub/sub** bridges the session process (publisher) and the API process (SSE fan-out).

## "Signal, then refetch"

Events are lightweight, non-PII signals — `{ type, organizationId, conversationId,
assignedTo, reason }` — never message bodies. On an event the client refetches through the
existing authenticated, scope-enforcing endpoints. The pub/sub channel therefore never carries
message content or PII.

## Backend — `modules/realtime/`

- `realtime.events.js` — channel `realtime:events`, event type `conversation.changed`, reasons.
- `realtime.publisher.js` — `publishConversationChanged(...)`: best-effort
  `redis.publish(channel, json)`; a no-op when Redis isn't ready and swallows errors so it can
  never break the originating action.
- `realtime.hub.js` — per-process client registry + subscriber. `shouldDeliverToClient` mirrors
  the Phase 7 read scope (same org, and `read_all` OR the changed conversation is assigned to
  the user). `startRealtimeSubscriber` duplicates the Redis client and fans out to matching
  clients; `formatSseEvent` builds the frame.
- `realtime.routes.js` — `GET /api/v1/realtime/stream` behind `authenticateRequest`: SSE
  headers, register client, 25s heartbeat, cleanup on close.

## Emit points (best-effort, one call each)

- Inbound ingestion (`reason: inbound`), outbound enqueue (`reason: outbound`), delivery
  status (`reason: status`), and conversation assign/stage (`reason: assignment | stage`).
- The three factory services take an injectable `publishEvent` (no-op in unit tests); the
  delivery service also looks up the conversation to include `assignedTo` for correct scoping.

## Startup

- `server-lifecycle.js` starts/stops the subscriber around the HTTP server.
- The session script (`phase5-real-provider-manual.js`) now connects Redis so it can publish.

## Frontend — `src/realtime/`

- `parse-sse.js` — pure `parseSseBuffer` that extracts complete frames and returns the leftover
  partial for the next chunk.
- `RealtimeProvider.jsx` — opens the authenticated fetch stream, parses frames, and dispatches
  to subscribers; reconnects with backoff. `useRealtime().subscribe(handler)`.
- `ConversationList` refetches the inbox on any event; `ConversationView` refetches the open
  thread when its own conversation changes. Polling drops to a 60s safety fallback (which also
  refreshes the access token, letting the stream recover after a 401).
