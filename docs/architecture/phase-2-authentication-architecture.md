# WAM CRM AI — Phase 2 Authentication Architecture

## Document control

| Field         | Value                                                       |
| ------------- | ----------------------------------------------------------- |
| Project       | WAM CRM AI                                                  |
| Document      | Phase 2 Authentication Architecture                         |
| Version       | 1.0                                                         |
| Status        | Approved design baseline                                    |
| Approval date | 2026-07-03                                                  |
| Phase         | Phase 2.1 — Authentication Architecture and Contract Freeze |

---

## 1. Purpose

This document freezes the backend authentication, session, role-based authorization, organization-scope, user-administration, and security-audit design for Phase 2.

No implementation package should be installed and no authentication code should be written until this architecture and the matching API contract are reviewed in the repository.

Phase 2 remains backend-first. It does not include the production React login experience.

---

## 2. Scope

Phase 2 includes:

- Organization ownership boundary
- Staff user identities
- Secure password storage
- Short-lived access tokens
- Rotating refresh sessions
- Refresh-token reuse detection
- Current-session and all-session logout
- Password changes and administrative resets
- Role-based permissions
- Permission overrides
- Account-access policy foundation
- Conversation-access policy foundation
- User administration
- Authentication and user-management audit events
- Login throttling
- Socket authentication foundation
- Postman and automated test coverage

Phase 2 excludes:

- WhatsApp account connection
- Baileys sessions
- Conversation persistence
- Message persistence or sending
- CRM screens and workflows
- Client PII reveal implementation
- Media
- AI
- Public registration
- Customer accounts
- Social login
- Forgot-password email delivery
- Production deployment

---

## 3. Approved design changes from the Phase 0 baseline

Phase 0 approved three active business roles:

```text
admin
manager
staff
```

Phase 2 adds one protected technical role:

```text
super_admin
```

This does not replace the three-role business model.

The final role model is:

- `super_admin`: protected bootstrap and security-administration role
- `admin`: highest normal business-administration role
- `manager`: assigned-account supervision role
- `staff`: Staff Agent role

The first `super_admin` is created only through the seed script. Ordinary user-management APIs cannot create another `super_admin` during the first MVP.

Phase 0 allowed Managers to read restricted notes. Phase 2 adopts the stricter rule:

```text
notes.private.read
```

is granted by default only to `super_admin` and `admin`.

This is an intentional privacy hardening decision and must not be silently reversed later.

---

## 4. Architectural style

The backend remains a JavaScript ES-module modular monolith.

Dependency direction:

```text
route
→ middleware
→ controller
→ service
→ repository/provider
```

Controllers must not contain:

- MongoDB queries
- Password hashing
- JWT implementation details
- Refresh-token rotation logic
- Authorization policy decisions
- Audit persistence details

Repositories must not contain HTTP response logic.

Serializers must return explicit safe DTOs. Mongoose documents must not be returned directly from controllers.

---

## 5. Role constants

The central role catalogue is:

```text
super_admin
admin
manager
staff
```

Role strings must be defined once in a frozen constant module and reused throughout validation, policies, tests, and seed logic.

Unknown roles are rejected.

The display label for `staff` is:

```text
Staff Agent
```

---

## 6. Permission catalogue

The approved permission catalogue is:

```text
accounts.read
accounts.manage

users.read
users.manage

conversations.read_assigned
conversations.read_all
conversations.assign

messages.send

crm.tags.manage
crm.tasks.manage

client_pii.reveal
client_pii.export

notes.private.read

ai.generate
ai.knowledge.manage

audit.read
settings.manage
```

Rules:

- Only registered permission values may be persisted.
- Unknown permission values are rejected.
- `client_pii.export` exists for architectural completeness.
- `client_pii.export` is not granted through any normal first-MVP role default.
- Permission checks are backend-enforced and default-deny.

---

## 7. Default role permissions

### 7.1 Super administrator

`super_admin` receives all registered permissions.

This account is used sparingly and is protected by special user-management rules.

### 7.2 Administrator

```text
accounts.read
accounts.manage
users.read
users.manage
conversations.read_assigned
conversations.read_all
conversations.assign
messages.send
crm.tags.manage
crm.tasks.manage
client_pii.reveal
notes.private.read
ai.generate
ai.knowledge.manage
audit.read
settings.manage
```

Not granted:

```text
client_pii.export
```

### 7.3 Manager

```text
users.read
conversations.read_assigned
conversations.read_all
conversations.assign
messages.send
crm.tags.manage
crm.tasks.manage
ai.generate
```

Not granted by default:

```text
accounts.manage
users.manage
client_pii.reveal
client_pii.export
notes.private.read
settings.manage
```

### 7.4 Staff Agent

```text
conversations.read_assigned
messages.send
crm.tasks.manage
ai.generate
```

Conversation claim and unassigned-queue permissions are deferred until the conversation module is designed.

---

## 8. Permission overrides

User records contain:

```text
permissionOverrides.allow
permissionOverrides.deny
```

Effective permissions are calculated as:

```text
role defaults
+ explicit allow overrides
- explicit deny overrides
```

A deny override wins over an allow override.

The effective-permission calculator must be a pure tested policy function.

The access token must not be treated as the permanent authority for current permissions.

---

## 9. Organization scope

Phase 2 creates one internal organization:

```text
name: Vistaar Media
slug: vistaar-media
status: active
```

The following records contain `organizationId`:

```text
User
RefreshSession
AuditLog
```

Organization scope is an ownership boundary. It does not create public multi-tenancy or SaaS registration.

Cross-organization access is always denied.

---

## 10. Account-access policy foundation

User account-scope fields:

```text
accountAccessMode: all | selected
accountAccess: [internal account ObjectIds]
```

Approved defaults:

```text
super_admin → all
admin → all by default; may be configured as selected
manager → selected
staff → selected
```

Authorization uses internal account IDs only.

Authorization must never use:

- Phone numbers
- WhatsApp JIDs
- Account display names
- Provider identifiers exposed to clients

Phase 2 tests use synthetic ObjectIds because the WhatsApp account model is not created yet.

Conceptual policy:

```text
canAccessAccount(userContext, account)
```

It checks:

1. User is active.
2. Organization matches.
3. `accountAccessMode` is valid.
4. Selected access includes the account when required.
5. Unknown or incomplete state is denied.

---

## 11. Conversation-access policy foundation

Phase 2 defines and tests a pure policy without creating a conversation repository.

Conceptual policy:

```text
canReadConversation(userContext, conversation)
```

Approved rules:

```text
super_admin
→ organizational conversations in permitted accounts

admin
→ conversations in permitted accounts

manager
→ conversations in permitted accounts

staff
→ assigned conversations in permitted accounts
```

Evaluation order:

1. User status must be active.
2. Organization must match.
3. Account access must succeed.
4. Role and assignment rule must succeed.
5. Anything unclear is denied.

The Staff unassigned queue and claim workflow remain deferred.

---

## 12. Password policy

Approved password rules:

```text
Minimum length: 12 characters
Maximum length: 128 characters
No leading whitespace
No trailing whitespace
No silent truncation
```

Implementation direction:

```text
bcryptjs
BCRYPT_ROUNDS=12
```

`BCRYPT_ROUNDS` remains configurable and must be performance-tested on the development machine.

Passwords and password hashes must never appear in:

- API responses
- Logs
- Audit metadata
- Git
- Evidence documents
- Exception messages

The `passwordHash` model field must be excluded by default using:

```text
select: false
```

A dedicated password service performs validation, hashing, and comparison.

---

## 13. Access-token design

The access token is a short-lived JWT.

Approved lifetime:

```text
15 minutes
```

Approved claims:

```text
sub: user ID
sid: refresh-session ID
org: organization ID
type: access
jti: unique token ID
```

The token must not be trusted as the final authority for role, permissions, account scope, user status, or session status.

Every authenticated request loads current user and session state so that:

- Disabled users lose access immediately.
- Revoked sessions lose access immediately.
- Permission changes take effect immediately.
- Role changes take effect immediately.
- Account-access changes take effect immediately.

---

## 14. Refresh-token design

The refresh token is a high-entropy opaque random token.

Approved expiry:

```text
30 days
```

Storage rules:

- Plaintext refresh token exists only long enough to set the cookie.
- MongoDB stores only the SHA-256 hash.
- The token is never returned in a JSON response.
- The token is never logged.
- The token is never stored in localStorage or sessionStorage.

Approved cookie settings:

```text
name: wam_refresh
httpOnly: true
sameSite: lax
secure: false in local development
secure: true in production
path: /api/v1/auth
```

Future frontend behavior:

- Access token remains in application memory.
- Refresh token remains in the HttpOnly cookie.

---

## 15. Refresh rotation

Every successful refresh must:

1. Read the refresh cookie.
2. Hash the presented token.
3. Locate the matching refresh session.
4. Confirm the user, organization, session status, and expiry.
5. Atomically claim and rotate the existing session.
6. Mark the old session as rotated.
7. Generate a new opaque refresh token.
8. Create a replacement session in the same family.
9. Link the old session to the replacement.
10. Set a new HttpOnly cookie.
11. Issue a new access token.
12. Audit the successful refresh.

The old token must not remain usable.

---

## 16. Refresh-token reuse detection

When a rotated refresh token is presented again:

1. Treat the event as possible token theft.
2. Revoke the entire session family.
3. Mark the affected family compromised.
4. Record `AUTH_REFRESH_REUSE_DETECTED`.
5. Clear the refresh cookie where possible.
6. Deny the request.
7. Require a new login.

Public error code:

```text
AUTH_REFRESH_REUSE_DETECTED
```

Concurrent refresh testing must prove that one old token cannot create two valid replacement branches.

---

## 17. Session lifecycle

Approved refresh-session statuses:

```text
active
rotated
revoked
expired
compromised
```

Current-session logout:

- Revokes the current refresh session.
- Clears the refresh cookie.
- Makes access tokens linked to that session unusable.

Logout all:

- Revokes every active session for the current user.
- Clears the current refresh cookie.
- Requires login again on every device.

Own-session revocation:

- A user may revoke only one of their own sessions.
- Administrative session revocation requires `users.manage`.

Session evidence is not deleted immediately unless a later approved retention rule requires it.

---

## 18. Password-change and password-reset behavior

### 18.1 User password change

The user password-change workflow:

1. Verifies the current password.
2. Validates the new password.
3. Hashes the new password.
4. Updates `passwordChangedAt`.
5. Clears `mustChangePassword`.
6. Revokes other sessions.
7. Replaces or safely rotates the current session.
8. Audits `AUTH_PASSWORD_CHANGED`.

### 18.2 Administrative password reset

Administrative reset:

1. Requires `users.manage`.
2. Enforces user-management policy.
3. Validates and hashes the temporary password.
4. Sets `mustChangePassword: true`.
5. Updates `passwordChangedAt`.
6. Revokes all target-user sessions.
7. Audits actor and target.
8. Never returns the temporary password.

---

## 19. Disabled-user behavior

A disabled user is rejected during:

- Login
- Access-token authentication
- Refresh
- Socket authentication
- Authorization policy evaluation

Disabling a user revokes all active sessions.

---

## 20. User-management boundaries

### 20.1 Super administrator

May:

- Create Admin, Manager, and Staff users
- Manage allowed user fields
- Revoke sessions
- Disable and enable users
- Manage permission overrides
- Manage account-access assignments

### 20.2 Administrator

May:

- Create Manager and Staff users
- Manage Manager and Staff users
- Revoke Manager and Staff sessions
- Disable and enable Manager and Staff users

May not:

- Create a `super_admin`
- Promote a user to `super_admin`
- Modify a `super_admin`
- Disable a `super_admin`
- Promote themselves to `super_admin`

### 20.3 Manager

May read the safe staff directory when `users.read` is granted.

May not:

- Create users
- Change roles
- Reset passwords
- Disable users
- Revoke another user's sessions

### 20.4 Staff

May not use administrative user APIs.

---

## 21. Super-admin protections

Required safeguards:

- The final active `super_admin` cannot be disabled.
- A `super_admin` cannot remove the last active privileged access accidentally.
- Ordinary APIs cannot create another `super_admin` initially.
- The first `super_admin` is created only through the seed script.
- An Admin cannot modify a `super_admin`.
- `/auth/me` cannot change role, permissions, status, or account scope.

---

## 22. Models created in Phase 2

Phase 2 creates only:

```text
Organization
User
RefreshSession
AuditLog
```

Phase 2 does not create:

```text
WhatsAppAccount
Conversation
Message
Contact
CRM Lead
Media
AI models
```

### 22.1 Organization

Fields:

```text
name
slug
status
createdAt
updatedAt
```

Required unique index:

```text
slug
```

### 22.2 User

Fields:

```text
organizationId
name
email
passwordHash
role
permissionOverrides.allow
permissionOverrides.deny
accountAccessMode
accountAccess
status
mustChangePassword
passwordChangedAt
lastLoginAt
createdBy
updatedBy
createdAt
updatedAt
```

Indexes:

```text
{ organizationId: 1, email: 1 } unique
{ organizationId: 1, role: 1, status: 1 }
```

Email normalization:

```text
trim
lowercase
```

### 22.3 RefreshSession

Fields:

```text
organizationId
userId
familyId
tokenHash
status
createdAt
expiresAt
lastUsedAt
rotatedAt
revokedAt
revokeReason
replacedBySessionId
createdByIp
lastUsedByIp
userAgent
reuseDetectedAt
```

Indexes:

```text
tokenHash unique
userId + status + expiresAt
familyId
expiresAt
```

### 22.4 AuditLog

Fields:

```text
organizationId
eventType
actorId
targetUserId
sessionId
outcome
reasonCode
requestId
ipAddress
userAgent
metadata
createdAt
```

Audit logs must not contain:

- Password
- Password hash
- Access token
- Refresh token
- Refresh-token hash
- Cookie contents
- Authorization header
- Secret keys
- Full request body

No update or delete API exists for audit logs.

---

## 23. Audit events

Approved Phase 2 audit event catalogue:

```text
AUTH_LOGIN_SUCCEEDED
AUTH_LOGIN_FAILED
AUTH_LOGIN_RATE_LIMITED
AUTH_REFRESH_SUCCEEDED
AUTH_REFRESH_FAILED
AUTH_REFRESH_REUSE_DETECTED
AUTH_LOGOUT
AUTH_LOGOUT_ALL
AUTH_SESSION_REVOKED
AUTH_PASSWORD_CHANGED

USER_CREATED
USER_UPDATED
USER_ENABLED
USER_DISABLED
USER_PASSWORD_RESET
USER_SESSIONS_REVOKED
USER_PERMISSION_CHANGED
USER_ACCOUNT_ACCESS_CHANGED
```

Audit event strings must be centralized constants.

---

## 24. Authentication middleware

### 24.1 `requireAuth`

Responsibilities:

1. Read the Bearer access token.
2. Verify JWT signature.
3. Verify token type.
4. Validate required claims.
5. Load the current user.
6. Confirm the user is active.
7. Load the current session using `sid`.
8. Confirm the session is active and unexpired.
9. Confirm organization IDs match.
10. Calculate effective permissions.
11. Build a safe request authentication context.
12. Continue or return a safe error.

Approved context:

```text
req.auth = {
  userId,
  sessionId,
  organizationId,
  role,
  permissions,
  accountAccessMode,
  accountAccess
}
```

The full User document should not be attached unnecessarily.

### 24.2 `requirePermission`

Conceptual usage:

```text
requirePermission(PERMISSIONS.USERS_MANAGE)
```

Behavior:

- Requires an authentication context.
- Checks effective permissions.
- Denies by default.
- Returns `FORBIDDEN`.
- Does not reveal internal policy details.

---

## 25. Socket authentication foundation

Phase 2 creates reusable socket authentication middleware only.

It must:

1. Extract the short-lived access token from the Socket.IO handshake.
2. Use the same access-token and current-state authentication service as REST.
3. Load current user and current session.
4. Reject disabled users.
5. Reject revoked or expired sessions.
6. Build a safe socket authentication context.
7. Ignore client-provided role and permission values.
8. Join no rooms during Phase 2.

Account and conversation room authorization belongs to a later phase.

---

## 26. Request IDs and errors

Every request receives a request ID generated with:

```text
crypto.randomUUID()
```

The request ID must be:

- Returned in `X-Request-Id`
- Included in safe errors
- Included in audit events
- Included in structured logs

Standard error shape:

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "You do not have permission to perform this action.",
    "details": null,
    "requestId": "request-id"
  }
}
```

Production responses must not expose:

- Stack traces
- MongoDB errors
- JWT verification internals
- Password-validation internals
- Token values
- User existence during login
- Sensitive audit metadata

---

## 27. Login throttling

Approved initial limits:

```text
Per IP:
20 failed attempts per 15 minutes

Per normalized email + IP:
5 failed attempts per 15 minutes
```

Redis is the required shared backing store.

Requirements:

- Rate-limit keys should avoid storing plaintext email where practical.
- Wrong email and wrong password remain indistinguishable.
- A successful login may clear or reduce the email-plus-IP failure count.
- Rate-limited responses use HTTP 429.
- Repeated and rate-limited attempts are audited.
- The design must not permanently lock an account because an attacker knows its email.

A local-only in-memory limiter cannot be considered production-ready.

---

## 28. Seed-super-admin design

Required command:

```text
npm run seed:super-admin --workspace backend
```

Environment variables:

```text
SEED_ORGANIZATION_NAME
SEED_ORGANIZATION_SLUG
SEED_SUPER_ADMIN_NAME
SEED_SUPER_ADMIN_EMAIL
SEED_SUPER_ADMIN_PASSWORD
```

The seed script must:

1. Validate all required inputs.
2. Reject weak passwords.
3. Connect to MongoDB.
4. Create or find the organization.
5. Check whether the super administrator already exists.
6. Create the user only when absent.
7. Hash the password.
8. Never print the password.
9. Close the database connection.
10. Exit with a meaningful status code.

The script is idempotent and must not silently reset an existing password.

---

## 29. Test isolation

MongoDB tests use a dedicated database such as:

```text
wam_test
```

A destructive cleanup guard must refuse to run unless the database name ends with:

```text
_test
```

Redis tests use a dedicated database number or namespace, for example:

```text
redis://localhost:6379/15
```

Tests must not call `FLUSHALL` on a shared Redis instance.

Test users use `.test` email addresses and synthetic names.

No real phone numbers, client data, WhatsApp numbers, or provider credentials may be used.

---

## 30. MFA status

MFA is not implemented insecurely during Phase 2.

Approved status:

```text
Deferred until encrypted secret storage is available.
Mandatory production blocker for super administrators.
Strongly required for administrators before production.
```

No plaintext TOTP secret and no fake MFA checkbox may be added.

Phase 2 sign-off must state honestly that privileged MFA remains a production blocker unless it has been implemented securely by then.

---

## 31. Environment baseline

Phase 2 implementation will add variables for:

```text
MONGODB_URI
REDIS_URL
JWT_ACCESS_SECRET
JWT_ACCESS_EXPIRES_IN
BCRYPT_ROUNDS
REFRESH_TOKEN_EXPIRES_DAYS
REFRESH_COOKIE_NAME
COOKIE_SECURE
COOKIE_SAME_SITE
SEED_ORGANIZATION_NAME
SEED_ORGANIZATION_SLUG
SEED_SUPER_ADMIN_NAME
SEED_SUPER_ADMIN_EMAIL
SEED_SUPER_ADMIN_PASSWORD
LOGIN_RATE_LIMIT_WINDOW_SECONDS
LOGIN_RATE_LIMIT_MAX_IP
LOGIN_RATE_LIMIT_MAX_EMAIL_IP
```

Real values must never be committed.

Tests use separate test configuration.

---

## 32. Implementation sequence after this document

After this architecture and the API contract are committed and reviewed, implementation proceeds one subpart at a time:

```text
Phase 2.2 — MongoDB and Redis application connections
Phase 2.3 — Organization, User, RefreshSession and AuditLog models
Phase 2.4 — Password and token utility services
Phase 2.5 — Seed organization and super administrator
Phase 2.6 — Login and current-user endpoint
Phase 2.7 — Refresh rotation and reuse detection
Phase 2.8 — Logout, session management and password change
Phase 2.9 — RBAC and authorization policies
Phase 2.10 — Administrative user APIs
Phase 2.11 — Socket authentication foundation
Phase 2.12 — Audit verification and log redaction
Phase 2.13 — Postman collection
Phase 2.14 — Automated test suite and CI
Phase 2.15 — Documentation, clean-clone verification and sign-off
```

No later subpart starts until the current subpart is tested and explicitly confirmed complete.

---

## 33. Architecture approval result

**Result: APPROVED**

This document is the frozen Phase 2 authentication architecture baseline.

Any later change must be documented rather than silently replacing this design.
