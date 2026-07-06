import { serializeDate, serializeId, toPlainObject } from '../../utils/serialization.js';

export const serializeMessage = (message) => {
  const value = toPlainObject(message);

  if (!value) {
    return null;
  }

  return {
    id: serializeId(value._id),
    organizationId: serializeId(value.organizationId),
    whatsappAccountId: serializeId(value.whatsappAccountId),
    conversationId: serializeId(value.conversationId),
    contactId: serializeId(value.contactId),
    providerMessageId: value.providerMessageId,
    direction: value.direction,
    type: value.type,
    body: value.body,
    mediaObjectKey: value.mediaObjectKey,
    media: {
      mimeType: value.media?.mimeType ?? null,
      fileName: value.media?.fileName ?? null,
      sizeBytes: value.media?.sizeBytes ?? null,
      storageStatus: value.media?.storageStatus ?? 'not_applicable',
    },
    sentByUserId: serializeId(value.sentByUserId),
    status: value.status,
    sentAt: serializeDate(value.sentAt),
    receivedAt: serializeDate(value.receivedAt),
    providerTimestamp: serializeDate(value.providerTimestamp),
    statusUpdatedAt: serializeDate(value.statusUpdatedAt),
    createdAt: serializeDate(value.createdAt),
    updatedAt: serializeDate(value.updatedAt),
  };
};
