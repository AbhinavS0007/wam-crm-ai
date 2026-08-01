import { serializeDate, serializeId, toPlainObject } from '../../utils/serialization.js';

export const serializeAiDraft = (draft) => {
  const value = toPlainObject(draft);

  if (!value) {
    return null;
  }

  return {
    id: serializeId(value._id),
    conversationId: serializeId(value.conversationId),
    draftText: value.draftText,
    contextMessageCount: value.contextMessageCount,
    outcome: value.outcome,
    createdAt: serializeDate(value.createdAt),
  };
};
