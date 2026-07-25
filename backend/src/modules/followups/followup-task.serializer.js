import { serializeDate, serializeId, toPlainObject } from '../../utils/serialization.js';

export const serializeFollowUpTask = (task) => {
  const value = toPlainObject(task);

  if (!value) {
    return null;
  }

  return {
    id: serializeId(value._id),
    organizationId: serializeId(value.organizationId),
    whatsappAccountId: serializeId(value.whatsappAccountId),
    conversationId: serializeId(value.conversationId),
    assignedTo: serializeId(value.assignedTo),
    createdBy: serializeId(value.createdBy),
    type: value.type,
    note: value.note,
    dueAt: serializeDate(value.dueAt),
    priority: value.priority,
    status: value.status,
    completedAt: serializeDate(value.completedAt),
    cancelledAt: serializeDate(value.cancelledAt),
    missedAt: serializeDate(value.missedAt),
    createdAt: serializeDate(value.createdAt),
    updatedAt: serializeDate(value.updatedAt),
  };
};
