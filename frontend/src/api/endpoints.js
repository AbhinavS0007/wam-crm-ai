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

export const assignConversation = ({ token, conversationId, assignedTo }) =>
  apiFetch(`/conversations/${conversationId}/assignment`, {
    method: 'PATCH',
    token,
    body: { assignedTo },
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

export const listStages = ({ token } = {}) => apiFetch('/stages', { token });

export const createStage = ({ token, label, key, color }) =>
  apiFetch('/stages', {
    method: 'POST',
    token,
    body: { label, key, color },
  });

export const archiveStage = ({ token, stageId }) =>
  apiFetch(`/stages/${stageId}/archive`, { method: 'PATCH', token });

export const deleteStage = ({ token, stageId }) =>
  apiFetch(`/stages/${stageId}`, { method: 'DELETE', token });

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

// --- WhatsApp accounts (Phase 13) ---

export const listAccounts = ({ token } = {}) => apiFetch('/whatsapp-accounts', { token });

export const getAccount = ({ token, accountId }) =>
  apiFetch(`/whatsapp-accounts/${accountId}`, { token });

export const createAccount = ({ token, name, brandKey, description }) =>
  apiFetch('/whatsapp-accounts', {
    method: 'POST',
    token,
    body: { name, brandKey, description },
  });

export const connectAccount = ({ token, accountId, pairingPhoneNumber }) =>
  apiFetch(`/whatsapp-accounts/${accountId}/connect`, {
    method: 'POST',
    token,
    body: pairingPhoneNumber ? { pairingPhoneNumber } : {},
  });

export const getAccountQr = ({ token, accountId }) =>
  apiFetch(`/whatsapp-accounts/${accountId}/qr`, { token });

export const pauseAccount = ({ token, accountId }) =>
  apiFetch(`/whatsapp-accounts/${accountId}/pause`, { method: 'POST', token });

export const resumeAccount = ({ token, accountId }) =>
  apiFetch(`/whatsapp-accounts/${accountId}/resume`, { method: 'POST', token });

export const resetAccount = ({ token, accountId }) =>
  apiFetch(`/whatsapp-accounts/${accountId}/reset`, { method: 'POST', token });

export const disconnectAccount = ({ token, accountId }) =>
  apiFetch(`/whatsapp-accounts/${accountId}/disconnect`, { method: 'POST', token });

export const removeAccount = ({ token, accountId }) =>
  apiFetch(`/whatsapp-accounts/${accountId}`, { method: 'DELETE', token });

// --- Team / users (Phase 15) ---

export const listUsers = ({ token, role, status, limit, skip } = {}) =>
  apiFetch(`/users${buildQuery({ role, status, limit, skip })}`, { token });

export const createUser = ({
  token,
  name,
  email,
  password,
  role,
  accountAccessMode = 'all',
  mustChangePassword = true,
}) =>
  apiFetch('/users', {
    method: 'POST',
    token,
    body: { name, email, password, role, accountAccessMode, mustChangePassword },
  });

export const updateUser = ({ token, userId, ...changes }) =>
  apiFetch(`/users/${userId}`, { method: 'PATCH', token, body: changes });

export const disableUser = ({ token, userId }) =>
  apiFetch(`/users/${userId}/disable`, { method: 'PATCH', token });

export const enableUser = ({ token, userId }) =>
  apiFetch(`/users/${userId}/enable`, { method: 'PATCH', token });

export const resetUserPassword = ({ token, userId, password, mustChangePassword = true }) =>
  apiFetch(`/users/${userId}/reset-password`, {
    method: 'PATCH',
    token,
    body: { password, mustChangePassword },
  });

export const changePassword = ({ token, currentPassword, newPassword }) =>
  apiFetch('/auth/change-password', {
    method: 'POST',
    token,
    body: { currentPassword, newPassword },
  });

// --- AI reply assistant + knowledge base (Phase 17) ---

export const generateAiDraft = ({ token, conversationId }) =>
  apiFetch(`/conversations/${conversationId}/ai-draft`, { method: 'POST', token });

export const recordAiDraftOutcome = ({ token, conversationId, draftId, outcome }) =>
  apiFetch(`/conversations/${conversationId}/ai-draft/${draftId}/outcome`, {
    method: 'PATCH',
    token,
    body: { outcome },
  });

export const listAiKnowledge = ({ token } = {}) => apiFetch('/ai/knowledge', { token });

export const createAiKnowledge = ({ token, label, content, category }) =>
  apiFetch('/ai/knowledge', {
    method: 'POST',
    token,
    body: { label, content, category },
  });

export const archiveAiKnowledge = ({ token, knowledgeId }) =>
  apiFetch(`/ai/knowledge/${knowledgeId}/archive`, { method: 'PATCH', token });
