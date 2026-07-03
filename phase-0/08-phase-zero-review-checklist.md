# WAM CRM AI — Phase 0 Review Checklist

## Document control

| Field | Value |
|---|---|
| Project | WAM CRM AI |
| Document | Phase 0 Review Checklist |
| Version | 1.0 |
| Status | Completed |
| Completion date | 2026-06-28 |
| Phase | Phase 0 — Confirm Decisions and Create ADRs |

---

## 1. Purpose

This checklist confirms that the planning, scope, privacy, risk, infrastructure and architecture decisions required before repository setup have been completed.

Phase 0 does not include application coding, WhatsApp account connection, production deployment or real client data.

---

## 2. Final review checklist

| Requirement | Result |
|---|---|
| Project purpose is approved | Passed |
| Internal-only use is approved | Passed |
| Product name and ownership are recorded | Passed |
| Custom chat interface is approved | Passed |
| Original WhatsApp Web embedding is excluded | Passed |
| Public registration is excluded | Passed |
| Customer-facing SaaS is excluded | Passed |
| Customers connecting their own accounts is excluded | Passed |
| Account rollout targets are approved | Passed |
| Planned capacity of up to 25 accounts is recorded | Passed |
| Capacity review before 20–25 busy sessions is required | Passed |
| Version 1 scope is approved | Passed |
| Conditional and future features are documented | Passed |
| Out-of-scope features are documented | Passed |
| Bulk messaging is prohibited | Passed |
| Broadcast campaigns are prohibited | Passed |
| Purchased contact lists are prohibited | Passed |
| Cold outreach is prohibited | Passed |
| Automatic AI sending is prohibited | Passed |
| Human review of AI drafts is required | Passed |
| Admin, Manager and Staff Agent roles are approved | Passed |
| Per-account access is required | Passed |
| Backend-enforced privacy is approved | Passed |
| Phone numbers, emails and JIDs are hidden from Staff and Managers | Passed |
| Admin-only PII reveal is approved | Passed |
| PII export is excluded from the first MVP | Passed |
| Default-deny authorization is approved | Passed |
| Disposable-number testing policy is approved | Passed |
| Critical business numbers are excluded from development | Passed |
| Client-owned test numbers are prohibited | Passed |
| Phone custody is assigned | Passed |
| QR and relink authority are assigned | Passed |
| Manual fallback is approved | Passed |
| Data inventory is complete | Passed |
| Provisional retention schedule is complete | Passed |
| Deletion coverage is documented | Passed |
| Backup lifecycle is documented | Passed |
| Local, staging and production boundaries are defined | Passed |
| Environment separation is mandatory | Passed |
| Shared cPanel hosting is rejected for the WhatsApp session service | Passed |
| Provisional infrastructure providers are recorded | Passed |
| No provider purchase is required during Phase 0 | Passed |
| Required owners are named | Passed |
| Incident Commander is named | Passed |
| Escalation levels are documented | Passed |
| Business fallback owner is named | Passed |
| Risk acceptance register is complete | Passed |
| Unofficial Baileys risk is accepted with controls | Passed |
| Review and blocking triggers are documented | Passed |
| ADR-001 is complete | Passed |
| ADR-002 is complete | Passed |
| ADR-003 is complete | Passed |
| ADR-004 is complete | Passed |
| ADR-005 is complete | Passed |
| ADR-006 is complete | Passed |
| ADR-007 is complete | Passed |
| No real client data was used | Confirmed |
| No WhatsApp account was connected | Confirmed |
| No business-critical number was connected | Confirmed |
| No production provider was purchased merely for Phase 0 | Confirmed |
| No application coding was started during Phase 0 | Confirmed |
| No blocking decision remains for repository setup | Confirmed |

---

## 3. Evidence register

The following Phase 0 evidence has been created:

```text
phase-0/
├── 00-project-charter.md
├── 01-scope-and-feature-matrix.md
├── 02-roles-permissions-privacy.md
├── 03-whatsapp-number-policy.md
├── 04-data-retention-register.md
├── 05-infrastructure-vendor-register.md
├── 06-owner-escalation-register.md
├── 07-risk-acceptance-register.md
├── 08-phase-zero-review-checklist.md
└── 09-phase-zero-signoff.md

docs/adr/
├── ADR-001-javascript-mern-modular-monolith.md
├── ADR-002-baileys-provider-and-fallback.md
├── ADR-003-encrypted-auth-state-and-pii.md
├── ADR-004-privacy-safe-dtos.md
├── ADR-005-human-reviewed-ai.md
├── ADR-006-infrastructure-direction.md
└── ADR-007-data-retention-and-deletion.md
```

---

## 4. Non-blocking future actions

The following are intentionally deferred and do not block Phase 1 repository setup:

- Add a backup Admin before production
- Add an independent security/privacy reviewer before production
- Select final paid provider plans before purchase
- Configure MFA before production
- Select monitoring tools before pilot
- Select malware scanning before general media support
- Test restore and key recovery before production
- Complete disposable-number proof of concept in the correct later phase
- Perform capacity testing before 20–25 busy accounts
- Review official WhatsApp Business Platform migration when necessary

---

## 5. Phase 0 review result

**Result: PASSED**

All required decisions for repository and local development-environment setup are documented.

Phase 1 may begin after the Phase 0 sign-off record is accepted.
