# Phase 11 Evidence — 04 Local Verification

## Frontend checks

```
cd frontend && npm run lint
cd frontend && npm test
cd frontend && npm run build
```

Results:

- Lint: passed.
- Tests: 9 files / 22 tests passed.
- Build: production bundle built successfully.

## Root format check

```
npm run format:check
```

Result: all matched files use Prettier code style.

## Manual end-to-end (against the seeded dev conversations)

With the backend running and signed in as the super admin:

1. Open a conversation (e.g. "Riya Sharma"). The **lead side-panel** appears on the right
   (toggle with **Details**).
2. **Stage** — change the dropdown; the header badge updates immediately and an activity
   entry appears.
3. **Reveal phone** — click; the number shows with an "audited" note (super-admin has the
   permission).
4. **Tags** — define a tag via the API/seed, then attach it here; it renders as a chip and
   can be removed.
5. **Notes** — add a note with a chosen visibility; it appears in the list; delete your own.
6. **Follow-ups** — schedule one, then Complete/Cancel it.
7. **Activity** — the timeline fills in with each action above.

(The dev conversations were seeded via `node src/scripts/seed-dev-conversations.js`.)
