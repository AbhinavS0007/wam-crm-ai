# Phase 10 Evidence — 02 Frontend Design

## Principles

- No new runtime dependencies. State-driven navigation (auth gate + selected conversation),
  native `fetch`, React context for the in-memory access token.
- API base from `import.meta.env.VITE_API_BASE_URL` (default `http://localhost:5001/api/v1`).

## Layers

### API — `src/api/`

- `client.js` — `apiFetch(path, { method, body, token })`: JSON, Bearer header,
  `credentials: 'include'` (for the httpOnly refresh cookie), throws a typed `ApiError`
  (`{ status, code, message }`) parsed from the backend's `{ error: { code, message } }`.
- `endpoints.js` — thin wrappers: `login`, `refresh`, `logout`, `listConversations`,
  `getConversation`, `getMessages`, `sendMessage`.

### Auth — `src/auth/AuthContext.jsx`

- Holds `{ token, user, organization, permissions }`. On mount, `bootstrap` calls
  `POST /auth/refresh` (cookie) so a returning user stays signed in.
- `authedRequest(makeRequest)` runs a request with the current token; on a `401` it refreshes
  once and retries, and on refresh failure it clears the session (no infinite loop).

### UI — `src/pages/` + `src/components/`

- `LoginPage` — org slug + email + password; error surface.
- `AppShell` — header (user + sign out) and a two-pane layout.
- `ConversationList` — inbox rows: display name, stage chip, unread badge, preview, relative
  time; manual refresh + a 15s interval poll.
- `ConversationView` — header (name, lead id, stage); `MessageThread` of bubbles (inbound
  left / outbound right, with outbound status), "Load older" via the cursor, and
  `MessageComposer`.
- `MessageComposer` — generates a per-attempt `idempotencyKey` (`crypto.randomUUID()`),
  posts, and disables while sending.
- Presentational helpers: `StageBadge`, `UnreadBadge`, `RelativeTime`, `Spinner`,
  `EmptyState`; `lib/format.js` for relative/clock time and initials.

`App.jsx` = `AuthProvider` → login screen while unauthenticated, `AppShell` once signed in.

## Correctness / privacy

- Idempotent sends match the Phase-7 contract: a double click cannot create duplicates.
- The API omits the client phone, so it cannot be rendered — verified by a test asserting no
  `phone` text in rendered conversation data.
- The `set-state-in-effect` and `react-refresh` lint rules are satisfied; the two mount-fetch
  effects carry a documented `eslint-disable-next-line` (state updates occur after the awaited
  request resolves).

## Reuse / no backend change

- Backend response contracts from the existing serializers; no backend files were modified.
- Existing Vitest + RTL setup (`globals` enabled so RTL auto-cleanup runs between tests).
