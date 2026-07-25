import { serializeDate, serializeId, toPlainObject } from '../../utils/serialization.js';

export const serializeActivityLog = (activity) => {
  const value = toPlainObject(activity);

  if (!value) {
    return null;
  }

  return {
    id: serializeId(value._id),
    organizationId: serializeId(value.organizationId),
    whatsappAccountId: serializeId(value.whatsappAccountId),
    conversationId: serializeId(value.conversationId),
    actorId: serializeId(value.actorId),
    eventType: value.eventType,
    summary: value.summary,
    metadata: value.metadata ?? {},
    createdAt: serializeDate(value.createdAt),
  };
};
