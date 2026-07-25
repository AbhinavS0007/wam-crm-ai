import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiError, apiFetch } from '../api/client.js';

const jsonResponse = (status, payload) => ({
  ok: status >= 200 && status < 300,
  status,
  text: async () => JSON.stringify(payload),
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('apiFetch', () => {
  it('sends the Bearer token and JSON body, and returns parsed data', async () => {
    const fetchMock = vi.fn(async () => jsonResponse(200, { data: { ok: true } }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await apiFetch('/conversations', {
      method: 'POST',
      token: 'tok-123',
      body: { hello: 'world' },
    });

    expect(result).toEqual({ data: { ok: true } });

    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/conversations$/);
    expect(options.headers.Authorization).toBe('Bearer tok-123');
    expect(options.headers['Content-Type']).toBe('application/json');
    expect(options.credentials).toBe('include');
    expect(JSON.parse(options.body)).toEqual({ hello: 'world' });
  });

  it('throws a typed ApiError with the backend code and message on a non-2xx response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        jsonResponse(403, { error: { code: 'PERMISSION_DENIED', message: 'Nope.' } }),
      ),
    );

    await expect(apiFetch('/conversations', { token: 't' })).rejects.toMatchObject({
      name: 'ApiError',
      status: 403,
      code: 'PERMISSION_DENIED',
      message: 'Nope.',
    });
  });

  it('surfaces a 401 as an ApiError for the caller to handle', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse(401, { error: { code: 'AUTH_TOKEN_MISSING' } })),
    );

    const error = await apiFetch('/conversations', { token: 't' }).catch((caught) => caught);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(401);
  });
});
