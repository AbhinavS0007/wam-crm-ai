# Phase 10 Evidence — 04 Local Verification

## Frontend checks

```
cd frontend && npm run lint
cd frontend && npm test
cd frontend && npm run build
```

Results:

- Lint: passed.
- Tests: 5 files / 12 tests passed.
- Build: production bundle built successfully.

## Root format check

```
npm run format:check
```

Result: all matched files use Prettier code style.

## Browser smoke

The Vite dev server was started and the app opened at `http://localhost:5173`. With no
session, the app bootstraps (attempts a cookie refresh) and renders the styled **Sign in**
screen (organization / email / password). No backend changes were required.

## Manual end-to-end (optional)

1. Run the backend (`cd backend && npm run dev`) with a seeded user and some conversations.
2. `cd frontend && npm run dev`, open `http://localhost:5173`.
3. Sign in → the inbox lists conversations; selecting one shows the thread.
4. Type a reply and Send → the message appears with `queued` status (delivered by the Phase 8
   worker when the session process is running).
