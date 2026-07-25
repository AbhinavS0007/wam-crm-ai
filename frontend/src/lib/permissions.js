export const PERMISSIONS = {
  CONVERSATIONS_READ_ALL: 'conversations.read_all',
  CONVERSATIONS_ASSIGN: 'conversations.assign',
  MESSAGES_SEND: 'messages.send',
  CRM_TAGS_MANAGE: 'crm.tags.manage',
  CRM_TASKS_MANAGE: 'crm.tasks.manage',
  CLIENT_PII_REVEAL: 'client_pii.reveal',
};

export const NOTE_VISIBILITY = {
  SHARED: 'shared',
  MANAGER: 'manager',
  ADMIN: 'admin',
};

export const hasPermission = (permissions, permission) =>
  Array.isArray(permissions) && permissions.includes(permission);

// Mirrors the backend getAllowedNoteVisibilityForRole.
export const allowedNoteVisibilityForRole = (role) => {
  if (role === 'staff') {
    return [NOTE_VISIBILITY.SHARED];
  }

  if (role === 'manager') {
    return [NOTE_VISIBILITY.SHARED, NOTE_VISIBILITY.MANAGER];
  }

  return [NOTE_VISIBILITY.SHARED, NOTE_VISIBILITY.MANAGER, NOTE_VISIBILITY.ADMIN];
};
