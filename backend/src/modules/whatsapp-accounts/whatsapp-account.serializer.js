import { serializeDate, serializeId, toPlainObject } from '../../utils/serialization.js';

export const serializeWhatsAppAccount = (account) => {
  const value = toPlainObject(account);

  if (!value) {
    return null;
  }

  return {
    id: serializeId(value._id),
    organizationId: serializeId(value.organizationId),
    name: value.name,
    description: value.description,
    brandKey: value.brandKey,
    status: value.status,
    ownerUserId: serializeId(value.ownerUserId),
    settings: {
      outboundIntervalMs: value.settings?.outboundIntervalMs,
      aiEnabled: Boolean(value.settings?.aiEnabled),
    },
    lastConnectedAt: serializeDate(value.lastConnectedAt),
    lastDisconnectedAt: serializeDate(value.lastDisconnectedAt),
    disconnectCode: value.disconnectCode,
    disconnectReason: value.disconnectReason,
    removedAt: serializeDate(value.removedAt),
    createdBy: serializeId(value.createdBy),
    updatedBy: serializeId(value.updatedBy),
    createdAt: serializeDate(value.createdAt),
    updatedAt: serializeDate(value.updatedAt),
  };
};
