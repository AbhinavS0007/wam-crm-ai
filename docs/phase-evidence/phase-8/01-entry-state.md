# Phase 8 Evidence — 01 Entry State

Phase 8 began after Phase 7 delivered the CRM serving API and the idempotent outbound-send
enqueue.

Confirmed entry state:

- Outbound messages: the Phase 7 API persists them with `status: queued` but nothing
  delivers them — a queued message never leaves the server.
- Message statuses `sending`, `sent`, `failed`, `failed_permanent` already existed in
  `constants/message-statuses.js` but were unused for outbound.
- The live WhatsApp socket runs only in the session process
  (`scripts/phase5-real-provider-manual.js`), not in the HTTP API.
- Backend suite before Phase 8: 46 files / 181 tests passing.
- Docker MongoDB and Redis: healthy.

Goal for Phase 8: a delivery worker in the session process that drains queued outbound
messages through the live socket, advances their status, and retries failures with backoff.

Sensitive-data note: no QR, phone number, WhatsApp JID, auth-state payload, or encryption
key is recorded in any Phase 8 evidence.
