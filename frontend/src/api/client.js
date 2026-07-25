export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api/v1';

export class ApiError extends Error {
  constructor({ status, code, message, details }) {
    super(message || 'Request failed.');
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details ?? null;
  }
}

const parseJson = async (response) => {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

/**
 * Low-level fetch wrapper. Sends JSON, attaches a Bearer token when provided, always
 * includes credentials so the httpOnly refresh cookie travels with auth requests, and
 * throws a typed ApiError on any non-2xx response.
 */
export const apiFetch = async (path, { method = 'GET', body, token, signal } = {}) => {
  const headers = { Accept: 'application/json' };

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    credentials: 'include',
    signal,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const payload = await parseJson(response);

  if (!response.ok) {
    throw new ApiError({
      status: response.status,
      code: payload?.error?.code ?? payload?.code ?? 'REQUEST_FAILED',
      message: payload?.error?.message ?? payload?.message ?? 'Request failed.',
      details: payload?.error?.details ?? payload?.details ?? null,
    });
  }

  return payload;
};
