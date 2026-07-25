# Phase 6 Evidence — 03 Contact Blind Index

## Problem

Contact phone and provider JIDs are stored with AES-256-GCM and a random IV
(`encryptContactPhoneForStorage`, `encryptContactProviderJidsForStorage`). This is
correct for privacy but means the encrypted fields cannot be queried, so a returning
WhatsApp sender cannot be matched to an existing contact by decrypting-and-comparing.

## Decision

Add a **blind index**: a deterministic, non-reversible keyed hash of the sender's
normalized WhatsApp JID, stored in an indexed, non-PII contact field
`providerContactKey`.

- Primitive: `backend/src/modules/security/blind-index.service.js`
  - `computeBlindIndex(value, purpose)` = `HMAC-SHA256(CONTACT_LOOKUP_HMAC_KEY, purpose + ':' + value)` (hex).
  - The keyed HMAC prevents offline brute-force reversal of stored digests.
- Domain helpers: `backend/src/modules/privacy/protected-pii.service.js`
  - `normalizeProviderJid(jid)` → canonical `<userpart>@<domain>` (strips Baileys `:device` suffix, lowercases domain).
  - `computeContactProviderKey(jid)` → blind index with purpose `wam-crm-ai:v1:contact.providerJid`.
  - `extractPhoneFromJid(jid)` → bare digits for `s.whatsapp.net` JIDs, else null.

## Storage

- `contacts/contact.model.js`: new `providerContactKey` string field.
- Partial-unique index `{ organizationId: 1, providerContactKey: 1 }` on
  `{ providerContactKey: { $type: 'string' } }` — one contact per sender per org,
  while legacy/manual contacts with a null key are unaffected.

## Key management

- `CONTACT_LOOKUP_HMAC_KEY` (base64, ≥16 bytes) is a **stable** secret and must not be
  rotated: rotating it would orphan every existing lookup digest. It is separate from
  the rotatable field-encryption keyring.

## Safety properties

- Only the HMAC digest is queryable/stored in plaintext; the phone/JID themselves remain
  AES-encrypted.
- The digest never contains the plaintext value (asserted in tests).
