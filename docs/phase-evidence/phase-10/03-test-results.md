# Phase 10 Evidence — 03 Test Results

## Suites (Vitest + React Testing Library, `fetch`/endpoints mocked)

### `src/tests/api-client.test.js`

- Sends the Bearer token, JSON body, and `credentials: include`; returns parsed data.
- Throws a typed `ApiError` with the backend `code`/`message` on non-2xx.
- Surfaces a `401` as an `ApiError` for the caller to handle.

### `src/tests/login.test.jsx`

- No session → the sign-in screen shows; valid credentials call the API and render the inbox.
- Rejected credentials show an error and stay on the sign-in screen.

### `src/tests/conversation-list.test.jsx`

- Conversations render with name, stage, unread badge, and preview.
- Selecting a conversation loads its thread (outbound bubble + status label render).
- No `phone` text appears in rendered conversation data.
- Sending a reply calls the API with a generated `idempotencyKey` and clears the composer.

### `src/tests/composer.test.jsx`

- Send is disabled when empty, enabled with text.
- Send calls `onSend` with a unique idempotency key and clears the input on success.
- A send failure surfaces an error and keeps the text.

### `src/tests/App.test.jsx`

- Renders the sign-in screen when no session can be restored.

## Result

```
cd frontend && npm run lint && npm test && npm run build
```

Result: lint passed; 5 files / 12 tests passed; production build succeeded. The login screen
was also verified rendering in a browser against the running dev server.
