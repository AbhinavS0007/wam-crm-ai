# Phase 5 Evidence — 04 Auth-State Adapter Test

## Scope

Batch 2 adds the encrypted Baileys auth-state adapter.

Implemented:

- Baileys auth-state mapper
- Encrypted Baileys auth-state adapter
- Single-key auth-state deletion helper
- Synthetic mapper tests
- Synthetic adapter tests
- Raw MongoDB canary inspection tests
- Corrupt/tamper fail-closed adapter test

Not implemented:

- QR login
- WhatsApp socket startup
- Live Baileys session
- Inbound WhatsApp handling
- Outbound WhatsApp sending
- Multi-account runtime

## Safety notes

The adapter stores:

- Baileys creds under `namespace=creds`, `keyId=default`
- Baileys key material under `namespace=keys`, `keyId=<type>:<id>`

All payloads pass through the Phase 4 encrypted `WhatsAppAuthState` repository.

Plaintext auth-state exists only in test/runtime memory and is never written directly to MongoDB.

## Canary values

Synthetic canary used in tests:

    CANARY_PHASE5_AUTH_STATE_SHOULD_NOT_LEAK

Expected result:

- Canary appears in runtime decrypted object only.
- Canary does not appear in raw MongoDB auth-state document JSON.
- Corrupted encrypted payload fails closed.
- Corrupted encrypted payload is marked `corrupt`.
