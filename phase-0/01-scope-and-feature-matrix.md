# WAM CRM AI — Scope and Feature Matrix

## Document control

| Field | Value |
|---|---|
| Document | Scope and Feature Matrix |
| Project | WAM CRM AI |
| Document version | 1.0 |
| Status | Approved for Phase 0.1 |
| Approval date | 2026-06-24 |
| Engineering baseline | WhatsApp_Multi_Account_CRM_AI_MERN_Risk_Controlled_Engineering_Documentation_v3.1.pdf |
| Related charter | 00-project-charter.md |

---

## 1. Purpose

This document classifies requested product capabilities into:

- Version 1 approved scope
- Version 1 controlled or conditional scope
- Future consideration
- Explicitly excluded scope

The matrix prevents accidental scope growth and helps later phases determine what must be designed, implemented, tested and documented.

A feature being listed as Version 1 does not mean it will be built immediately. It means the feature belongs to the approved product boundary and must be delivered only in its assigned phase.

---

## 2. Scope status definitions

| Status | Meaning |
|---|---|
| V1 Core | Required for the controlled internal MVP |
| V1 Later | Part of version 1, but introduced only after prerequisite controls are stable |
| Conditional | Allowed only after separate technical, privacy or risk approval |
| Future | Not part of version 1; may be reconsidered later |
| Excluded | Deliberately not supported in version 1 |
| Prohibited | Must not be implemented or used under the approved version 1 policy |

---

## 3. Product model

| Capability | Status | Approved decision | Notes |
|---|---|---|---|
| Internal Vistaar Media application | V1 Core | Approved | The only organization using version 1 |
| Public SaaS platform | Excluded | No | Requires separate product, tenancy, billing and compliance decisions |
| Public signup | Excluded | No | Users are created or invited by authorized administrators |
| Customer self-registration | Excluded | No | Not part of internal MVP |
| Customers connecting their own WhatsApp accounts | Excluded | No | Only approved internal accounts are managed |
| Multi-tenant billing | Excluded | No | No tenant plans, subscriptions or invoices |
| Responsive web application | V1 Core | Yes | Desktop-first with basic supported mobile-browser use |
| Native Android app | Future | No for V1 | Can be reviewed only after the web product is stable |
| Native iOS app | Future | No for V1 | Can be reviewed only after the web product is stable |
| Custom chat interface | V1 Core | Yes | Required for privacy and CRM control |
| Embedded original WhatsApp Web | Excluded | No | A change requires a separate ADR |

---

## 4. Account capacity and rollout

| Capability or stage | Status | Approved target | Gate or restriction |
|---|---|---:|---|
| Proof-of-concept account | V1 Core | 1 | Disposable secondary number only |
| Multi-account engineering test | V1 Core | 3 | Disposable numbers only |
| Internal pilot | V1 Later | 3–5 | Low-risk numbers after engineering gates |
| Initial production | V1 Later | 5–10 | Approved numbers after privacy and recovery gates |
| Planned maximum | Future capacity target | Up to 25 | Requires measured scaling |
| Capacity review | Mandatory control | Before 20–25 busy sessions | Review infrastructure and operational evidence |
| Personal WhatsApp numbers | Conditional | Technically considered | Only after safe disposable testing and written approval |
| WhatsApp Business numbers | Conditional | Technically considered | Only after safe disposable testing and written approval |
| Primary business number during POC | Prohibited | No | Business-critical risk |
| Founder/owner critical personal number during development | Prohibited | No | Business-critical risk |
| Client-owned test numbers | Prohibited | No | Privacy and custody risk |

---

## 5. User authentication and access

| Feature | Status | Version 1 decision | Notes |
|---|---|---|---|
| Individual staff login | V1 Core | Included | No shared user account as normal practice |
| User activation and deactivation | V1 Core | Included | Required for onboarding and offboarding |
| Role-based access control | V1 Core | Included | Detailed in Phase 0.2 |
| Permission-based checks | V1 Core | Included | Backend default-deny approach |
| Per-WhatsApp-account access | V1 Core | Included | Users see only permitted accounts |
| Rotating refresh sessions | V1 Core | Included | Technical design finalized later |
| MFA for privileged production users | V1 Later | Required before production | Exact mechanism decided later |
| Public account creation | Excluded | No | Internal administrator-controlled users only |
| Anonymous use | Excluded | No | Authentication required |
| Shared staff credentials | Prohibited | No | Breaks accountability and auditability |

---

## 6. Privacy and restricted identifiers

| Feature | Status | Version 1 decision | Notes |
|---|---|---|---|
| Hide client phone number from ordinary staff | V1 Core | Included | Backend must not send the number |
| Hide client email from unauthorized staff | V1 Core | Included | Permission controlled |
| Hide raw WhatsApp JID | V1 Core | Included | Use opaque internal IDs |
| Hide provider payloads | V1 Core | Included | Never expose to ordinary staff |
| Separate staff-safe DTOs | V1 Core | Included | Exact serializer design later |
| Separate admin-safe DTOs | V1 Core | Included | Only approved fields |
| PII reveal workflow | V1 Core | Included | Privileged, reasoned and audited |
| PII export workflow | V1 Later | Conditional | Separate permission and stronger confirmation |
| Phone number in frontend state for hidden staff fields | Prohibited | No | Privacy cannot depend on CSS or display masking |
| Phone number in Socket.IO room name | Prohibited | No | Use internal IDs |
| Phone number in URL | Prohibited | No | Use internal IDs |
| JID in browser logs | Prohibited | No | Privacy and security risk |
| Raw message/provider payload in normal logs | Prohibited | No | Structured sanitized logs only |
| Automatic PII reveal by AI | Prohibited | No | AI has no authority to reveal private data |

The detailed role, permission and privacy policy will be completed in Phase 0.2.

---

## 7. WhatsApp account management

| Feature | Status | Version 1 decision | Notes |
|---|---|---|---|
| Named internal WhatsApp account record | V1 Core | Included | Each account has a safe internal display name |
| QR connection | V1 Core | Included | Authority and custody finalized in Phase 0.3 |
| Connection state | V1 Core | Included | Display real status |
| Reconnect | V1 Core | Included | Controlled lifecycle |
| Relink | V1 Core | Included | Requires runbook and authority |
| Pause account | V1 Core | Included | Stop or restrict new sends safely |
| Remove account | V1 Core | Included | Must include secure cleanup |
| Account health view | V1 Core | Included | State, errors and operational indicators |
| Encrypted session restoration | V1 Core | Included | Exact encryption design in ADR-003 |
| Multiple concurrent accounts | V1 Core | Included | Gradual measured rollout |
| Account isolation | V1 Core | Included | One account failure must not corrupt others |
| Direct Baileys imports in controllers | Prohibited | No | Provider boundary required |
| Wildcard Baileys dependency version | Prohibited | No | Exact tested version must be pinned |
| Automatic use of newest Baileys version | Prohibited | No | Upgrade only after staging tests |

---

## 8. Conversation and messaging

| Feature | Status | Version 1 decision | Notes |
|---|---|---|---|
| Conversation list | V1 Core | Included | Privacy-safe fields only |
| Message thread | V1 Core | Included | Account permission required |
| Receive text messages | V1 Core | Included | First stable message type |
| Send text messages | V1 Core | Included | Human action with authorization |
| Realtime incoming updates | V1 Core | Included | Privacy-safe Socket.IO events |
| Realtime outbound updates | V1 Core | Included | State and result updates |
| Outbound queue | V1 Core | Included | Supports controlled retries and recovery |
| Message deduplication | V1 Core | Included | Prevent duplicate storage and display |
| Controlled retry rules | V1 Core | Included | Prevent uncontrolled duplicate sends |
| Available message-status updates | V1 Core | Included where available | Provider-dependent |
| Idempotent send workflow | V1 Core | Included | Detailed design later |
| Basic supported media receive | Conditional | Later approval | Introduce only after text stability |
| Basic supported media send | Conditional | Later approval | Security, storage and size controls required |
| Large media in MongoDB | Excluded by default | No | Use private object storage |
| Public permanent media URLs | Prohibited | No | Signed short-lived access only |
| Voice calls | Excluded | No | Not a version 1 goal |
| Video calls | Excluded | No | Not a version 1 goal |
| WhatsApp Status management | Excluded | No | Not a version 1 goal |
| Group administration | Excluded | No | Not a version 1 goal |

---

## 9. CRM capabilities

| Feature | Status | Version 1 decision | Notes |
|---|---|---|---|
| Assign conversation to team member | V1 Core | Included | Permission controlled |
| Reassign conversation | V1 Core | Included | Activity recorded |
| Lead stages | V1 Core | Included | Controlled values |
| Tags | V1 Core | Included | Account or organization rules decided later |
| Shared notes | V1 Core | Included | Visible to permitted users |
| Restricted notes | V1 Core | Included | Separate permission |
| Last handled by | V1 Core | Included | Operational accountability |
| Activity timeline | V1 Core | Included | Important business actions |
| Follow-up task | V1 Core | Included | Linked to conversation or lead |
| In-app reminders | V1 Core | Included | Exact delivery behavior later |
| Team workload view | V1 Later | Included | Manager-level operational view |
| Basic operational reporting | V1 Later | Included | Privacy-safe aggregates |
| Complex sales automation | Future | No for V1 | Review after core workflow is stable |
| Drip campaign CRM automation | Prohibited | No | Conflicts with messaging policy |
| Autonomous sensitive CRM changes by AI | Prohibited | No | Human-controlled action required |

---

## 10. AI capabilities

| Feature | Status | Version 1 decision | Notes |
|---|---|---|---|
| Generate reply draft | V1 Later | Included | Only after core security and messaging stability |
| Rewrite text | V1 Later | Included | Human reviews result |
| Shorten text | V1 Later | Included | Human reviews result |
| Simplify English | V1 Later | Included | Human reviews result |
| Professional tone | V1 Later | Included | Account-specific guidance |
| Translation | V1 Later | Included | Human reviews accuracy |
| Conversation summary | V1 Later | Included | Privacy and retention controls apply |
| Suggested tag | V1 Later | Included | Suggestion only unless user confirms |
| Suggested follow-up | V1 Later | Included | Suggestion only unless user confirms |
| Suggested escalation | V1 Later | Included | Suggestion only |
| Approved knowledge-assisted reply | V1 Later | Included | Account-specific approved knowledge only |
| Structured AI output | V1 Later | Required | Safer validation and handling |
| Provider adapter | V1 Later | Required | Avoid direct business-logic coupling |
| AI disable switch | V1 Later | Required | AI remains optional |
| Automatic AI sending | Prohibited | No | Human review and explicit send mandatory |
| Autonomous AI agent | Excluded | No | Not a version 1 goal |
| AI revealing PII | Prohibited | No | No authority |
| AI making unapproved pricing promise | Prohibited | No | Approved knowledge only |
| AI making unapproved timeline promise | Prohibited | No | Approved knowledge only |
| AI making legal commitment | Prohibited | No | Human business approval required |
| AI exporting client data | Prohibited | No | No authority |
| AI directly changing sensitive CRM state | Prohibited | No | Human confirmation required |

---

## 11. Knowledge management

| Feature | Status | Version 1 decision | Notes |
|---|---|---|---|
| Account-specific knowledge documents | V1 Later | Included | Approved documents only |
| Knowledge document approval | V1 Later | Included | Named approver required |
| Knowledge versioning | V1 Later | Included | Old versions archived |
| Obsolete knowledge removal | V1 Later | Included | Includes provider/vector copies |
| Cross-account knowledge leakage | Prohibited | No | Account boundaries required |
| Unapproved public-web retrieval for replies | Excluded by default | No | Separate future decision if required |

---

## 12. Audit, security and operations

| Feature | Status | Version 1 decision | Notes |
|---|---|---|---|
| Audit record for PII reveal | V1 Core | Included | Immutable where practical |
| Audit record for privileged actions | V1 Core | Included | Exact event list later |
| Structured logging | V1 Core | Included | Pino direction |
| Secret redaction | V1 Core | Included | No tokens or keys in logs |
| Account-health monitoring | V1 Core | Included | Required for operations |
| Error monitoring | V1 Later | Included | Vendor selected later |
| Backup process | V1 Core before production | Included | Restore test required |
| Restore drill | V1 Core before production | Required | Backup alone is insufficient |
| Manual business fallback | V1 Core before pilot | Required | Official app/physical phone workflow |
| Relink runbook | V1 Core before pilot | Required | Number custody and authority |
| Incident response ownership | V1 Core before production | Required | Phase 0.7 |
| Shared hosting/cPanel assumption | Excluded | Not assumed sufficient | Long-running Node.js and WebSockets required |
| Production without monitoring | Prohibited | No | Operational risk |
| Production without tested restore | Prohibited | No | Recovery risk |
| Production with unresolved critical privacy defects | Prohibited | No | Blocking condition |

---

## 13. Media and storage

| Feature | Status | Version 1 decision | Notes |
|---|---|---|---|
| Text-first implementation | V1 Core | Approved | Stabilize before media |
| Private object storage | V1 Later | Included | S3-compatible or R2 direction |
| Signed short-lived URLs | V1 Later | Required | No permanent public access |
| File type validation | V1 Later | Required | Security control |
| File size limits | V1 Later | Required | Resource control |
| Malware scanning | Conditional | Provider/process selected later | Required based on approved media scope |
| Direct large-media storage in MongoDB | Excluded by default | No | Avoid database bloat |
| Permanent public bucket | Prohibited | No | Privacy risk |

---

## 14. Notification scope

| Feature | Status | Version 1 decision | Notes |
|---|---|---|---|
| In-app reminders | V1 Core | Included | Follow-up support |
| Email notifications | Future or conditional | Not required initially | Provider decision later |
| Push notifications | Future | No for initial V1 | Native/mobile requirements not approved |
| SMS notifications | Excluded for initial V1 | No | Separate vendor and privacy impact |

---

## 15. Explicit prohibited-use matrix

| Use | Status | Reason |
|---|---|---|
| Bulk promotional messaging | Prohibited | Number and platform risk |
| Broadcast campaigns | Prohibited | Outside controlled support workflow |
| Purchased contact-list messaging | Prohibited | Privacy and unsolicited-messaging risk |
| Cold outreach automation | Prohibited | Unsolicited messaging |
| Spam | Prohibited | Abuse and number restriction risk |
| Automated drip campaigns | Prohibited | Outside version 1 purpose |
| Automatic AI replies | Prohibited | Human accountability required |
| Testing with client numbers | Prohibited | Consent, privacy and custody risk |
| Testing with a critical business number | Prohibited | Business continuity risk |
| Hiding PII only with frontend CSS | Prohibited | Backend data leakage remains |
| Including restricted identifiers in URLs | Prohibited | Leakage through logs/history |
| Including restricted identifiers in Socket.IO room names | Prohibited | Realtime privacy risk |
| Logging secrets, tokens or message bodies by default | Prohibited | Security and privacy risk |
| Unpinned Baileys versions | Prohibited | Upstream breaking-change risk |
| Silent architectural scope changes | Prohibited | Must use documented change control |

---

## 16. Conditional features and approval gates

The following are within the long-term direction but require a separate approval before implementation or use:

### 16.1 Media

Before media sending or receiving expands, approve:

- Supported media types
- File-size limits
- Storage provider
- Signed URL behavior
- Retention
- Malware scanning
- Download permission
- Staff preview rules
- Deletion behavior

### 16.2 Personal and production numbers

Before adding a personal or production number, confirm:

- Number eligibility
- Risk classification
- Phone custody
- QR authority
- Relink authority
- Manual fallback
- Required gates passed
- Written approval

### 16.3 PII exports

Before enabling export, confirm:

- Business purpose
- Permission
- Step-up authentication
- Audit requirements
- Encryption
- Expiry
- Deletion
- Download limits

### 16.4 High account capacity

Before operating 20–25 busy sessions, review:

- RAM and CPU evidence
- Session ownership behavior
- Redis load
- Queue performance
- Reconnect storms
- Database performance
- Network stability
- Operational staffing
- Backup and recovery
- Failure isolation

---

## 17. Version 1 release layers

Version 1 should be delivered in layers rather than as one large release.

### Layer 1 — Secure foundation

- Repository and environment setup
- Authentication
- Authorization
- Privacy-safe data design
- Logging and validation
- Account records without real business use

### Layer 2 — Controlled WhatsApp proof of concept

- One disposable number
- Text receive/send
- Session restoration
- Restart tests
- Basic account state

### Layer 3 — Multi-account and reliability

- Three disposable accounts
- Account isolation
- Queues
- Locks
- Deduplication
- Reconnect behavior
- Failure tests

### Layer 4 — CRM workflow

- Assignment
- Tags
- Stages
- Notes
- Timeline
- Follow-ups

### Layer 5 — Internal pilot

- Limited low-risk accounts
- Trained users
- Monitoring
- Fallback
- Privacy suite
- Recovery evidence

### Layer 6 — AI assistance

- Draft generation
- Structured outputs
- Approved knowledge
- Human review
- AI-specific privacy and quality controls

This layer description does not replace the official engineering phase order.

---

## 18. Change-control rule

A requested feature must not be silently added to version 1.

For every material change:

1. Identify the requested change.
2. Compare it with this matrix.
3. Classify it as:
   - Clarification
   - Scope addition
   - Scope removal
   - Architectural change
   - Risk exception
4. Explain impact on:
   - Privacy
   - Security
   - Reliability
   - Timeline
   - Cost
   - Solo-developer complexity
5. Update the relevant planning document.
6. Create or update an ADR when architectural.
7. Obtain product-owner approval.

---

## 19. Phase 0.1 approval record

The classifications in this matrix were approved on 2026-06-24.

Approved core decisions include:

- Internal Vistaar Media use only
- No public registration
- No customer-connected accounts
- Responsive custom web interface
- No embedded original WhatsApp Web
- One disposable-number POC
- Three-number multi-account engineering test
- Three-to-five-number pilot
- Five-to-ten-number initial production target
- Planned maximum of 25 accounts
- Mandatory review before 20–25 busy sessions
- Text-first messaging
- Gradual media introduction
- Human-reviewed AI drafts
- No automatic AI sending
- No bulk, broadcast, purchased-list or cold-outreach messaging

---

## 20. Related documents

- `00-project-charter.md`
- Phase 0 handoff
- Engineering documentation v3.1
- Future Phase 0 role, privacy, WhatsApp-number, retention, infrastructure, owner and risk documents
- Future ADR records
