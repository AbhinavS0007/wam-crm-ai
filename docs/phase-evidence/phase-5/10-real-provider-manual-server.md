# Phase 5 Real Provider Manual Test Server

## Purpose

This evidence records the manual test server added for the real Phase 5 provider and single-session service flow.

## What was added

- npm script: phase5:real-provider-manual
- Real provider status endpoint on port 3002
- Real provider QR endpoint on port 3002
- Real provider outbound send endpoint on port 3002
- Safe inbound message endpoint and terminal logging

## Important distinction

This is different from the local standalone Baileys POC.

The local POC proved Baileys connectivity with local file auth.

This manual server tests the real project provider/service path with the encrypted auth-state adapter.

## Safety notes

- Use only disposable POC-WhatsApp-01.
- Do not paste QR, phone number, full JID, auth payload, auth files, or raw provider logs into evidence.
- Safe inbound logs include masked sender preview only.

## Next verification

Run npm run phase5:real-provider-manual, open /status and /qr, then test /send and inbound receive through the real provider path.
