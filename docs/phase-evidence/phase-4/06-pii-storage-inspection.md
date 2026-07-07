# Phase 4 PII Storage Inspection

Protected models:

- Contact
- WhatsAppAccount

Protected Contact fields:

- encryptedPhone
- encryptedEmail
- encryptedProviderJids

Protected WhatsAppAccount fields:

- encryptedPhone
- encryptedJid

Repository helpers added:

- setContactEncryptedPii
- findContactPrivatePiiForInternalUse
- setAccountEncryptedIdentifiers
- findAccountPrivateIdentifiersForInternalUse

Verified by raw MongoDB inspection tests:

- backend/tests/contact-encryption.repository.test.js
- backend/tests/whatsapp-account-encryption.repository.test.js

Canary values used only in tests:

- CANARY_PHONE_SHOULD_NOT_LEAK
- CANARY_EMAIL_SHOULD_NOT_LEAK
- CANARY_JID_SHOULD_NOT_LEAK

Verification result:

- Raw MongoDB documents do not contain plaintext canary values
- Normal serializers do not expose encrypted fields
- Internal helpers decrypt only server-side
- Wrong key fails closed
