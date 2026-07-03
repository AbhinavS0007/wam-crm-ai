# WAM CRM AI — Roles, Permissions and Privacy

## Document control

| Field | Value |
|---|---|
| Document | Roles, Permissions and Privacy |
| Project | WAM CRM AI |
| Version | 1.0 |
| Status | Approved simple MVP baseline |
| Approval date | 2026-06-27 |
| Phase | Phase 0.2 |
| Related documents | 00-project-charter.md, 01-scope-and-feature-matrix.md |

---

## 1. Purpose

This document defines the simplest safe access model for the first version of WAM CRM AI.

The goal is not to create a complex enterprise permission system immediately. The first version will use a small number of roles and clear backend rules. More detailed permissions can be added later when the product is stable.

---

## 2. Core privacy rule

Private customer information must be protected by the backend.

The backend must not send restricted information to an unauthorized user.

It is not acceptable to send a phone number to the browser and hide it using React, CSS, masking or frontend logic.

Restricted information includes:

- Customer phone number
- Customer email address
- Raw WhatsApp JID
- Raw provider payload
- Baileys authentication data
- API keys
- Encryption keys
- Internal secrets

Staff-facing APIs and realtime events must use internal identifiers such as:

- `contactId`
- `conversationId`
- `accountId`
- `leadId`

---

## 3. Simple MVP roles

The first version will use only three active business roles.

### 3.1 Admin

The Admin is the highest active role in the first version.

The Admin can:

- Create and disable users
- Assign roles
- Manage WhatsApp account records
- Assign users to WhatsApp accounts
- View all permitted conversations
- Assign and reassign conversations
- Manage tags and lead stages
- View shared notes
- View restricted notes
- Manage AI settings later
- Manage approved knowledge documents later
- View audit records
- Reveal private client details through the approved workflow
- Pause or disable an account during an incident

The first Admin will also temporarily perform the duties that may later belong to a Super Administrator or Operations Engineer.

### 3.2 Manager

The Manager supervises work within assigned WhatsApp accounts.

The Manager can:

- Access assigned WhatsApp accounts
- View conversations within assigned accounts
- Assign and reassign conversations
- View team workload
- Manage lead stages
- Manage tags
- Add and view shared notes
- Add and view restricted notes
- Create and manage follow-up tasks
- View who last handled a conversation
- Review basic operational activity

The Manager cannot see customer phone numbers, email addresses or raw WhatsApp JIDs.

The Manager cannot export client PII.

### 3.3 Staff Agent

The Staff Agent handles customer conversations.

The Staff Agent can:

- Access assigned WhatsApp accounts
- View conversations assigned to them
- View an allowed unassigned queue
- Claim an unassigned conversation when permitted
- Send messages
- Add approved tags
- Update allowed lead stages
- Add and view shared notes
- Create follow-up tasks
- Complete assigned follow-up tasks
- Use AI draft tools later

The Staff Agent cannot:

- View customer phone numbers
- View customer email addresses
- View raw WhatsApp JIDs
- View restricted notes
- View admin-only settings
- Manage users
- Manage WhatsApp accounts
- Reveal or export PII
- View secrets or authentication state
- Access conversations outside assigned accounts

---

## 4. Future roles

The following roles are not required as separate roles in the first MVP:

- Super Administrator
- Operations Engineer

For the first version:

- Admin temporarily covers privileged system administration.
- Technical operations are handled outside the normal business UI by the project owner.

These roles may be separated later when:

- More administrators are added
- Production operations become larger
- Independent security review is introduced
- Infrastructure access must be separated from business access

---

## 5. Account-access model

Role access and WhatsApp account access are separate.

A Staff Agent or Manager must not automatically gain access to every WhatsApp account.

Each user must have an explicit list of permitted accounts.

Example:

```text
User: Priya
Role: Staff Agent

Permitted accounts:
- Mana Mewa Sales
- Adora Support
```

A user cannot access:

- Accounts not assigned to them
- Conversations from unassigned accounts
- Restricted account settings
- Raw provider information

### Admin access

The Admin can manage all account records in the first MVP.

### Manager access

A Manager can access all conversations within specifically assigned accounts.

### Staff access

A Staff Agent can access:

- Conversations assigned to them
- Allowed unassigned conversations within assigned accounts
- Conversations temporarily reassigned to them

---

## 6. Conversation assignment

A conversation can have one of these simple states:

- Unassigned
- Assigned
- Closed

The first MVP does not require a complex workflow.

### Staff Agent

A Staff Agent may:

- View assigned conversations
- Claim an allowed unassigned conversation
- Send messages
- Mark work complete
- Request help from a Manager

### Manager

A Manager may:

- Assign conversations
- Reassign conversations
- Reopen closed conversations
- Review workload

### Admin

An Admin may perform all assignment actions.

---

## 7. Client identity shown to staff

Staff and Managers should see a safe internal label instead of a phone number.

Recommended default format:

```text
Client C-1042
```

An approved operational display name may also be used:

```text
Rahul — Website Enquiry
```

The display name must not include:

- Phone number
- Email address
- Raw WhatsApp JID
- Other restricted identifiers

Customer profile photos will remain hidden in the initial MVP.

---

## 8. Notes

The first MVP will use two note types.

### 8.1 Shared note

Visible to Admin, Manager and permitted Staff Agents.

Examples:

- Customer requested a quotation.
- Follow up on Friday.
- Interested in product photography.

### 8.2 Restricted note

Visible only to Admin and Manager.

Examples:

- Payment dispute under review.
- Special pricing approved.
- Sensitive complaint escalation.

Staff Agents cannot read restricted notes.

Notes must never contain:

- Passwords
- API keys
- Authentication codes
- Card details
- Encryption keys
- Baileys credentials

---

## 9. PII reveal

PII means directly identifying customer information such as:

- Phone number
- Email address
- Raw WhatsApp JID

For the first MVP, only the Admin may reveal PII.

The reveal workflow must:

1. Confirm the user is an Admin.
2. Confirm the Admin still has a valid session.
3. Require a business reason.
4. Decrypt only the requested field.
5. Create an audit record.
6. Return the response with `Cache-Control: no-store`.
7. Display the value temporarily.
8. Hide the value automatically after 60 seconds.
9. Prevent the value from entering normal logs.

Recommended reveal reasons:

- Approved callback
- Customer identity verification
- Payment or delivery issue
- Data correction request
- Legal or compliance request
- Approved business escalation
- Other reason with written explanation

---

## 10. PII export

PII export is excluded from the first MVP.

The first version will not provide a button to export customer phone numbers or other private identifiers.

PII export may be added later only after defining:

- Separate permission
- Stronger authentication
- Business reason
- Audit record
- File encryption
- Automatic expiry
- Download limits
- Retention and deletion rules

---

## 11. Data visibility matrix

| Information | Admin | Manager | Staff Agent |
|---|---:|---:|---:|
| Internal client alias | Yes | Yes, assigned accounts | Yes, allowed conversations |
| Approved display name | Yes | Yes | Yes |
| Conversation messages | Yes | Assigned accounts | Assigned/allowed conversations |
| Phone number | Reveal workflow only | No | No |
| Email address | Reveal workflow only | No | No |
| Raw WhatsApp JID | No normal UI display | No | No |
| Shared notes | Yes | Yes | Yes |
| Restricted notes | Yes | Yes | No |
| User management | Yes | No | No |
| Account management | Yes | No | No |
| Conversation assignment | Yes | Yes | Limited claim action |
| Audit records | Yes | Limited own/team activity later | Own activity only later |
| PII export | No in MVP | No | No |
| AI settings | Yes, later | No | No |
| Secrets and auth state | No normal UI display | No | No |

---

## 12. Default-deny rule

The system will follow default-deny authorization.

This means:

> If permission is missing, unclear or invalid, access is denied.

Examples:

- Missing account assignment → deny
- Disabled user → deny
- Expired session → deny
- Unknown role → deny
- Staff requesting PII → deny
- Manager requesting PII → deny
- User requesting another account's conversation → deny

---

## 13. Simple permission groups

The first implementation may use these permission groups internally.

### Admin

```text
users.manage
accounts.manage
conversations.read_all_permitted
conversations.assign
messages.send
crm.manage
notes.restricted.read
client_pii.reveal
audit.read
```

### Manager

```text
conversations.read_assigned_accounts
conversations.assign
messages.send
crm.manage
notes.restricted.read
```

### Staff Agent

```text
conversations.read_assigned
conversations.claim
messages.send
crm.basic_update
notes.shared.create
followups.manage_own
```

The exact code representation will be decided during implementation.

---

## 14. Login and session rules

The first MVP will follow these rules:

- Every user has an individual login.
- Shared staff logins are prohibited.
- Disabled users lose access.
- Role changes and account-access changes must take effect quickly.
- Password or security actions may revoke active sessions.
- Sensitive Admin actions require a valid recent session.
- MFA is not required during local development.
- MFA must be added for privileged users before production.
- User actions must be linked to the authenticated user.

---

## 15. Audit requirements

The first MVP must record at least:

- User creation
- User disablement
- Role changes
- Account-access changes
- Conversation assignment
- Conversation reassignment
- PII reveal
- WhatsApp account pause or removal
- Important security actions

Audit records should contain:

- Acting user ID
- Action
- Target type
- Target internal ID
- Timestamp
- Business reason where required
- Success or failure result

Audit records must not store raw passwords, secrets or unnecessary message content.

---

## 16. Approved simple MVP decisions

The following decisions are approved for the first version:

- Three active roles: Admin, Manager and Staff Agent
- Super Administrator and Operations Engineer deferred
- Role permissions plus explicit per-account access
- Backend privacy enforcement
- Default-deny authorization
- Staff and Managers do not receive phone numbers, emails or JIDs
- Only Admin can reveal PII
- PII reveal requires a reason and audit record
- PII auto-hides after 60 seconds
- PII export is excluded from the first MVP
- Staff see an internal client alias or approved safe display name
- Customer profile photos are hidden initially
- Two note types: Shared and Restricted
- Managers can assign and reassign conversations
- Staff can work only in assigned accounts and allowed conversations
- Shared user logins are prohibited
- MFA is required before production, not during local development

---

## 17. Future improvements

The following may be added later without changing the first MVP goal:

- Separate Super Administrator role
- Separate Operations Engineer role
- More granular permissions
- Temporary incident access
- Manager-specific PII permission
- Admin-only notes
- PII export
- Step-up authentication
- Advanced conversation sharing
- More detailed team scopes
- Profile photo policy
- Automated permission review
- Advanced audit reporting

Each improvement must be added only when there is a real need.

---

## 18. Phase 0.2 completion condition

Phase 0.2 is complete when:

- The three-role model is approved.
- Account access is separated from role access.
- Backend-enforced privacy is approved.
- Staff and Manager PII restrictions are approved.
- Admin-only PII reveal is approved.
- PII export exclusion is approved.
- Notes visibility is approved.
- Default-deny authorization is approved.
- Shared-login prohibition is approved.
- This document is accepted by the user.
