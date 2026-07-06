export const MESSAGE_STATUSES = Object.freeze({
  RECEIVED: 'received',
  CREATED: 'created',
  QUEUED: 'queued',
  SENDING: 'sending',
  SENT: 'sent',
  DELIVERED: 'delivered',
  READ: 'read',
  FAILED: 'failed',
  FAILED_PERMANENT: 'failed_permanent',
});

export const MESSAGE_STATUS_VALUES = Object.freeze(Object.values(MESSAGE_STATUSES));
