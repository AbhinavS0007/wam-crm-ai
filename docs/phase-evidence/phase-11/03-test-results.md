# Phase 11 Evidence — 03 Test Results

## New suites (Vitest + RTL, endpoints mocked, rendered inside a real AuthProvider)

### `src/tests/lead-panel.test.jsx`

- Changing the stage calls `changeStage` and fires `onStageChange`.
- The phone is revealed only after the audited `revealPhone` call, and is absent from the DOM
  before the reveal.
- The reveal button is hidden without `client_pii.reveal`.

### `src/tests/notes-section.test.jsx`

- Notes render; adding one posts with the chosen visibility and shows it in the list.
- The visibility `<select>` offers only the role's allowed options (staff → `shared` only).
- A user can delete their own note.

### `src/tests/tags-section.test.jsx`

- Attaching calls `attachTag`, the chip renders, and removing calls `detachTag`.
- Tag controls are hidden without `crm.tags.manage`.

### `src/tests/followups-section.test.jsx`

- Creating a follow-up posts to `createFollowUp`; completing calls `completeFollowUp`.
- Without `crm.tasks.manage` the section renders nothing and does not fetch.

## Result

```
cd frontend && npm run lint && npm test && npm run build
```

Result: lint passed; 9 files / 22 tests passed (10 new Phase 11 tests); production build
succeeded.
