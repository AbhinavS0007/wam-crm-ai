import { serializeDate, serializeId, toPlainObject } from '../../utils/serialization.js';

export const serializeContact = (contact) => {
  const value = toPlainObject(contact);

  if (!value) {
    return null;
  }

  return {
    id: serializeId(value._id),
    organizationId: serializeId(value.organizationId),
    leadId: value.leadId,
    displayName: value.displayName,
    profileName: value.profileName,
    source: value.source,
    status: value.status,
    createdAt: serializeDate(value.createdAt),
    updatedAt: serializeDate(value.updatedAt),
  };
};
