# ADR-003: Encrypted Authentication State and PII

## Status

Accepted

## Date

2026-06-28

## Decision owners

- Technical owner: Solo MERN developer
- Security owner: Project owner during development
- Encryption-key custodian: Project owner

## Context

The system will store sensitive information including:

- Client phone numbers
- Client email addresses
- WhatsApp JIDs
- Baileys authentication state
- Provider-related credentials

A database leak must not automatically reveal these values.

## Decision

Encrypt the following at rest:

- Baileys authentication state
- Client phone numbers
- Client email addresses
- WhatsApp JIDs
- Other approved restricted identifiers

Use authenticated encryption with:

- AES-256-GCM
- Versioned keys
- Separate nonce/IV handling
- Authentication tag verification
- Key version stored with ciphertext

Encryption keys must remain separate from encrypted database values.

The system must support:

- Key rotation
- Key-version lookup
- Recovery testing
- Secure deletion of auth state after account removal

## Alternatives considered

### Plaintext database fields

Rejected because a database leak would expose direct identifiers and session credentials.

### Hashing all fields

Rejected because some fields must be recovered for approved business or provider operations.

Hashing may still be used separately for lookup or uniqueness where appropriate.

### Application-wide single permanent key without versioning

Rejected because it makes rotation and recovery unsafe.

## Reasons

- Reduces impact of database compromise
- Supports backend-only PII reveal
- Protects WhatsApp session credentials
- Supports future key rotation
- Matches the project's privacy-first design

## Positive consequences

- Restricted fields are not readable directly from the database.
- PII reveal can be controlled through backend logic.
- Auth state receives stronger protection.
- Key rotation becomes possible.

## Negative consequences and risks

- Lost keys may make encrypted data unrecoverable.
- Incorrect nonce handling can break security.
- Rotation adds implementation complexity.
- Backups must preserve compatible key versions.

## Controls

- Use proven cryptographic libraries.
- Never design custom encryption algorithms.
- Keep keys outside MongoDB.
- Never log plaintext restricted values.
- Back up keys separately and securely.
- Test restore and decryption together.
- Limit decryption to approved service methods.
- Delete auth state after confirmed account removal.
- Record key version with encrypted data.

## Review triggers

Review this ADR when:

- A key rotation occurs
- A key is suspected compromised
- A new secret-management provider is introduced
- Production restore tests fail
- Additional regulated data is introduced
- Field-level encryption requirements change

## Related documents

- 02-roles-permissions-privacy.md
- 04-data-retention-register.md
- 07-risk-acceptance-register.md
