# WAM CRM AI — Phase 0 Sign-off

## Document control

| Field | Value |
|---|---|
| Project | WAM CRM AI |
| Document | Phase 0 Sign-off |
| Version | 1.0 |
| Status | Approved |
| Sign-off date | 2026-06-28 |
| Phase | Phase 0 — Confirm Decisions and Create ADRs |

---

## 1. Sign-off statement

The project owner confirms that Phase 0 is complete.

The approved Phase 0 baseline includes:

- Project charter
- MVP scope and exclusions
- Supported feature matrix
- Roles, permissions and privacy rules
- WhatsApp number-use and critical-number policy
- Data retention and deletion register
- Infrastructure and vendor direction
- Ownership, escalation and fallback register
- Risk acceptance register
- Seven Architecture Decision Records
- Final review checklist

---

## 2. Approved project boundaries

The following decisions are accepted:

- WAM CRM AI is an internal Vistaar Media application.
- Version 1 is not a public SaaS product.
- The application will use a custom chat and CRM interface.
- Original WhatsApp Web embedding is excluded.
- The system begins with one disposable-number proof of concept.
- Account capacity increases gradually through tested stages.
- The planned business target is up to 25 accounts.
- Bulk, broadcast, purchased-list and cold-outreach messaging are prohibited.
- AI generates drafts only.
- Every AI-assisted reply requires human review and explicit manual sending.
- Staff and Managers do not receive phone numbers, emails or raw WhatsApp JIDs.
- Private information is enforced by the backend.
- Admin-only PII reveal is audited.
- PII export is excluded from the first MVP.
- Baileys is accepted for the controlled internal MVP with documented risk controls.
- Business-critical numbers are excluded from development.
- Manual fallback uses the official WhatsApp application or physical phone.
- Local development begins with Docker Compose and fake data.
- Production providers remain provisional until purchase review.
- Major future changes require documented review and an ADR when architectural.

---

## 3. Risk acceptance

The project owner accepts the documented unofficial-provider risk for the controlled internal MVP.

This acceptance depends on the following restrictions remaining active:

- No bulk messaging
- No unsolicited messaging
- No critical number during development
- Exact Baileys version pinning
- Provider abstraction
- Disposable-number testing
- Account isolation
- Reconnect and relink procedures
- Manual fallback
- Monitoring
- Written production approval

If these restrictions are removed or the risk becomes unacceptable, the decision must be reviewed.

---

## 4. Authorization to begin Phase 1

Phase 1 is authorized to begin with:

- Repository creation
- Project folder structure
- JavaScript MERN workspace setup
- Docker Compose local environment
- Local MongoDB
- Local Redis
- Environment-variable templates
- Formatting and linting
- Testing foundation
- Basic documentation structure
- Fake data only

Phase 1 does not automatically authorize:

- Connecting a WhatsApp number
- Using real client data
- Deploying to production
- Purchasing every provisional provider
- Adding AI
- Adding media
- Skipping security or privacy gates

---

## 5. Sign-off record

| Role | Sign-off |
|---|---|
| Project owner | Approved by user / Vistaar Media project lead |
| Technical owner | Approved by user / solo MERN developer |
| Risk acceptance | Approved |
| Phase 0 result | Complete |
| Next authorized phase | Phase 1 |

---

## 6. Final confirmation

The user explicitly confirmed:

```text
Phase 0 complete
```

Phase 0 is therefore formally closed.

Any later change to the approved baseline must be recorded rather than silently replacing these decisions.
