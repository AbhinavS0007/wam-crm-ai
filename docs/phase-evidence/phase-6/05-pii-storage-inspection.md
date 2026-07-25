# Phase 6 Evidence — 05 PII Storage Inspection

## What is stored where

| Data                   | Storage                                       | Form                                                                             |
| ---------------------- | --------------------------------------------- | -------------------------------------------------------------------------------- |
| Sender phone number    | `contact.encryptedPhone`                      | AES-256-GCM (unchanged from Phase 4)                                             |
| Sender provider JID(s) | `contact.encryptedProviderJids`               | AES-256-GCM (unchanged from Phase 4)                                             |
| Sender lookup identity | `contact.providerContactKey`                  | HMAC-SHA256 blind index (non-reversible)                                         |
| Sender display name    | `contact.displayName` / `contact.profileName` | plaintext (Phase 3 design); WhatsApp `pushName` or `"WhatsApp Lead"` placeholder |
| Message body           | `message.body`                                | plaintext (Phase 3 design)                                                       |

## Confirmations

- The inbound ingestion service never writes a plaintext phone or JID to any queryable
  field. Phone/JID only reach storage through the existing encrypted-field helpers.
- `contact-provider-key.repository.test.js` asserts the stored contact document, when
  serialized, does not contain the plaintext phone.
- `inbound-message.service.test.js` asserts the ingestion result summary contains no
  phone digits and no `@s.whatsapp.net` JID.
- The blind-index digest is a keyed HMAC and cannot be reversed to the JID without the
  secret key; the digest itself does not contain the plaintext value.

## Log redaction

- The redaction service (`security/redaction.service.js`) continues to block keys such as
  `phone`, `jid`, `encryptedPhone`, `encryptedProviderJids`. The new `providerContactKey`
  is a non-reversible keyed hash, not PII, so it does not need redaction.

## Sensitive-data note

- No QR, phone, full JID, pairing code, auth payload, encryption key, or lookup key is
  recorded in this evidence.
