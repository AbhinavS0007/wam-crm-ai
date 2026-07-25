# Phase 11 Evidence — 01 Entry State

Phase 11 began after Phase 10 shipped the chat MVP (login, inbox, thread, send).

Confirmed entry state:

- The backend had the full Phase 9 CRM API (notes, tags, follow-ups, stage, activity) and the
  audited phone-reveal, but the frontend exposed none of it — the UI was "just chat."
- Frontend suite before Phase 11: 5 files / 12 tests passing; lint + build green.

Goal for Phase 11: add a **lead side-panel** to the conversation view that surfaces the
Phase 9 CRM — change stage, read/add notes, attach/detach tags, create/complete follow-ups,
reveal the phone (if permitted), and view the activity timeline. Frontend-only; no backend
changes.

Privacy note: the phone still leaves the backend only through the audited reveal endpoint,
which the UI gates behind the `client_pii.reveal` permission.
