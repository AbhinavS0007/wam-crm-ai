import { serializeDate, serializeId, toPlainObject } from '../../utils/serialization.js';

export const serializeTag = (tag) => {
  const value = toPlainObject(tag);

  if (!value) {
    return null;
  }

  return {
    id: serializeId(value._id),
    organizationId: serializeId(value.organizationId),
    whatsappAccountId: serializeId(value.whatsappAccountId),
    name: value.name,
    slug: value.slug,
    color: value.color,
    description: value.description,
    status: value.status,
    createdBy: serializeId(value.createdBy),
    updatedBy: serializeId(value.updatedBy),
    createdAt: serializeDate(value.createdAt),
    updatedAt: serializeDate(value.updatedAt),
  };
};
