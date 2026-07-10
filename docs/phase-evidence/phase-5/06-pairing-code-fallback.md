# Phase 5 Pairing-Code Fallback

## Purpose

QR linking reached the local QR generation stage, but WhatsApp rejected device linking from the phone side.

This fallback adds a local-only Baileys pairing-code script so the disposable Phase 5 account can be linked without scanning a QR.

## Safety rules

- Use only the disposable account label: `POC-WhatsApp-01`.
- Do not use a business-critical number.
- Do not use a client-owned number.
- Do not record the actual phone number in evidence.
- Do not paste pairing code into chat or evidence.
- Do not paste QR, JID, auth payload, encryption key, or raw provider logs.
- Pairing code flow remains dev-only and local-only.

## Implementation summary

- Provider supports `pairingPhoneNumber` inside `createSession`.
- Provider sanitizes the pairing number before requesting a pairing code.
- Provider prints only the pairing code locally.
- Session service passes pairing-code inputs through the provider boundary.
- Script `phase5:start-pairing-code` asks for the phone number locally.
- Auth-state remains encrypted through the existing Phase 4/5 adapter.

## Expected manual test

1. Clean stale local auth-state.
2. Run `npm run phase5:start-pairing-code`.
3. Enter the disposable phone number locally.
4. Enter the generated pairing code on the disposable WhatsApp phone.
5. Confirm `phase5:inspect-session` shows `active`.
6. Confirm encrypted auth-state exists.
7. Confirm no real phone, pairing code, JID, QR, auth payload, or key is recorded.
