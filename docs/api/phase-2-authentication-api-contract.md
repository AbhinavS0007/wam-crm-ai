# WAM CRM AI — Phase 2 Authentication API Contract

## Document control

| Field         | Value                                                       |
| ------------- | ----------------------------------------------------------- |
| Project       | WAM CRM AI                                                  |
| Document      | Phase 2 Authentication API Contract                         |
| Version       | 1.0                                                         |
| Status        | Approved design baseline                                    |
| Approval date | 2026-07-03                                                  |
| Phase         | Phase 2.1 — Authentication Architecture and Contract Freeze |
| Base path     | `/api/v1`                                                   |

---

## 1. Purpose

This document freezes the Phase 2 REST authentication and user-administration contract before implementation.

It defines:

- Route names
- Authentication requirements
- Permission requirements
- Request bodies
- Safe response shapes
- Cookie behavior
- Error codes
- Pagination and filtering direction

The implementation may add internal fields, services, repositories, and validation details, but it must not silently change the public contract.

---

## 2. General response rules

### 2.1 Successful response shape

Single-resource responses use:

```json
{
  "data": {},
  "meta": {
    "requestId": "request-id"
  }
}
```

List responses use:

```json
{
  "data": [],
  "meta": {
    "requestId": "request-id",
    "page": 1,
    "limit": 20,
    "total": 0,
    "totalPages": 0
  }
}
```

### 2.2 Error response shape

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

Validation errors may place safe field-level information in `details`.

Sensitive values must never appear in errors.

### 2.3 Request ID

Every response returns:

```text
X-Request-Id: <request-id>
```

The same ID appears in the response body metadata or error body.

### 2.4 Content type

JSON APIs use:

```text
Content-Type: application/json
```

The refresh token is delivered only through an HttpOnly cookie.

---

## 3. Authentication headers

Protected REST routes require:

```text
Authorization: Bearer <access-token>
```

The access token is short-lived.

The backend verifies current user and current refresh-session state on every authenticated request.

Role or permission values supplied by the client are never trusted.

---

## 4. Refresh cookie

Approved cookie:

```text
name: wam_refresh
httpOnly: true
sameSite: lax
secure: false locally
secure: true in production
path: /api/v1/auth
```

The refresh token:

- Is not returned in JSON.
- Is not exposed to browser JavaScript.
- Is not stored in localStorage or sessionStorage.
- Is stored in MongoDB only as a SHA-256 hash.

---

## 5. Safe user DTO

Authentication responses may include this safe user shape:

```json
{
  "id": "internal-user-id",
  "organizationId": "internal-organization-id",
  "name": "Synthetic Staff",
  "email": "staff@example.test",
  "role": "staff",
  "permissions": [
    "conversations.read_assigned",
    "messages.send",
    "crm.tasks.manage",
    "ai.generate"
  ],
  "accountAccessMode": "selected",
  "accountAccess": [],
  "status": "active",
  "mustChangePassword": false,
  "lastLoginAt": "2026-07-03T10:00:00.000Z",
  "createdAt": "2026-07-03T09:00:00.000Z",
  "updatedAt": "2026-07-03T10:00:00.000Z"
}
```

It must not include:

- `passwordHash`
- Refresh-token data
- Session token hashes
- Secret values
- Hidden provider data
- Raw database internals

---

# Authentication API

## 6. Login

```text
POST /api/v1/auth/login
```

Authentication:

```text
Public
```

Request:

```json
{
  "email": "admin@example.test",
  "password": "synthetic-test-password"
}
```

Validation:

- Email is required and normalized.
- Password is required.
- The login response must not reveal whether the email exists.

Success:

```text
HTTP 200
```

```json
{
  "data": {
    "accessToken": "short-lived-access-token",
    "user": {
      "id": "internal-user-id",
      "organizationId": "internal-organization-id",
      "name": "Test Admin",
      "email": "admin@example.test",
      "role": "admin",
      "permissions": [],
      "accountAccessMode": "all",
      "accountAccess": [],
      "status": "active",
      "mustChangePassword": false,
      "lastLoginAt": "2026-07-03T10:00:00.000Z",
      "createdAt": "2026-07-03T09:00:00.000Z",
      "updatedAt": "2026-07-03T10:00:00.000Z"
    }
  },
  "meta": {
    "requestId": "request-id"
  }
}
```

Side effects:

- Creates a refresh session.
- Sets the HttpOnly refresh cookie.
- Updates `lastLoginAt`.
- Audits successful login.

Failure behavior:

Wrong email and wrong password both return:

```text
HTTP 401
AUTH_INVALID_CREDENTIALS
```

Disabled user:

```text
HTTP 403
AUTH_USER_DISABLED
```

Rate limited:

```text
HTTP 429
AUTH_RATE_LIMITED
```

Validation failure:

```text
HTTP 400
VALIDATION_FAILED
```

---

## 7. Refresh access

```text
POST /api/v1/auth/refresh
```

Authentication input:

```text
HttpOnly refresh cookie
```

Request body:

```text
None
```

Success:

```text
HTTP 200
```

```json
{
  "data": {
    "accessToken": "new-short-lived-access-token",
    "user": {
      "id": "internal-user-id",
      "organizationId": "internal-organization-id",
      "name": "Synthetic Staff",
      "email": "staff@example.test",
      "role": "staff",
      "permissions": [],
      "accountAccessMode": "selected",
      "accountAccess": [],
      "status": "active",
      "mustChangePassword": false,
      "lastLoginAt": "2026-07-03T10:00:00.000Z",
      "createdAt": "2026-07-03T09:00:00.000Z",
      "updatedAt": "2026-07-03T10:00:00.000Z"
    }
  },
  "meta": {
    "requestId": "request-id"
  }
}
```

Side effects:

- Atomically rotates the refresh session.
- Sets a replacement refresh cookie.
- Audits successful refresh.

Possible errors:

```text
HTTP 401 AUTH_REFRESH_INVALID
HTTP 401 AUTH_REFRESH_EXPIRED
HTTP 401 AUTH_SESSION_REVOKED
HTTP 403 AUTH_USER_DISABLED
HTTP 401 AUTH_REFRESH_REUSE_DETECTED
```

A reuse event revokes the entire session family.

---

## 8. Logout current session

```text
POST /api/v1/auth/logout
```

Authentication:

```text
Bearer access token
```

Behavior:

- Revokes the current server-side session.
- Clears the refresh cookie.
- Audits logout.
- Makes access tokens linked to this session unusable.

Success:

```text
HTTP 204
```

Response body:

```text
None
```

The operation should remain safe when the cookie has already been cleared but the authenticated session still exists.

---

## 9. Logout all sessions

```text
POST /api/v1/auth/logout-all
```

Authentication:

```text
Bearer access token
```

Behavior:

- Revokes all active sessions for the current user.
- Clears the current refresh cookie.
- Audits `AUTH_LOGOUT_ALL`.

Success:

```text
HTTP 204
```

Response body:

```text
None
```

After success, all devices must log in again.

---

## 10. Current user

```text
GET /api/v1/auth/me
```

Authentication:

```text
Bearer access token
```

Success:

```text
HTTP 200
```

```json
{
  "data": {
    "user": {
      "id": "internal-user-id",
      "organizationId": "internal-organization-id",
      "name": "Synthetic Staff",
      "email": "staff@example.test",
      "role": "staff",
      "permissions": [
        "conversations.read_assigned",
        "messages.send",
        "crm.tasks.manage",
        "ai.generate"
      ],
      "accountAccessMode": "selected",
      "accountAccess": [],
      "status": "active",
      "mustChangePassword": false,
      "lastLoginAt": "2026-07-03T10:00:00.000Z",
      "createdAt": "2026-07-03T09:00:00.000Z",
      "updatedAt": "2026-07-03T10:00:00.000Z"
    }
  },
  "meta": {
    "requestId": "request-id"
  }
}
```

The response uses current database state, not stale authorization claims embedded in the access token.

---

## 11. Change password

```text
POST /api/v1/auth/change-password
```

Authentication:

```text
Bearer access token
```

Request:

```json
{
  "currentPassword": "current-long-password",
  "newPassword": "new-long-password"
}
```

Behavior:

- Verifies the current password.
- Validates the new password.
- Updates password hash and `passwordChangedAt`.
- Clears `mustChangePassword`.
- Revokes other sessions.
- Safely replaces or rotates the current session.
- Audits `AUTH_PASSWORD_CHANGED`.

Success:

```text
HTTP 200
```

```json
{
  "data": {
    "accessToken": "replacement-access-token",
    "user": {
      "id": "internal-user-id",
      "organizationId": "internal-organization-id",
      "name": "Synthetic Staff",
      "email": "staff@example.test",
      "role": "staff",
      "permissions": [],
      "accountAccessMode": "selected",
      "accountAccess": [],
      "status": "active",
      "mustChangePassword": false,
      "lastLoginAt": "2026-07-03T10:00:00.000Z",
      "createdAt": "2026-07-03T09:00:00.000Z",
      "updatedAt": "2026-07-03T10:30:00.000Z"
    }
  },
  "meta": {
    "requestId": "request-id"
  }
}
```

A replacement refresh cookie is set.

Possible errors:

```text
HTTP 401 AUTH_INVALID_CREDENTIALS
HTTP 400 VALIDATION_FAILED
HTTP 401 AUTH_SESSION_REVOKED
```

---

## 12. List own sessions

```text
GET /api/v1/auth/sessions
```

Authentication:

```text
Bearer access token
```

Success:

```text
HTTP 200
```

```json
{
  "data": [
    {
      "id": "internal-session-id",
      "createdAt": "2026-07-03T09:00:00.000Z",
      "lastUsedAt": "2026-07-03T10:00:00.000Z",
      "expiresAt": "2026-08-02T09:00:00.000Z",
      "status": "active",
      "userAgent": "Safari on macOS",
      "current": true
    }
  ],
  "meta": {
    "requestId": "request-id"
  }
}
```

Must not include:

- Refresh token
- Token hash
- Access token
- Cookie data
- Raw authorization headers

---

## 13. Revoke one own session

```text
DELETE /api/v1/auth/sessions/:sessionId
```

Authentication:

```text
Bearer access token
```

Rules:

- A user may revoke only their own session.
- Revoking the current session clears the refresh cookie.
- Revoking another device leaves the current session active.

Success:

```text
HTTP 204
```

Possible errors:

```text
HTTP 404 USER_SESSION_NOT_FOUND
HTTP 403 FORBIDDEN
```

---

# User Administration API

## 14. List users

```text
GET /api/v1/users
```

Authentication:

```text
Bearer access token
```

Permission:

```text
users.read
```

Supported query parameters:

```text
role
status
search
page
limit
```

Defaults:

```text
page=1
limit=20
```

Maximum:

```text
limit=100
```

Organization scope is mandatory.

Success:

```text
HTTP 200
```

```json
{
  "data": [
    {
      "id": "internal-user-id",
      "organizationId": "internal-organization-id",
      "name": "Synthetic Staff",
      "email": "staff@example.test",
      "role": "staff",
      "permissionOverrides": {
        "allow": [],
        "deny": []
      },
      "accountAccessMode": "selected",
      "accountAccess": [],
      "status": "active",
      "mustChangePassword": true,
      "lastLoginAt": null,
      "createdAt": "2026-07-03T09:00:00.000Z",
      "updatedAt": "2026-07-03T09:00:00.000Z"
    }
  ],
  "meta": {
    "requestId": "request-id",
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

Manager access, when allowed by `users.read`, returns only the approved safe directory fields. It does not grant user-management authority.

---

## 15. Get one user

```text
GET /api/v1/users/:id
```

Authentication:

```text
Bearer access token
```

Permission:

```text
users.read
```

Rules:

- Organization scope must match.
- Response is a safe administrative user DTO.
- Manager responses may be reduced to safe directory fields if required by serializer policy.

Success:

```text
HTTP 200
```

Possible errors:

```text
HTTP 404 USER_NOT_FOUND
HTTP 403 FORBIDDEN
```

---

## 16. Create user

```text
POST /api/v1/users
```

Authentication:

```text
Bearer access token
```

Permission:

```text
users.manage
```

Request:

```json
{
  "name": "Synthetic Staff",
  "email": "staff@example.test",
  "temporaryPassword": "long-synthetic-password",
  "role": "staff",
  "accountAccessMode": "selected",
  "accountAccess": [],
  "permissionOverrides": {
    "allow": [],
    "deny": []
  }
}
```

Rules:

- `super_admin` cannot be created through this API.
- Admin may create only Manager and Staff users.
- Super administrator may create Admin, Manager, and Staff users.
- Email is normalized.
- Duplicate email is rejected safely.
- Temporary password is validated and hashed.
- `mustChangePassword` is set to `true`.
- Unknown permissions are rejected.
- Actor and target are audited.
- Temporary password is never returned.

Success:

```text
HTTP 201
```

```json
{
  "data": {
    "user": {
      "id": "internal-user-id",
      "organizationId": "internal-organization-id",
      "name": "Synthetic Staff",
      "email": "staff@example.test",
      "role": "staff",
      "permissionOverrides": {
        "allow": [],
        "deny": []
      },
      "accountAccessMode": "selected",
      "accountAccess": [],
      "status": "active",
      "mustChangePassword": true,
      "lastLoginAt": null,
      "createdAt": "2026-07-03T09:00:00.000Z",
      "updatedAt": "2026-07-03T09:00:00.000Z"
    }
  },
  "meta": {
    "requestId": "request-id"
  }
}
```

Possible errors:

```text
HTTP 409 USER_EMAIL_EXISTS
HTTP 403 USER_ROLE_NOT_ALLOWED
HTTP 400 VALIDATION_FAILED
HTTP 403 FORBIDDEN
```

---

## 17. Update user

```text
PATCH /api/v1/users/:id
```

Authentication:

```text
Bearer access token
```

Permission:

```text
users.manage
```

Allowed fields:

```text
name
role
status
permissionOverrides
accountAccessMode
accountAccess
```

Example request:

```json
{
  "name": "Updated Synthetic Staff",
  "status": "disabled",
  "permissionOverrides": {
    "allow": [],
    "deny": ["ai.generate"]
  },
  "accountAccessMode": "selected",
  "accountAccess": ["synthetic-account-object-id"]
}
```

Rules:

- Arbitrary database fields are rejected.
- Admin cannot modify a `super_admin`.
- Admin cannot promote a user to `super_admin`.
- A user cannot use this route to change their own role or permissions outside policy.
- Disabling a user revokes all active sessions.
- The final active `super_admin` cannot be disabled.
- Permission and account-access changes are audited distinctly.
- Unknown permissions are rejected.

Success:

```text
HTTP 200
```

```json
{
  "data": {
    "user": {
      "id": "internal-user-id",
      "organizationId": "internal-organization-id",
      "name": "Updated Synthetic Staff",
      "email": "staff@example.test",
      "role": "staff",
      "permissionOverrides": {
        "allow": [],
        "deny": ["ai.generate"]
      },
      "accountAccessMode": "selected",
      "accountAccess": ["synthetic-account-object-id"],
      "status": "disabled",
      "mustChangePassword": true,
      "lastLoginAt": null,
      "createdAt": "2026-07-03T09:00:00.000Z",
      "updatedAt": "2026-07-03T10:00:00.000Z"
    }
  },
  "meta": {
    "requestId": "request-id"
  }
}
```

Possible errors:

```text
HTTP 404 USER_NOT_FOUND
HTTP 403 USER_ROLE_NOT_ALLOWED
HTTP 409 USER_LAST_SUPER_ADMIN
HTTP 400 VALIDATION_FAILED
HTTP 403 FORBIDDEN
```

---

## 18. Administrative password reset

```text
POST /api/v1/users/:id/reset-password
```

Authentication:

```text
Bearer access token
```

Permission:

```text
users.manage
```

Request:

```json
{
  "temporaryPassword": "new-long-temporary-password"
}
```

Behavior:

- Enforces user-management policy.
- Validates and hashes the password.
- Sets `mustChangePassword: true`.
- Updates `passwordChangedAt`.
- Revokes all target-user sessions.
- Audits actor and target.
- Never returns the password.

Success:

```text
HTTP 204
```

Possible errors:

```text
HTTP 404 USER_NOT_FOUND
HTTP 403 USER_ROLE_NOT_ALLOWED
HTTP 400 VALIDATION_FAILED
HTTP 403 FORBIDDEN
```

---

## 19. Administrative session revocation

```text
POST /api/v1/users/:id/revoke-sessions
```

Authentication:

```text
Bearer access token
```

Permission:

```text
users.manage
```

Behavior:

- Enforces user-management policy.
- Revokes all active sessions belonging to the target.
- Audits actor and target.

Success:

```text
HTTP 204
```

Possible errors:

```text
HTTP 404 USER_NOT_FOUND
HTTP 403 USER_ROLE_NOT_ALLOWED
HTTP 403 FORBIDDEN
```

---

## 20. No hard-delete endpoint

Phase 2 provides no route such as:

```text
DELETE /api/v1/users/:id
```

Users are disabled instead of deleted so future message, note, and audit ownership remains understandable.

---

# Errors and status codes

## 21. Approved error catalogue

```text
AUTH_REQUIRED
AUTH_INVALID_TOKEN
AUTH_INVALID_CREDENTIALS
AUTH_USER_DISABLED
AUTH_SESSION_REVOKED
AUTH_REFRESH_INVALID
AUTH_REFRESH_EXPIRED
AUTH_REFRESH_REUSE_DETECTED
AUTH_PASSWORD_CHANGE_REQUIRED
AUTH_RATE_LIMITED

FORBIDDEN
VALIDATION_FAILED

USER_NOT_FOUND
USER_EMAIL_EXISTS
USER_ROLE_NOT_ALLOWED
USER_LAST_SUPER_ADMIN
USER_SESSION_NOT_FOUND
```

---

## 22. Recommended HTTP mapping

| Error code                      | HTTP status |
| ------------------------------- | ----------: |
| `AUTH_REQUIRED`                 |         401 |
| `AUTH_INVALID_TOKEN`            |         401 |
| `AUTH_INVALID_CREDENTIALS`      |         401 |
| `AUTH_USER_DISABLED`            |         403 |
| `AUTH_SESSION_REVOKED`          |         401 |
| `AUTH_REFRESH_INVALID`          |         401 |
| `AUTH_REFRESH_EXPIRED`          |         401 |
| `AUTH_REFRESH_REUSE_DETECTED`   |         401 |
| `AUTH_PASSWORD_CHANGE_REQUIRED` |         403 |
| `AUTH_RATE_LIMITED`             |         429 |
| `FORBIDDEN`                     |         403 |
| `VALIDATION_FAILED`             |         400 |
| `USER_NOT_FOUND`                |         404 |
| `USER_EMAIL_EXISTS`             |         409 |
| `USER_ROLE_NOT_ALLOWED`         |         403 |
| `USER_LAST_SUPER_ADMIN`         |         409 |
| `USER_SESSION_NOT_FOUND`        |         404 |

The implementation may refine a status only through an explicit contract update and review.

---

## 23. Safe public messages

Examples:

```text
AUTH_INVALID_CREDENTIALS
Invalid email or password.

AUTH_REQUIRED
Authentication is required.

AUTH_INVALID_TOKEN
The access token is invalid or expired.

AUTH_SESSION_REVOKED
This session is no longer active.

AUTH_USER_DISABLED
This user account is disabled.

AUTH_RATE_LIMITED
Too many login attempts. Please try again later.

FORBIDDEN
You do not have permission to perform this action.

VALIDATION_FAILED
The request contains invalid data.

USER_EMAIL_EXISTS
A user with this email already exists.
```

Login messages must not reveal whether an email exists.

Internal policy reasons must not be exposed unnecessarily.

---

## 24. Cache and privacy headers

Normal authentication and user-administration responses should avoid unnecessary caching.

PII reveal is not implemented in Phase 2.

Future PII reveal responses must use:

```text
Cache-Control: no-store
```

Tokens, cookies, authorization headers, passwords, and password-reset request bodies must be redacted from logs.

---

## 25. CORS and credential direction

The future frontend must send refresh requests with credentials enabled.

Backend CORS must use the approved frontend origin and allow credentials only for trusted origins.

Wildcard origin must not be combined with credentialed cookies.

Exact implementation occurs in the relevant Phase 2 subpart.

---

## 26. Postman direction

The Phase 2 Postman collection will:

- Use synthetic `.test` users.
- Save access tokens only in the local Postman environment.
- Use the Postman cookie jar for the refresh cookie.
- Test wrong-email and wrong-password equivalence.
- Test refresh rotation.
- Test refresh-token reuse detection.
- Test current logout and logout all.
- Test own-session revocation.
- Test role boundaries.
- Test super-admin protections.
- Commit no real credentials.

---

## 27. Contract exclusions

This contract does not authorize:

- Public signup
- Customer authentication
- Social login
- Forgot-password email delivery
- WhatsApp account APIs
- Conversation APIs
- Message APIs
- CRM APIs
- PII reveal APIs
- AI APIs
- Production deployment

---

## 28. Contract approval result

**Result: APPROVED**

This document is the frozen Phase 2 authentication and user-administration API baseline.

Any later contract change must be documented and reviewed rather than silently implemented.
