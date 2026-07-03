# WAM CRM AI — Owner, Escalation and Fallback Register

## Document control

| Field | Value |
|---|---|
| Project | WAM CRM AI |
| Document | Owner, Escalation and Fallback Register |
| Version | 1.0 |
| Status | Approved simple MVP baseline |
| Approval date | 2026-06-28 |
| Phase | Phase 0.7 |
| Related documents | 00-project-charter.md, 01-scope-and-feature-matrix.md, 02-roles-permissions-privacy.md, 03-whatsapp-number-policy.md, 04-data-retention-register.md, 05-infrastructure-vendor-register.md |

---

## 1. Purpose

This document assigns ownership for important project, operational, security and fallback responsibilities.

Because WAM CRM AI is initially being built by one solo developer, the same person may hold several responsibilities during development.

The responsibilities are still listed separately so that they can later be transferred to other people without confusion.

---

## 2. Development ownership register

| Responsibility | Initial owner | Notes |
|---|---|---|
| Project owner | User / Vistaar Media | Owns the product direction |
| Product decision owner | User | Approves scope and business decisions |
| Engineering lead | User | Owns technical implementation |
| Backend owner | User | Owns API, database and server logic |
| Frontend owner | User | Owns React application |
| WhatsApp integration owner | User | Owns Baileys integration and session lifecycle |
| AI implementation owner | User | Owns AI integration and safeguards |
| Security owner | User during development | Must add independent review before production |
| Privacy owner | User during development | Must add independent review before production |
| Operations owner | User | Owns deployment and runtime operations |
| Incident commander | User | Leads important incidents |
| Backup owner | User | Owns backup and restore process |
| Encryption-key custodian | User | Protects encryption keys and recovery copies |
| Privileged-access reviewer | User during development | Must review Admin access |
| Staff offboarding owner | Admin / User | Disables users and removes access |
| WhatsApp phone-custody owner | Business owner / Admin | Controls physical production phones |
| QR and relink authority | Admin | Connects and relinks WhatsApp accounts |
| Business fallback owner | Business owner / Admin | Decides when official WhatsApp fallback is used |
| Knowledge-document approver | Business owner / Admin | Approves AI knowledge sources |
| Go-live approver | User / Vistaar Media | Gives written production approval |

---

## 3. Simple ownership rule

During development:

- The user may hold most technical and business responsibilities.
- No responsibility may be left unowned.
- Important decisions must still be documented.
- Sensitive production responsibilities must not remain dependent on only one person forever.

Before production, ownership must be strengthened.

---

## 4. Required additions before production

Before real production use, the project must name:

- One backup Admin
- One backup operations contact
- One person who can physically access production phones
- One independent security or privacy reviewer
- One business decision-maker who can approve fallback operation
- One person who can disable compromised users if the primary Admin is unavailable

These people are not required during local development, but production must not depend only on one unavailable person.

---

## 5. Escalation levels

### Level 1 — Normal operational issue

Examples:

- One message failed
- One account is reconnecting
- A staff user cannot access an assigned conversation
- A follow-up reminder did not appear
- One non-critical function is unavailable

Actions:

1. Staff reports the issue to Manager or Admin.
2. Admin checks account and user status.
3. Technical owner checks sanitized logs.
4. The issue and resolution are recorded.
5. Normal work continues if safe.

### Level 2 — Important service issue

Examples:

- A WhatsApp account logged out
- Messages remain queued
- Redis is unavailable
- MongoDB is unavailable
- Several users cannot log in
- Duplicate messages may have been sent
- Production deployment failed
- Multiple accounts are reconnecting repeatedly

Actions:

1. Admin pauses affected operations.
2. Technical owner becomes Incident Commander.
3. Dashboard sending is paused where necessary.
4. Official WhatsApp or the physical phone is used as fallback if approved.
5. Recovery steps are followed.
6. Queue state and duplicate-send risk are checked.
7. Service resumes only after verification.

### Level 3 — Security or privacy incident

Examples:

- Client phone number may have leaked
- Unauthorized PII reveal occurred
- A staff account may be compromised
- Encryption key may be exposed or missing
- Backup cannot decrypt restored data
- AI exposed restricted information
- Raw WhatsApp credentials may be exposed

Actions:

1. Disable affected access immediately.
2. Pause affected WhatsApp accounts if needed.
3. Preserve safe audit evidence.
4. Do not copy sensitive details into ordinary chat groups or logs.
5. Incident Commander identifies affected users, accounts and data.
6. Business owner decides whether external notification is required.
7. Access resumes only after the risk is controlled.
8. Record corrective and preventive actions.

---

## 6. Scenario ownership register

| Scenario | Primary owner | Immediate action |
|---|---|---|
| WhatsApp account logs out | Technical owner | Pause sends and reconnect or relink |
| WhatsApp restriction warning | Business owner/Admin | Stop sending and review recent activity |
| Duplicate messages appear | Technical owner | Pause the affected queue and investigate |
| Messages remain queued | Technical owner | Check worker, Redis and account state |
| Redis unavailable | Technical owner | Pause queue processing and restore Redis |
| MongoDB unavailable | Technical owner | Stop writes and restore database access |
| Encryption key missing | Encryption-key custodian | Do not replace blindly; start recovery procedure |
| Possible PII leak | Incident commander | Disable access and start privacy review |
| Unsafe AI reply | AI owner/Admin | Disable affected AI feature and review output |
| Backup restore fails | Backup owner | Block production approval until corrected |
| Staff account compromised | Admin | Disable user and revoke sessions |
| Production deployment fails | Technical owner | Roll back to the last working release |
| QR relink required | Admin | Use the physical phone and approved relink process |
| Production phone unavailable | Phone-custody owner | Activate the approved phone-recovery process |
| Account removal required | Admin and technical owner | Pause, remove session state and record action |

---

## 7. Business fallback plan

When the custom application is unavailable:

1. Stop new dashboard sends.
2. Show or communicate the real service state.
3. Staff must not continue using an unreliable dashboard.
4. Authorized Admin may use the physical phone or official WhatsApp application.
5. The technical owner investigates and restores the service.
6. Pending queue state must be checked before restart.
7. Confirm that queued messages will not be duplicated.
8. Resume normal dashboard use only after Admin approval.

The fallback does not mean every Staff Agent receives access to the physical phone.

Only an authorized Admin or business owner may use the fallback channel.

---

## 8. Incident record template

A simple Markdown file or spreadsheet is sufficient for the MVP.

Each important incident should record:

```text
Incident ID
Date and time
Reported by
Incident level
Affected account, service or user
What happened
Immediate action
Incident commander
Business impact
Privacy/security impact
Root cause, if known
Resolution
Corrective action
Preventive action
Closed date
```

No advanced incident-management platform is required for the first MVP.

---

## 9. Contact and backup register

Before production, maintain a private register containing:

- Primary Admin name
- Backup Admin name
- Technical owner contact
- Operations backup contact
- Phone-custody owner contact
- Business fallback owner contact
- Security/privacy reviewer contact
- Go-live approver contact

This private contact register must not contain passwords, API keys or encryption keys.

---

## 10. Go-live authority

Only the approved go-live owner may authorize production use.

Go-live approval requires:

- Required tests passed
- Backup and restore verified
- Privacy controls verified
- Number eligibility confirmed
- Manual fallback documented
- Owners and backups named
- Critical risks accepted or resolved
- Required ADRs accepted
- Production credentials separated from staging

No developer convenience or deadline pressure overrides the go-live gate.

---

## 11. Ownership review

Ownership should be reviewed:

- Before staging
- Before pilot
- Before production
- After a team member leaves
- After a security incident
- After a major architecture change
- When additional WhatsApp accounts are added
- When the user is no longer the only operator

---

## 12. Approved simple MVP decisions

The following are approved:

- Most development responsibilities are initially held by the user.
- The user is the initial Incident Commander.
- The user is the initial technical, backup and encryption-key owner.
- Business owner/Admin controls production phone custody.
- Admin controls QR scanning and relinking.
- Business owner/Admin controls fallback decisions.
- Official WhatsApp or the physical phone is the business fallback.
- Three escalation levels are used.
- A simple Markdown or spreadsheet incident log is sufficient.
- A backup Admin, operations contact, phone custodian and independent reviewer are required before production.
- Go-live requires written approval.

---

## 13. Future improvements

Possible later improvements include:

- Separate security owner
- Separate privacy owner
- Dedicated operations engineer
- On-call rotation
- Automated incident alerts
- Formal incident-management software
- Dual approval for critical actions
- Automated access reviews
- Escalation SLAs
- Dedicated disaster-recovery owner

These are not required during the first development stage.

---

## 14. Phase 0.7 completion condition

Phase 0.7 is complete when:

- Every required responsibility has an owner.
- Incident commander is named.
- Phone custody is assigned.
- Business fallback owner is assigned.
- Go-live authority is assigned.
- Escalation levels are documented.
- Common incident scenarios have owners.
- Production backup ownership requirements are documented.
- The user accepts this document.
