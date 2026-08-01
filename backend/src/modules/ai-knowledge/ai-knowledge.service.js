import {
  archiveKnowledge,
  createKnowledge,
  findKnowledgeById,
  findKnowledgeByOrganization,
} from './ai-knowledge.repository.js';
import { serializeKnowledge } from './ai-knowledge.serializer.js';

export const listKnowledgeForOrganization = async ({ organizationId, status, limit, skip }) => {
  const knowledge = await findKnowledgeByOrganization({
    organizationId,
    status,
    limit,
    skip,
  });

  return knowledge.map((item) => serializeKnowledge(item));
};

export const createKnowledgeForActor = async ({
  organizationId,
  actor,
  label,
  content,
  category,
}) => {
  const knowledge = await createKnowledge({
    organizationId,
    label,
    content,
    category,
    createdBy: actor._id,
  });

  return serializeKnowledge(knowledge);
};

export const archiveKnowledgeForActor = async ({ organizationId, knowledgeId, actor }) => {
  const knowledge = await findKnowledgeById({
    knowledgeId,
    organizationId,
  });

  if (!knowledge) {
    throw new Error('AI_KNOWLEDGE_NOT_FOUND');
  }

  const archived = await archiveKnowledge({
    knowledgeId: knowledge._id,
    organizationId,
    actorId: actor._id,
  });

  return serializeKnowledge(archived);
};
