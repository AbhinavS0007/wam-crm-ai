import { AiDraft } from './ai-draft.model.js';

export const createAiDraft = (draftData) => AiDraft.create(draftData);

export const findAiDraftById = ({ draftId, organizationId } = {}) =>
  AiDraft.findOne({
    _id: draftId,
    organizationId,
  }).exec();

export const updateAiDraftOutcome = ({ draftId, organizationId, outcome } = {}) =>
  AiDraft.findOneAndUpdate(
    {
      _id: draftId,
      organizationId,
    },
    {
      $set: {
        outcome,
      },
    },
    {
      returnDocument: 'after',
      runValidators: true,
    },
  ).exec();
