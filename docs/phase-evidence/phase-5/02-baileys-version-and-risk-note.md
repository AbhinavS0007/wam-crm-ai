# Phase 5 Evidence — 02 Baileys Version and Risk Note

## Disposable POC safety policy

Phase 5 is limited to one disposable WhatsApp account.

The disposable test number must be:

- Not the main Vistaar Media number
- Not a client number
- Not a founder's critical personal number
- Not attached to important business operations
- Recoverable manually from the physical phone
- Used only for technical POC testing

Evidence label only:

    Disposable test number label: POC-WhatsApp-01
    Business-critical: No
    Client-owned: No
    Purpose: Phase 5 QR/session POC only
    Fallback: Physical phone / official WhatsApp app

The actual phone number must not be recorded in evidence.

## Baileys dependency

    Baileys package: @whiskeysockets/baileys
    Pinned version: 7.0.0-rc13
    Install date: 2026-07-07
    Reason: Phase 5 disposable single-account POC
    Upgrade rule: Upgrade only through dependency checklist and disposable account test

## Risk controls

- Exact version only.
- No wildcard version.
- No moving GitHub branch.
- `package-lock.json` must be committed.
- Baileys import must remain isolated to the provider adapter.
- No QR scan in Batch 1.
- No live WhatsApp session in Batch 1.
- No business-critical/client number.
- No bulk sending.
- No broadcast.
- No AI-generated outbound sending.
