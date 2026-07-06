import { serializeDate, serializeId, toPlainObject } from '../../utils/serialization.js';

export const serializeOrganization = (organization) => {
  const value = toPlainObject(organization);

  if (!value) {
    return null;
  }

  return {
    id: serializeId(value._id),
    name: value.name,
    slug: value.slug,
    status: value.status,
    createdAt: serializeDate(value.createdAt),
    updatedAt: serializeDate(value.updatedAt),
  };
};
