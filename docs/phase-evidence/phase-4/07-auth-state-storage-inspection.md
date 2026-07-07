# Phase 4 Auth-State Storage Inspection

Model added: backend/src/modules/whatsapp-auth-states/whatsapp-auth-state.model.js
Repository added: backend/src/modules/whatsapp-auth-states/whatsapp-auth-state.repository.js

Protected field: encryptedPayload

Verified behavior:

- Auth-state payload is encrypted before storage
- encryptedPayload is select: false
- Raw MongoDB document does not contain plaintext auth-state canary values
- Internal helper decrypts with correct key
- Wrong key fails closed
- Tampered payload fails closed
- Same namespace/keyId upserts instead of duplicating
- Unique index prevents duplicate namespace/keyId records
- Delete-by-account removes auth-state records
- Corrupt marker works

Canary values used only in tests:

- CANARY_AUTH_STATE_SHOULD_NOT_LEAK
- CANARY_SECRET_SHOULD_NOT_LEAK

No Baileys, QR, or WhatsApp connection code was added.
