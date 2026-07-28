# Phase 15 — Team management & role-based logins

Signing in as **admin / manager / staff** and seeing the app behave differently per role.

## Starting point

The backend already had everything except a way to reach it: four roles
(`src/constants/roles.js`), the permission matrix (`DEFAULT_ROLE_PERMISSIONS`), and the full
permission-gated user CRUD API (`src/modules/users/user.routes.js`) with audit logging.

Two gaps blocked using it:

1. **No frontend.** No Team page and no user API wrappers, so the only account that existed was
   the seeded super admin — a manager or staff user could not be created without calling the API
   by hand.
2. **Created users were stuck with the admin's password.** `mustChangePassword` was stored and
   serialized but **never enforced anywhere**, and there was **no endpoint** for a user to change
   their own password.

## What was built

### Self-service password change — `POST /api/v1/auth/change-password`

Verifies the current password, applies the password policy, refuses reuse of the current
password, clears `mustChangePassword`, and stamps `passwordChangedAt`. Reuses
`verifyPassword` / `validatePlainPassword` / `hashPassword` from `password.service.js`.

Two details worth noting:

- `req.auth.user` is loaded **without** `passwordHash`, so the service re-reads the user with
  `includePasswordHash: true`. Without this the verification would have failed for everyone.
- All _other_ sessions are revoked so the old password cannot keep a login alive, but the
  **current** session is kept (new `exceptSessionId` option on
  `revokeActiveRefreshSessionsForUser`). Otherwise satisfying a forced change would immediately
  bounce the user back to the login screen.

### Server-side enforcement — `requirePasswordChanged`

New middleware returning **403 `PASSWORD_CHANGE_REQUIRED`**, mounted on the seven product
routers (conversations, contacts, tags, follow-ups, whatsapp-accounts, users, realtime) and
deliberately **not** on `/auth`, so a blocked user can still read their profile, change the
password and sign out. Enforced on the server because a frontend-only gate could be bypassed by
calling the API directly.

### Dev seed — `npm run seed:dev-users`

Creates one `admin`, one `manager` and one `staff` user with `mustChangePassword: false` so all
three roles can be signed into immediately. Idempotent, and refuses to run when
`NODE_ENV=production`.

### Frontend

- **Team page** (`pages/TeamPage.jsx` + `components/team/*`) — lists members with role/status
  badges, an add-member form (name, email, temporary password, role), and Disable / Enable /
  Reset password. Viewing gated by `users.read`, mutations by `users.manage`. Action buttons are
  hidden for the super admin and for yourself, matching what the API refuses.
- **ChangePasswordGate** — rendered instead of the app while `mustChangePassword` is set.
- **Nav** — a Team entry gated by `users.read`.

## Verification

- Backend: `npm run lint` clean, **250 tests pass**. New `tests/change-password.test.js` covers
  success + flag cleared + new password works + old rejected, wrong current password → 401,
  short password → 400, reuse → 400, the 403 guard, `/auth/me` staying reachable, and the
  product API unblocking after the change **on the same access token**.
- Frontend: lint clean, **39 tests pass**, production build clean. New `team-page.test.jsx` and
  `change-password-gate.test.jsx`.
- Manual E2E in the browser, all confirmed:

| Signed in as        | Nav                       | Conversations     |
| ------------------- | ------------------------- | ----------------- |
| Super admin / Admin | Inbox, Accounts, Team     | all 4             |
| Manager             | Inbox, Team (no Accounts) | all 4             |
| Staff               | Inbox only                | 0 — none assigned |

Creating a user with `mustChangePassword` and signing in as them showed the gate, and setting a
new password dropped straight into the app without re-authenticating.

## Note on the dev seed

The very first `seed:dev-users` run wrote rows whose password did not match and whose
`mustChangePassword` stayed `true`. It was not reproducible: deleting those rows and re-running
produced correct data, verified with a direct bcrypt comparison and three API logins. The dev
database had concurrent writes at the time (a live `node --watch` backend plus a smoke-test
user). Flagged rather than explained — if it reappears, capture the row and the actor id before
re-seeding.

## Non-goals

- No AI (deferred).
- No email invites / password reset by email — the admin shares the temporary password out of band.
- No per-user permission-override editor; role + account access only (the backend supports
  overrides already).
