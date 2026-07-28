export const REALTIME_CHANNEL = 'realtime:events';

export const REALTIME_EVENT_TYPES = Object.freeze({
  CONVERSATION_CHANGED: 'conversation.changed',
  ACCOUNT_CHANGED: 'account.changed',
});

export const REALTIME_REASONS = Object.freeze({
  INBOUND: 'inbound',
  OUTBOUND: 'outbound',
  STATUS: 'status',
  STAGE: 'stage',
  ASSIGNMENT: 'assignment',
  READ: 'read',
});
