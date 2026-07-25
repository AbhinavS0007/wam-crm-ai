# Phase 12 Evidence — 01 Entry State

Phase 12 began after Phase 11 delivered the lead side-panel.

Confirmed entry state:

- The UI was only _fake-live_: the inbox polled every 15s and an open thread every 10s.
- Backend suite before Phase 12: 52 files / 210 tests. Frontend: 9 files / 22 tests.
- Redis was already connected by the API server and available for pub/sub; the `redis`
  client supports a duplicated subscriber connection.

Goal for Phase 12: make the UI genuinely live — the inbox, open thread, and lead panel update
the moment a message arrives, a delivery status changes, or a lead is assigned/staged.

Key constraint recorded: the events that matter (inbound persistence, delivery status) happen
in the **WhatsApp session process**, while SSE clients connect to the **API process**, so the
event bus must bridge processes — hence Redis pub/sub.
