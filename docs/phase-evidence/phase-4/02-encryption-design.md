# Phase 4 Encryption Design

Phase 4 added field-level encryption for sensitive data.

Algorithm: AES-256-GCM
Key format: 32-byte base64 encoded key

Environment naming:

- ENCRYPTION_KEY_CURRENT_VERSION
- ENCRYPTION_KEY_V1
- ENCRYPTION_KEY_V2
- ENCRYPTION_KEY_V3

Encrypted field format:

- algorithm: aes-256-gcm
- keyVersion: positive integer string
- iv: base64 value
- ciphertext: base64 value
- authTag: base64 value

Security properties verified:

- Fresh IV per encryption operation
- AAD/purpose binding
- Wrong key fails closed
- Wrong purpose fails closed
- Tampered ciphertext fails closed
- Tampered IV fails closed
- Tampered auth tag fails closed
- Plaintext is not stored beside ciphertext
- Key material is not stored in MongoDB
- Key material is not included in evidence
