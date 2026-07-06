import {
  serializeDate,
  serializeId,
  serializeIdArray,
  toPlainObject,
} from '../../utils/serialization.js';

export const serializeConversation = (conversation) => {
  const value = toPlainObject(conversation);

  if (!value) {
    return null;
  }

  return {
    id: serializeId(value._id),
    organizationId: serializeId(value.organizationId),
    whatsappAccountId: serializeId(value.whatsappAccountId),
    contactId: serializeId(value.contactId),
    leadId: value.leadId,
    displayName: value.displayName,
    assignedTo: serializeId(value.assignedTo),
    assignedTeam: value.assignedTeam,
    lastHandledBy: serializeId(value.lastHandledBy),
    lastHandledAt: serializeDate(value.lastHandledAt),
    stage: value.stage,
    tags: serializeIdArray(value.tags),
    summary: value.summary,
    unreadCount: value.unreadCount,
    lastMessageAt: serializeDate(value.lastMessageAt),
    lastMessagePreview: value.lastMessagePreview,
    nextFollowUpAt: serializeDate(value.nextFollowUpAt),
    status: value.status,
    createdAt: serializeDate(value.createdAt),
    updatedAt: serializeDate(value.updatedAt),
  };
};
