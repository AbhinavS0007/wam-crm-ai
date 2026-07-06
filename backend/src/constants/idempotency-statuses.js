export const IDEMPOTENCY_STATUSES = Object.freeze({
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  FAILED: 'failed',
  EXPIRED: 'expired',
});

export const IDEMPOTENCY_STATUS_VALUES = Object.freeze(Object.values(IDEMPOTENCY_STATUSES));
