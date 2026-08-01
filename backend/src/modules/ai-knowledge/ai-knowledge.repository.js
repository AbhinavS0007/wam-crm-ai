import { AI_KNOWLEDGE_STATUSES } from '../../constants/ai-knowledge-statuses.js';
import { AiKnowledge } from './ai-knowledge.model.js';

export const createKnowledge = (knowledgeData) => AiKnowledge.create(knowledgeData);

export const findKnowledgeByOrganization = ({
  organizationId,
  status,
  limit = 100,
  skip = 0,
} = {}) => {
  const filter = {
    organizationId,
  };

  if (status) {
    filter.status = status;
  }

  return AiKnowledge.find(filter)
    .sort({
      label: 1,
    })
    .skip(skip)
    .limit(limit)
    .exec();
};

// Used internally by the AI context builder — always active-only, no pagination needed since
// this feeds a prompt, not a paginated UI list.
export const findActiveKnowledgeForOrganization = ({ organizationId } = {}) =>
  AiKnowledge.find({
    organizationId,
    status: AI_KNOWLEDGE_STATUSES.ACTIVE,
  })
    .sort({
      label: 1,
    })
    .exec();

export const findKnowledgeById = ({ knowledgeId, organizationId } = {}) =>
  AiKnowledge.findOne({
    _id: knowledgeId,
    organizationId,
  }).exec();

export const archiveKnowledge = ({ knowledgeId, organizationId, actorId } = {}) =>
  AiKnowledge.findOneAndUpdate(
    {
      _id: knowledgeId,
      organizationId,
    },
    {
      $set: {
        status: AI_KNOWLEDGE_STATUSES.ARCHIVED,
        updatedBy: actorId,
      },
    },
    {
      returnDocument: 'after',
      runValidators: true,
    },
  ).exec();
