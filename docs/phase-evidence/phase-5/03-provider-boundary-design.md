# Phase 5 Evidence — 03 Provider Boundary Design

## Boundary

    Route / script / dev test command
    → session service
    → WhatsApp provider interface
    → Baileys adapter
    → encrypted auth-state adapter
    → WhatsAppAuthState repository
    → MongoDB

## Batch 1 scope

Implemented in this batch:

- WhatsApp provider interface
- Baileys provider skeleton
- Safe provider errors
- Phase 5 environment flags
- Provider-contract tests
- Baileys import isolation test

Not implemented in this batch:

- QR generation
- WhatsApp socket startup
- Auth-state adapter
- Real session creation
- Inbound message persistence
- Outbound message sending
- Multi-account runtime
- Frontend inbox or QR UI

## Provider methods

    createSession
    destroySession
    sendTextMessage
    normalizeEvent
    getConnectionStatus

## Safety rule

Controllers and scripts must not directly control Baileys internals.
Application code must depend on the WhatsApp provider boundary first.
