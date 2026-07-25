# Phase 12 Evidence — 05 Review Checklist

- [x] SSE stream endpoint (`/api/v1/realtime/stream`) behind auth, with heartbeat + cleanup.
- [x] Redis pub/sub bridges the session process and the API process.
- [x] Events are non-PII signals (`conversationId`, `assignedTo`, `reason`); no bodies on the channel.
- [x] Fan-out mirrors the Phase 7 read scope (org + read_all/assigned); cross-org never delivered.
- [x] Emit points at inbound ingestion, outbound enqueue, delivery status, assign, and stage.
- [x] Publishing is best-effort — a Redis failure never breaks the originating action.
- [x] Frontend opens the stream with a Bearer header (no token in URL), reconnects with backoff.
- [x] Inbox refetches on any event; open thread refetches on its own conversation's events.
- [x] Polling kept as a 60s fallback (also refreshes the token so the stream recovers after 401).
- [x] No new npm dependencies.
- [x] Backend (221) + frontend (26) lint/tests/build pass; format clean.
- [ ] GitHub Actions CI green (recorded in 06-ci-result.md).

## Known boundaries

- One event type (`conversation.changed`); no typing/presence, no delivered/read receipts,
  no media, no AI.
