# ADR-007: Data Retention and Deletion

## Status

Accepted as provisional MVP policy

## Date

2026-06-28

## Decision owners

- Product owner: Vistaar Media project lead
- Privacy owner: Project owner during development
- Technical owner: Solo MERN developer

## Context

WAM CRM AI may store:

- Client identifiers
- Message text
- Media
- CRM notes
- Audit logs
- AI prompts and drafts
- Knowledge documents
- Backups
- Baileys authentication state

Keeping all data forever increases privacy, security and operational risk.

## Decision

Use these provisional retention periods:

- Message text: 180 days
- Media: 90 days
- CRM notes: same as related lead/conversation
- Client PII: while related contact/lead remains active
- AI prompts and drafts: 30 days
- AI summaries: 30 days unless saved as a CRM note
- AI feedback metadata: 180 days
- Security audit logs: 12 months
- Operational logs: 30 days
- Baileys auth state: only while account is linked
- Knowledge documents: while approved and active
- Database backups: 30-day rolling retention
- Export files: excluded from initial MVP

Deletion must consider:

- MongoDB
- Object storage
- Redis
- BullMQ
- Search indexes
- Vector stores
- Provider-hosted files
- Temporary files
- Expiring backups

## Alternatives considered

### Permanent retention

Rejected because it creates unnecessary privacy and storage risk.

### Immediate deletion of all messages

Rejected because the CRM needs limited operational history.

### One retention period for every data type

Rejected because different data serves different purposes.

## Reasons

- Supports business operations without indefinite storage
- Reduces privacy exposure
- Controls storage growth
- Creates clear deletion expectations
- Supports AI data minimization
- Keeps the first policy understandable

## Positive consequences

- Data lifecycle becomes predictable.
- Sensitive data is not retained forever.
- Storage cost is controlled.
- AI content has a short default lifecycle.
- Account removal includes auth-state deletion.

## Negative consequences and risks

- Old conversation history may no longer be available.
- Deletion across several systems is complex.
- Backups may temporarily retain expired data.
- Business exceptions require careful handling.

## Controls

- Automated retention jobs
- Private object storage
- No PII in operational logs
- No permanent public media URLs
- Retention exceptions require reason and expiry
- Restore tests
- Secure backup lifecycle
- Deletion coverage tests
- Audit of important deletion actions
- Review before production

## Review triggers

Review this ADR when:

- Legal or contractual requirements change
- New data categories are introduced
- PII export is added
- Regulated clients are supported
- Storage cost changes materially
- Deletion tests fail
- Backup retention changes
- The business requires longer operational history

## Related documents

- 04-data-retention-register.md
- ADR-003
- ADR-005
