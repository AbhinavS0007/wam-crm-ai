import { AuditLog } from './audit.model.js';

export const createAuditLog = (auditData) => AuditLog.create(auditData);

export const findAuditLogById = (auditLogId) => AuditLog.findById(auditLogId).exec();

export const listAuditLogsByOrganization = ({
  organizationId,
  eventType,
  actorId,
  targetUserId,
  limit = 50,
  skip = 0,
}) => {
  const filter = {
    organizationId,
  };

  if (eventType) {
    filter.eventType = eventType;
  }

  if (actorId) {
    filter.actorId = actorId;
  }

  if (targetUserId) {
    filter.targetUserId = targetUserId;
  }

  return AuditLog.find(filter)
    .sort({
      createdAt: -1,
    })
    .skip(skip)
    .limit(limit)
    .exec();
};
