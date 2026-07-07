# Phase 4 Tamper and Wrong-Key Test

Test files:

- backend/tests/encryption.service.test.js
- backend/tests/contact-encryption.repository.test.js
- backend/tests/whatsapp-account-encryption.repository.test.js
- backend/tests/whatsapp-auth-state.repository.test.js
- backend/tests/key-rotation-dry-run.test.js

Verified failure cases:

- Wrong key fails closed
- Wrong purpose/AAD fails closed
- Tampered ciphertext fails closed
- Tampered IV fails closed
- Tampered auth tag fails closed
- Malformed encrypted object fails closed
- Corrupt auth-state payload is reported safely during dry-run

No plaintext secrets or real keys are stored in this evidence file.
