# Phase 13 Evidence — 01 Entry State

Phase 13 began after Phase 12 delivered realtime updates.

Confirmed entry state:

- WhatsApp numbers could only be connected via the manual Phase-5 script, one disposable POC
  at a time. There was no way to add/list/manage numbers from the app.
- The `WhatsAppAccount` model, repository, serializer, Baileys provider (per-account encrypted
  auth-state), `session-status.mapper`, ingestion service, and realtime bus already existed.
- Suites before Phase 13: backend 54 files / 221 tests; frontend 10 files / 26 tests.

Goal for Phase 13: bring account management into the app — an Accounts screen to add a number,
Connect (scan QR) it live, and pause/resume/disconnect/remove — with WhatsApp sockets running
in the API process via a session manager.

Safety posture (confirmed): kept behind the disposable-POC gate (`WHATSAPP_ENABLED`,
"disposable number / synthetic data only"). Graduating to real client numbers stays a
deliberate later step. The manager is unit-tested with a fake provider; the live QR scan is a
manual verification.
