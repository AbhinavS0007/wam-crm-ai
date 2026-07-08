# Phase 5 Evidence — 05 Single-Session Service Design

## Scope

Batch 3 adds the Phase 5 single-account runtime foundation.

Implemented:

- Baileys provider session creation wiring
- Encrypted auth-state adapter injection into provider
- Connection status mapper
- Single-session service
- Dev-only POC account creation script
- Dev-only POC session start script
- Dev-only safe session/account inspection script
- Synthetic provider tests
- Synthetic single-session service tests

Not executed in this batch:

- No QR scan
- No real WhatsApp account linking
- No inbound message persistence
- No outbound message sending
- No multi-account manager
- No frontend QR UI

## Safety controls

- `WHATSAPP_ENABLED=false` by default.
- `WHATSAPP_POC_ACCOUNT_ID` gates the one allowed account.
- `WHATSAPP_ALLOW_DISPOSABLE_POC_ONLY=true` is required.
- Service refuses to start more than one session.
- Startup is script-driven, not automatic backend startup.
- Provider imports remain isolated to the Baileys provider module.
- Session scripts print only safe account/session summaries.

## Disposable number reminder

Use only:

    Disposable test number label: POC-WhatsApp-01

Do not use:

- Main Vistaar Media number
- Client number
- Founder critical personal number
- Business-critical number

Do not record in evidence:

- Actual phone number
- QR string
- WhatsApp JID
- Auth-state payload
- Encryption key
