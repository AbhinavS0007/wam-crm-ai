import { ACTIVITY_EVENTS } from '../../constants/activity-events.js';
import { createActivity } from '../activity/activity-log.repository.js';
import {
  addTagToConversation,
  removeTagFromConversation,
} from '../conversations/conversation.repository.js';
import { loadVisibleConversationForActor } from '../conversations/conversation.service.js';
import {
  archiveTag,
  createTag,
  findTagById,
  findTagBySlugInScope,
  findTagsByOrganization,
  normalizeTagSlug,
} from './tag.repository.js';
import { serializeTag } from './tag.serializer.js';

export const listTagsForOrganization = async ({
  organizationId,
  whatsappAccountId,
  status,
  limit,
  skip,
}) => {
  const tags = await findTagsByOrganization({
    organizationId,
    whatsappAccountId,
    status,
    limit,
    skip,
  });

  return tags.map((tag) => serializeTag(tag));
};

export const createTagForActor = async ({
  organizationId,
  actor,
  name,
  slug,
  color,
  description,
  whatsappAccountId,
}) => {
  const resolvedSlug = normalizeTagSlug(slug ?? name);

  const existing = await findTagBySlugInScope({
    organizationId,
    whatsappAccountId: whatsappAccountId ?? null,
    slug: resolvedSlug,
  });

  if (existing) {
    throw new Error('TAG_SLUG_EXISTS');
  }

  const tag = await createTag({
    organizationId,
    whatsappAccountId: whatsappAccountId ?? null,
    name,
    slug: resolvedSlug,
    color,
    description,
    createdBy: actor._id,
  });

  return serializeTag(tag);
};

export const archiveTagForActor = async ({ organizationId, tagId, actor }) => {
  const tag = await findTagById({
    tagId,
    organizationId,
  });

  if (!tag) {
    throw new Error('TAG_NOT_FOUND');
  }

  const archived = await archiveTag({
    tagId: tag._id,
    organizationId,
    actorId: actor._id,
  });

  return serializeTag(archived);
};

const loadConversationAndTag = async ({
  organizationId,
  conversationId,
  tagId,
  actor,
  permissions,
}) => {
  const conversation = await loadVisibleConversationForActor({
    organizationId,
    conversationId,
    permissions,
    actorId: actor._id,
  });

  const tag = await findTagById({
    tagId,
    organizationId,
  });

  if (!tag) {
    throw new Error('TAG_NOT_FOUND');
  }

  return { conversation, tag };
};

export const attachTagToConversationForActor = async ({
  organizationId,
  conversationId,
  tagId,
  actor,
  permissions,
}) => {
  const { conversation, tag } = await loadConversationAndTag({
    organizationId,
    conversationId,
    tagId,
    actor,
    permissions,
  });

  const updated = await addTagToConversation({
    conversationId: conversation._id,
    organizationId,
    tagId: tag._id,
  });

  await createActivity({
    organizationId,
    whatsappAccountId: conversation.whatsappAccountId,
    conversationId: conversation._id,
    actorId: actor._id,
    eventType: ACTIVITY_EVENTS.CONVERSATION_TAG_ADDED,
    summary: 'Tag added to the conversation.',
    metadata: {
      tagSlug: tag.slug,
    },
  });

  return {
    conversationId: updated._id.toString(),
    tags: updated.tags.map((id) => id.toString()),
  };
};

export const detachTagFromConversationForActor = async ({
  organizationId,
  conversationId,
  tagId,
  actor,
  permissions,
}) => {
  const { conversation, tag } = await loadConversationAndTag({
    organizationId,
    conversationId,
    tagId,
    actor,
    permissions,
  });

  const updated = await removeTagFromConversation({
    conversationId: conversation._id,
    organizationId,
    tagId: tag._id,
  });

  await createActivity({
    organizationId,
    whatsappAccountId: conversation.whatsappAccountId,
    conversationId: conversation._id,
    actorId: actor._id,
    eventType: ACTIVITY_EVENTS.CONVERSATION_TAG_REMOVED,
    summary: 'Tag removed from the conversation.',
    metadata: {
      tagSlug: tag.slug,
    },
  });

  return {
    conversationId: updated._id.toString(),
    tags: updated.tags.map((id) => id.toString()),
  };
};
