import { serializeDate, serializeId, toPlainObject } from '../../utils/serialization.js';

export const serializeAuditLog = (auditLog) => {
  const value = toPlainObject(auditLog);

  if (!value) {
    return null;
  }

  return {
    id: serializeId(value._id),
    organizationId: serializeId(value.organizationId),
    eventType: value.eventType,
    actorId: serializeId(value.actorId),
    targetUserId: serializeId(value.targetUserId),
    sessionId: serializeId(value.sessionId),
    outcome: value.outcome,
    reasonCode: value.reasonCode,
    requestId: value.requestId,
    ipAddress: value.ipAddress,
    userAgent: value.userAgent,
    metadata: value.metadata ?? {},
    createdAt: serializeDate(value.createdAt),
  };
};
