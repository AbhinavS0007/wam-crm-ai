# WAM CRM AI — Risk Acceptance Register

## Document control

| Field | Value |
|---|---|
| Project | WAM CRM AI |
| Document | Risk Acceptance Register |
| Version | 1.0 |
| Status | Approved simple MVP baseline |
| Approval date | 2026-06-28 |
| Phase | Phase 0.8 |
| Related documents | 00-project-charter.md, 01-scope-and-feature-matrix.md, 02-roles-permissions-privacy.md, 03-whatsapp-number-policy.md, 04-data-retention-register.md, 05-infrastructure-vendor-register.md, 06-owner-escalation-register.md |

---

## 1. Purpose

This register records important risks that cannot be completely removed before development begins.

A risk may be accepted only when:

- Its impact is understood.
- Preventive controls are defined.
- Fallback or compensating controls are defined.
- An owner is assigned.
- A review date or review trigger exists.
- The risk does not violate an approved project boundary.

Verbal risk acceptance is not sufficient.

---

## 2. Risk status definitions

| Status | Meaning |
|---|---|
| Open | The risk exists and controls are not yet fully implemented |
| Accepted with controls | The risk is knowingly accepted under documented restrictions |
| Controlled for development | The current development-stage controls are sufficient, but production controls remain |
| Blocked | The project or feature must not proceed until the risk is reduced |
| Closed | Required controls are implemented and evidence is accepted |
| Rejected | The risk is not accepted, so the related feature or action is prohibited |

---

## 3. Primary accepted risk

### R-01 — Unofficial WhatsApp provider

**Decision:** Accepted with controls for the controlled internal MVP.

The project plans to use Baileys, an unofficial WhatsApp protocol client.

Possible consequences include:

- WhatsApp protocol changes
- Baileys breaking changes
- Authentication failure
- Unexpected logout
- QR relink requirement
- Temporary downtime
- Number restriction
- Unsupported WhatsApp behaviour
- Future need to migrate to an official platform

### Mandatory controls

- Use a disposable secondary number first.
- Do not use a critical business number during development.
- Do not use client-owned numbers for testing.
- Prohibit bulk messaging.
- Prohibit unsolicited messaging.
- Prohibit purchased contact lists.
- Prohibit automatic AI sending.
- Pin the exact tested Baileys version.
- Keep Baileys behind a provider/service boundary.
- Test reconnect and relink behaviour.
- Keep a manual fallback using the official WhatsApp application or physical phone.
- Isolate WhatsApp account sessions.
- Monitor account state and failures.
- Require written approval before adding production numbers.
- Review future migration to the official WhatsApp Business Platform when required.

---

## 4. Risk record template

Every accepted risk or exception must contain:

```text
Risk ID
Risk title
Scope and reason
What may happen
Potential impact
Affected accounts, users or data
Preventive controls
Compensating or fallback controls
Accountable owner
Accepted by
Start date
Review or expiry date
Cancellation trigger
Evidence link
Current status
```

---

## 5. Initial risk register

### R-01 — Unofficial WhatsApp provider

| Field | Value |
|---|---|
| Scope and reason | Baileys is planned for the controlled internal MVP |
| What may happen | Logout, protocol break, restriction, relink or downtime |
| Potential impact | WhatsApp service interruption and business disruption |
| Affected scope | Connected WhatsApp accounts and internal users |
| Preventive controls | Disposable testing, conservative use, exact version pinning, no bulk messaging |
| Fallback controls | Official WhatsApp application or physical phone |
| Owner | Project owner |
| Accepted by | Project owner / Vistaar Media |
| Start date | 2026-06-28 |
| Review date | Before internal pilot and before production |
| Cancellation trigger | Repeated restrictions, unacceptable instability, or need for an official integration |
| Evidence | WhatsApp number policy, provider ADR, test records |
| Status | Accepted with controls |

### R-02 — Baileys or WhatsApp breaking change

| Field | Value |
|---|---|
| What may happen | An upstream change breaks connection, authentication or messaging |
| Potential impact | Partial or complete service interruption |
| Preventive controls | Exact version pinning, provider abstraction, staging upgrade tests |
| Fallback controls | Roll back the dependency version and use official WhatsApp fallback |
| Owner | Technical owner |
| Review trigger | Every Baileys upgrade or major upstream change |
| Planned control phase | Integration and staging |
| Status | Open |

### R-03 — Authentication-state or encryption-key compromise

| Field | Value |
|---|---|
| What may happen | Session credentials or encryption keys are exposed, lost or misused |
| Potential impact | Unauthorized account access or inability to recover encrypted data |
| Preventive controls | Encryption at rest, separated keys, secret redaction, restricted access |
| Fallback controls | Credential rotation, session removal, relink, key-recovery process |
| Owner | Technical owner / key custodian |
| Review trigger | Security incident, key rotation or production preparation |
| Planned control phase | Security implementation |
| Status | Open |

### R-04 — Broken authorization or PII leakage

| Field | Value |
|---|---|
| What may happen | Unauthorized users receive conversations or private identifiers |
| Potential impact | Client privacy breach and loss of trust |
| Preventive controls | Backend authorization, default deny, privacy-safe DTOs, per-account access |
| Fallback controls | Disable access, revoke sessions, preserve audit evidence, incident review |
| Owner | Technical owner |
| Review trigger | Any privacy-test failure or reported exposure |
| Planned control phase | Authentication and privacy implementation |
| Status | Open |

### R-08 — Duplicate or missing messages

| Field | Value |
|---|---|
| What may happen | Messages are sent twice, lost or not stored correctly |
| Potential impact | Confusing or harmful client communication |
| Preventive controls | Idempotency, deduplication, queue controls, retry limits |
| Fallback controls | Pause the affected queue, inspect state and use manual fallback |
| Owner | Technical owner |
| Review trigger | Any duplicate-send or unexplained missing-message incident |
| Planned control phase | Messaging and queue implementation |
| Status | Open |

### R-09 — Duplicate session ownership

| Field | Value |
|---|---|
| What may happen | More than one process controls the same WhatsApp account |
| Potential impact | Duplicate events, corrupted state or unstable reconnection |
| Preventive controls | Redis locks, account ownership rules and session isolation |
| Fallback controls | Stop duplicate processes, release locks safely and reconnect one owner |
| Owner | Technical owner |
| Review trigger | Multi-account testing or horizontal scaling |
| Planned control phase | Multi-account implementation |
| Status | Open |

### R-12 — AI hallucination or unauthorized promise

| Field | Value |
|---|---|
| What may happen | AI invents pricing, timelines, commitments or incorrect information |
| Potential impact | Client dissatisfaction, financial or reputational harm |
| Preventive controls | Human-reviewed drafts, approved knowledge, structured outputs |
| Fallback controls | Disable the AI feature, correct the response and review the prompt |
| Owner | AI owner / Admin |
| Review trigger | Unsafe or misleading AI output |
| Planned control phase | AI implementation |
| Status | Open |

### R-14 — AI privacy exposure

| Field | Value |
|---|---|
| What may happen | Restricted information is unnecessarily sent to or returned by the AI provider |
| Potential impact | Privacy breach or provider-data exposure |
| Preventive controls | Data minimization, sanitization, permission checks and provider adapter |
| Fallback controls | Disable AI, remove provider-held files where applicable and investigate |
| Owner | AI owner / Admin |
| Review trigger | AI privacy-test failure or reported exposure |
| Planned control phase | AI implementation |
| Status | Open |

### R-17 — Backup failure or encryption-key mismatch

| Field | Value |
|---|---|
| What may happen | Backup cannot be restored or encrypted fields cannot be decrypted |
| Potential impact | Permanent data loss or long service interruption |
| Preventive controls | Daily backups, separated key backup and regular restore tests |
| Fallback controls | Block production approval and repair backup/key procedures |
| Owner | Backup owner |
| Review trigger | Every restore drill or key rotation |
| Planned control phase | Backup and recovery implementation |
| Status | Open |

### R-22 — Missing operational ownership

| Field | Value |
|---|---|
| What may happen | No responsible person is available during an incident |
| Potential impact | Slow recovery and unmanaged business disruption |
| Preventive controls | Owner register and named Incident Commander |
| Fallback controls | Add backup Admin, operations contact and phone custodian before production |
| Owner | Project owner |
| Review trigger | Before staging, pilot and production |
| Planned control phase | Development now; expanded before production |
| Status | Controlled for development |

### R-23 — WhatsApp relink disruption

| Field | Value |
|---|---|
| What may happen | A production account requires a new QR scan and the phone is unavailable |
| Potential impact | Extended account downtime |
| Preventive controls | Named phone custodian, Admin relink authority and tested runbook |
| Fallback controls | Official WhatsApp application or physical-phone workflow |
| Owner | Admin / technical owner |
| Review trigger | Relink test or account logout |
| Planned control phase | Staging and pilot |
| Status | Open |

### R-25 — Infrastructure outage

| Field | Value |
|---|---|
| What may happen | VPS, MongoDB, Redis, network or storage becomes unavailable |
| Potential impact | Dashboard outage, queued messages or unavailable records |
| Preventive controls | Managed services, monitoring, backups and health checks |
| Fallback controls | Manual WhatsApp use, service restart, restore or provider escalation |
| Owner | Technical owner |
| Review trigger | Deployment, outage or capacity review |
| Planned control phase | Deployment and operations |
| Status | Open |

---

## 6. Risk review schedule

Risks must be reviewed:

- Before the internal pilot
- Before production
- After a security or privacy incident
- After a WhatsApp number restriction warning
- After a failed restore test
- After a duplicate-message incident
- After a major Baileys upgrade
- Before adding business-critical numbers
- Before operating 20–25 busy accounts
- When a safer official integration becomes necessary

---

## 7. Cancellation and blocking triggers

The current risk acceptance is cancelled or the related feature is blocked when:

- Bulk or unsolicited messaging is requested.
- A critical number is added without passing the approved gates.
- Baileys becomes too unstable for normal business use.
- Repeated number-restriction warnings occur.
- Privacy tests fail.
- Restricted identifiers appear in staff APIs, realtime events, URLs or logs.
- Duplicate sends continue without an effective fix.
- Backups cannot be restored.
- Encryption keys cannot recover approved encrypted data.
- AI sends messages automatically.
- AI exposes restricted data.
- Infrastructure usage exceeds measured safe capacity.
- Required ownership is missing before production.

---

## 8. Risk evidence

Evidence may include:

- Approved policies
- ADRs
- Test reports
- Screenshots
- Sanitized logs
- Backup restore reports
- Incident records
- Monitoring records
- Written approvals
- Version-pinning records
- Pilot review notes

A risk must not be marked closed only because code was written.

Evidence must show that the relevant control works.

---

## 9. Approved risk decisions

The following decisions are approved:

- Baileys risk is accepted for the controlled internal MVP.
- The risk is accepted only with documented restrictions.
- Bulk and unsolicited messaging remain prohibited.
- Critical business numbers remain prohibited during development.
- Automatic AI sending remains prohibited.
- Human review is mandatory for AI drafts.
- Official WhatsApp or the physical phone remains the manual fallback.
- The user/project owner holds most initial risk ownership.
- Production is blocked until required controls and tests pass.
- All open risks must be reviewed before pilot and production.

---

## 10. Phase 0.8 completion condition

Phase 0.8 is complete when:

- The unofficial-provider risk is explicitly accepted or rejected.
- The risk has an owner.
- Mandatory controls are documented.
- Manual fallback is documented.
- Critical-number restrictions are documented.
- Initial project risks are listed.
- Each unresolved risk has a future control phase or blocking condition.
- Review and cancellation triggers are documented.
- The user accepts this document.
