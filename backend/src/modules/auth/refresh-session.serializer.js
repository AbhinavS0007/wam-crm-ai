import { serializeDate, serializeId, toPlainObject } from '../../utils/serialization.js';

export const serializeRefreshSession = (session) => {
  const value = toPlainObject(session);

  if (!value) {
    return null;
  }

  return {
    id: serializeId(value._id),
    organizationId: serializeId(value.organizationId),
    userId: serializeId(value.userId),
    familyId: serializeId(value.familyId),
    status: value.status,
    expiresAt: serializeDate(value.expiresAt),
    lastUsedAt: serializeDate(value.lastUsedAt),
    rotatedAt: serializeDate(value.rotatedAt),
    revokedAt: serializeDate(value.revokedAt),
    revokeReason: value.revokeReason,
    replacedBySessionId: serializeId(value.replacedBySessionId),
    createdByIp: value.createdByIp,
    lastUsedByIp: value.lastUsedByIp,
    userAgent: value.userAgent,
    reuseDetectedAt: serializeDate(value.reuseDetectedAt),
    createdAt: serializeDate(value.createdAt),
  };
};
