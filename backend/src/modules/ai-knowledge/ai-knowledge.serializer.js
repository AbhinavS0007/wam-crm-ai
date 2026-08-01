import { serializeDate, serializeId, toPlainObject } from '../../utils/serialization.js';

export const serializeKnowledge = (knowledge) => {
  const value = toPlainObject(knowledge);

  if (!value) {
    return null;
  }

  return {
    id: serializeId(value._id),
    organizationId: serializeId(value.organizationId),
    label: value.label,
    content: value.content,
    category: value.category,
    status: value.status,
    createdBy: serializeId(value.createdBy),
    updatedBy: serializeId(value.updatedBy),
    createdAt: serializeDate(value.createdAt),
    updatedAt: serializeDate(value.updatedAt),
  };
};
