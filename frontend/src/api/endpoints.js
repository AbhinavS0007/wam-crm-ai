import { apiFetch } from './client.js';

// --- Auth (cookie-based refresh; no token needed for these three) ---

export const login = ({ organizationSlug, email, password }) =>
  apiFetch('/auth/login', {
    method: 'POST',
    body: { organizationSlug, email, password },
  });

export const refresh = () => apiFetch('/auth/refresh', { method: 'POST' });

export const logout = () => apiFetch('/auth/logout', { method: 'POST' });

// --- CRM (Bearer token required) ---

const buildQuery = (params = {}) => {
  const search = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, value);
    }
  });

  const query = search.toString();

  return query ? `?${query}` : '';
};

export const listConversations = ({ token, stage, status, limit, skip } = {}) =>
  apiFetch(`/conversations${buildQuery({ stage, status, limit, skip })}`, { token });

export const getConversation = ({ token, conversationId }) =>
  apiFetch(`/conversations/${conversationId}`, { token });

export const getMessages = ({ token, conversationId, beforeSentAt, beforeId, limit } = {}) =>
  apiFetch(
    `/conversations/${conversationId}/messages${buildQuery({ beforeSentAt, beforeId, limit })}`,
    { token },
  );

export const sendMessage = ({ token, conversationId, body, idempotencyKey }) =>
  apiFetch(`/conversations/${conversationId}/messages`, {
    method: 'POST',
    token,
    body: { body, idempotencyKey },
  });

// --- Lead CRM (Phase 9 surface) ---

export const changeStage = ({ token, conversationId, stage }) =>
  apiFetch(`/conversations/${conversationId}/stage`, {
    method: 'PATCH',
    token,
    body: { stage },
  });

export const getActivity = ({ token, conversationId, limit } = {}) =>
  apiFetch(`/conversations/${conversationId}/activity${buildQuery({ limit })}`, { token });

export const listNotes = ({ token, conversationId } = {}) =>
  apiFetch(`/conversations/${conversationId}/notes`, { token });

export const createNote = ({ token, conversationId, body, visibility }) =>
  apiFetch(`/conversations/${conversationId}/notes`, {
    method: 'POST',
    token,
    body: { body, visibility },
  });

export const deleteNote = ({ token, conversationId, noteId }) =>
  apiFetch(`/conversations/${conversationId}/notes/${noteId}`, { method: 'DELETE', token });

export const listTags = ({ token } = {}) => apiFetch('/tags', { token });

export const attachTag = ({ token, conversationId, tagId }) =>
  apiFetch(`/conversations/${conversationId}/tags`, {
    method: 'POST',
    token,
    body: { tagId },
  });

export const detachTag = ({ token, conversationId, tagId }) =>
  apiFetch(`/conversations/${conversationId}/tags/${tagId}`, { method: 'DELETE', token });

export const listConversationFollowUps = ({ token, conversationId } = {}) =>
  apiFetch(`/conversations/${conversationId}/follow-ups`, { token });

export const createFollowUp = ({ token, conversationId, type, note, dueAt, priority }) =>
  apiFetch(`/conversations/${conversationId}/follow-ups`, {
    method: 'POST',
    token,
    body: { type, note, dueAt, priority },
  });

export const completeFollowUp = ({ token, taskId }) =>
  apiFetch(`/follow-ups/${taskId}/complete`, { method: 'PATCH', token });

export const cancelFollowUp = ({ token, taskId }) =>
  apiFetch(`/follow-ups/${taskId}/cancel`, { method: 'PATCH', token });

export const revealPhone = ({ token, contactId }) =>
  apiFetch(`/contacts/${contactId}/reveal-phone`, { method: 'POST', token });
