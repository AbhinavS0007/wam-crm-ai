export const REFRESH_SESSION_STATUSES = Object.freeze({
  ACTIVE: 'active',
  ROTATED: 'rotated',
  REVOKED: 'revoked',
  EXPIRED: 'expired',
  COMPROMISED: 'compromised',
});

export const REFRESH_SESSION_STATUS_VALUES = Object.freeze(Object.values(REFRESH_SESSION_STATUSES));
