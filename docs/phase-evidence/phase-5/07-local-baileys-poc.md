# Phase 5 Local Baileys POC

## Purpose

The earlier encrypted MongoDB auth-state provider reached QR/pairing attempts but did not complete device linking reliably.

A simpler local Baileys proof-of-concept was added to confirm whether Baileys can connect on the developer machine using the known-working `useMultiFileAuthState` approach.

## What was added

- Local-only script: `phase5:local-baileys-poc`
- Browser QR endpoint: `http://localhost:3001/qr`
- Status endpoint: `http://localhost:3001/status`
- Local file auth folder: `backend/.phase5-local-auth/`
- Direct-message receiver with group/status filtering
- Masked JID logging for safer terminal output
- Test send endpoint for later manual verification

## Safety rules

- Use only the disposable Phase 5 WhatsApp account.
- Do not commit `.phase5-local-auth/`.
- Do not paste QR, phone number, JID, auth files, pairing code, or raw provider logs into evidence.
- Direct message JIDs must be masked in logs.
- Groups and `status@broadcast` are ignored in the local POC receiver.

## Manual result

The local POC successfully:

- Started a local server on port `3001`.
- Generated QR at `/qr`.
- Connected to WhatsApp.
- Received direct messages safely with masked sender identifiers.
- Filtered noisy group/status messages.

## Decision

Keep this working local POC inside Phase 5 as a diagnostic baseline.

Next implementation step is to adapt the working `useMultiFileAuthState` connection lifecycle back into the real Phase 5 provider while preserving project safety rules.
