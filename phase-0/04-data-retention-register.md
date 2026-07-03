# WAM CRM AI — Data Retention and Deletion Register

## Document control

| Field | Value |
|---|---|
| Project | WAM CRM AI |
| Document | Data Retention and Deletion Register |
| Version | 1.0 |
| Status | Approved provisional MVP baseline |
| Approval date | 2026-06-28 |
| Phase | Phase 0.5 |
| Related documents | 00-project-charter.md, 01-scope-and-feature-matrix.md, 02-roles-permissions-privacy.md, 03-whatsapp-number-policy.md |

---

## 1. Purpose

This register defines how long project data should be stored and how it should be deleted.

The goal is to avoid keeping sensitive information forever without a valid business reason.

These are provisional MVP rules. They must be reviewed before production if legal, contractual or business requirements require a different period.

No real production data should be stored until the retention rules are accepted.

---

## 2. Core principles

WAM CRM AI will follow these rules:

- Store only data that has a clear purpose.
- Keep data only for as long as it is needed.
- Delete or anonymize expired data.
- Do not place phone numbers, WhatsApp JIDs, message bodies, tokens or secrets in operational logs.
- Do not use permanent public media links.
- Protect backups with encryption.
- Treat a backup as valid only after a restore test succeeds.
- Apply deletion across all relevant storage systems.
- Record any retention exception with a reason, owner and expiry date.

---

## 3. Retention register

| Data category | Purpose | Owner | Provisional retention | Deletion or expiry action |
|---|---|---|---:|---|
| Client phone number | Identify the WhatsApp contact internally | Admin | While the contact or lead is active | Delete or anonymize when the related contact is deleted |
| Client email address | Optional CRM contact detail | Admin | While the contact or lead is active | Delete or anonymize with the related record |
| Raw WhatsApp JID | Provider-side account/contact mapping | Technical owner | While the contact or account relationship is active | Delete when the related contact/account data is removed |
| Message text | Conversation history and CRM operations | Business owner/Admin | 180 days | Automatically delete after expiry unless an approved exception exists |
| Media attachments | Support approved conversation media | Admin | 90 days | Delete from private object storage and related metadata |
| Shared CRM notes | Team operational context | Manager/Admin | Same as related lead or conversation | Delete with the related lead/conversation |
| Restricted CRM notes | Sensitive internal operational context | Admin | Same as related lead or conversation | Delete with the related record |
| Staff user records | Authentication, authorization and audit accountability | Admin | While active, then as required for audit | Disable first; delete or anonymize after audit obligations end |
| Activity timeline | Operational accountability | Admin | Same as related lead/conversation, unless an audit event | Delete with the related record or retain under audit policy |
| Security audit logs | Security and privileged-action evidence | Admin | 12 months | Delete after retention period |
| Operational application logs | Troubleshooting and monitoring | Technical owner | 30 days | Automatically expire |
| AI prompts | Generate approved AI assistance | Admin/AI owner | 30 days | Automatically delete |
| AI drafts | Human-reviewed reply assistance | Admin/AI owner | 30 days | Automatically delete unless explicitly saved as a CRM note |
| AI summaries | Conversation assistance | Admin/AI owner | 30 days | Delete unless an authorized user saves the summary as a CRM note |
| AI feedback metadata | Measure acceptance, rejection and edits | AI owner | 180 days | Delete after expiry; avoid unnecessary full-text retention |
| Knowledge documents | Approved business knowledge for AI | Knowledge owner | While approved and active | Archive replaced versions and delete obsolete provider copies |
| Vector-store data | Knowledge retrieval | AI owner | While source documents remain approved | Delete when the related document is removed or replaced |
| Baileys authentication state | Restore linked WhatsApp sessions | Technical owner | While the account is linked | Delete immediately after confirmed account removal/logout |
| Redis cache data | Temporary sessions, locks and jobs | Technical owner | Short-lived according to function | Expire automatically or delete when no longer needed |
| Outbound queue jobs | Reliable message sending | Technical owner | Until completed, failed or expired | Remove according to queue cleanup rules |
| Database backups | Disaster recovery | Backup owner | 30-day rolling retention | Automatically expire old backups |
| Encryption-key backup | Recovery of encrypted data | Key custodian | While related encrypted data exists | Securely retire according to key-rotation procedure |
| Temporary files | Processing uploads or exports | Technical owner | Shortest practical duration | Automatically delete after processing |
| Export files | Not supported in the initial MVP | Admin | Not applicable | No export file should be created in the initial MVP |

---

## 4. Message retention

Message text will be retained for **180 days** by default.

After 180 days:

- The message content should be deleted.
- Minimal metadata may remain only when required for audit or technical integrity.
- A longer period requires a documented business reason.
- Any exception must include an expiry or review date.

The initial MVP should not keep message history permanently by default.

---

## 5. Media retention

Approved media files will be retained for **90 days**.

Media rules:

- Store media in private object storage.
- Do not expose permanent public URLs.
- Use short-lived signed URLs.
- Delete the object and related database metadata after expiry.
- Remove temporary processing copies.
- Introduce media only after text messaging is stable and the media policy is approved.

---

## 6. Client identifiers

Phone numbers, email addresses and WhatsApp JIDs are restricted PII.

They may be retained while the related contact or lead remains active.

When the related record is deleted:

- Delete the identifying field, or
- Anonymize it when a valid audit or business record must remain.

Restricted identifiers must not appear in:

- Normal application logs
- Browser logs
- URLs
- Socket.IO room names
- Error messages
- Analytics events
- Queue names visible to ordinary users

---

## 7. AI data

### AI prompts and drafts

Default retention:

```text
30 days
```

Rules:

- Store only when needed for quality, troubleshooting or audit.
- Prefer sanitized content.
- Do not store restricted PII unnecessarily.
- Delete prompts and draft content automatically after expiry.

### AI summaries

Default retention:

```text
30 days
```

An authorized user may intentionally save an approved summary as a CRM note. Once saved as a CRM note, the CRM-note retention rule applies.

### AI feedback metadata

Default retention:

```text
180 days
```

Prefer storing:

- Draft accepted
- Draft rejected
- Draft edited
- Edit amount
- Feature used
- Response timing

Avoid storing the full conversation again when metadata is sufficient.

---

## 8. Audit and operational logs

### Security audit logs

Default retention:

```text
12 months
```

Audit logs should include important events such as:

- PII reveal
- User role changes
- User disablement
- WhatsApp account connection or removal
- Access changes
- Security actions

Audit logs must not contain:

- Passwords
- Access tokens
- Refresh tokens
- Encryption keys
- Baileys credentials
- Unnecessary message content

### Operational logs

Default retention:

```text
30 days
```

Operational logs are used for debugging and monitoring.

They must not contain:

- Phone numbers
- Emails
- WhatsApp JIDs
- Message bodies
- API keys
- Authentication tokens
- Encryption secrets

---

## 9. Baileys authentication state

Baileys authentication state is retained only while the WhatsApp account remains linked.

When removal or logout is confirmed:

- Stop the active session.
- Stop new account jobs.
- Resolve or remove account locks.
- Safely cancel or resolve queued jobs.
- Delete the encrypted authentication state.
- Remove related cache entries where applicable.
- Record the removal action.

The project must not keep unused authentication state indefinitely.

---

## 10. Knowledge documents and vector data

Knowledge documents remain active only while approved.

When a document is replaced or removed:

- Mark the old version as archived.
- Prevent it from being used for new AI responses.
- Remove obsolete vector-store data.
- Remove provider-hosted copies when applicable.
- Retain only the minimum audit information needed to record the change.

---

## 11. Backups

The provisional backup policy is:

- Daily database backups
- Approximately 30-day rolling retention
- Encrypted backup storage
- Encryption keys stored separately from backup data
- Access limited to approved owners
- Regular restore testing

A backup is not considered successful merely because a backup file exists.

A backup becomes trusted only after a restore test proves that:

- The backup can be accessed.
- The database can be restored.
- Encrypted fields can still be decrypted with the approved key process.
- The restored application data is usable.

Old backups must expire according to the approved rolling lifecycle.

---

## 12. Deletion coverage

A deletion operation must consider all locations where the data may exist.

Depending on the data type, deletion may need to cover:

- MongoDB
- Private object storage
- Redis
- BullMQ job data
- Search indexes
- Vector stores
- AI provider-held files
- Temporary processing directories
- Generated export files
- Analytics or monitoring tools
- Expiring backups according to the backup lifecycle

Deleting only the main MongoDB record is not always sufficient.

---

## 13. Retention exceptions

A longer retention period is allowed only when there is a valid reason.

Every exception must record:

- Data category
- Business or legal reason
- Affected records
- Accountable owner
- Approval date
- Review or expiry date
- Required access restrictions
- Final deletion action

Permanent exceptions without a review date are not allowed by default.

---

## 14. Data deletion requests

When an approved deletion request is received:

1. Confirm the identity and authority of the requester.
2. Identify the related internal contact or lead.
3. Determine whether any approved legal or business exception applies.
4. Delete or anonymize the primary database data.
5. Delete related media and temporary files.
6. Remove cache, index and vector-store copies.
7. Record the deletion action without retaining unnecessary PII.
8. Allow backup copies to expire through the approved backup lifecycle unless immediate backup deletion is technically and legally required.

The exact production workflow will be implemented in a later phase.

---

## 15. Initial MVP exclusions

The initial MVP does not include:

- PII export files
- Permanent media archives
- Unlimited message-history retention
- Permanent AI prompt retention
- Permanent public media links
- Full message bodies in logs
- Secrets in logs
- Unapproved legal-hold functionality

These may be added only through a documented scope and policy change.

---

## 16. Approved retention decisions

The following provisional defaults are approved:

- Message text: 180 days
- Media: 90 days
- CRM notes: same as the related lead/conversation
- Client PII: while the related contact/lead remains active
- AI prompts and drafts: 30 days
- AI summaries: 30 days unless saved as an approved CRM note
- AI feedback metadata: 180 days
- Security audit logs: 12 months
- Operational logs: 30 days
- Baileys auth state: only while the account is linked
- Knowledge documents: while approved and active
- Database backups: 30-day rolling retention
- Export files: excluded from the initial MVP

---

## 17. Future improvements

Possible later improvements include:

- Configurable retention by WhatsApp account
- Automated anonymization
- Legal-hold workflows
- Data-subject request tracking
- Deletion verification reports
- Automated provider deletion checks
- Different backup tiers
- More detailed archival policies
- Compliance-specific retention settings

These are not required for the first MVP.

---

## 18. Phase 0.5 completion condition

Phase 0.5 is complete when:

- Every initial data category has a purpose.
- Every category has an owner.
- Every category has a provisional retention period.
- Deletion behavior is documented.
- Backup lifecycle is documented.
- AI data retention is documented.
- Baileys authentication-state deletion is documented.
- Exceptions require a reason and expiry.
- The user accepts this document.
