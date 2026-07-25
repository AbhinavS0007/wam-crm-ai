import { ACTIVITY_EVENTS } from '../../constants/activity-events.js';
import { PERMISSIONS } from '../../constants/permissions.js';
import {
  createActivity,
  findActivityForConversation,
} from '../activity/activity-log.repository.js';
import { serializeActivityLog } from '../activity/activity-log.serializer.js';
import { findContactById } from '../contacts/contact.repository.js';
import { serializeContact } from '../contacts/contact.serializer.js';
import { createOutboundMessageService } from '../messages/outbound-message.service.js';
import { findMessagesByConversationCursor } from '../messages/message.repository.js';
import { serializeMessage } from '../messages/message.serializer.js';
import { REALTIME_REASONS } from '../realtime/realtime.events.js';
import { publishConversationChanged } from '../realtime/realtime.publisher.js';
import {
  findConversationById,
  listConversations,
  updateAssignment,
  updateStage,
} from './conversation.repository.js';
import { serializeConversation } from './conversation.serializer.js';

const outboundMessageService = createOutboundMessageService();

const canReadAll = (permissions = []) => permissions.includes(PERMISSIONS.CONVERSATIONS_READ_ALL);

const assertConversationVisible = ({ conversation, permissions, actorId }) => {
  if (canReadAll(permissions)) {
    return;
  }

  if (!conversation.assignedTo || conversation.assignedTo.toString() !== actorId.toString()) {
    throw new Error('CONVERSATION_ACCESS_DENIED');
  }
};

export const loadVisibleConversationForActor = async ({
  organizationId,
  conversationId,
  permissions,
  actorId,
}) => {
  const conversation = await findConversationById({
    conversationId,
    organizationId,
  });

  if (!conversation) {
    throw new Error('CONVERSATION_NOT_FOUND');
  }

  assertConversationVisible({
    conversation,
    permissions,
    actorId,
  });

  return conversation;
};

const loadVisibleConversation = loadVisibleConversationForActor;

export const listConversationsForActor = async ({
  organizationId,
  actorId,
  permissions,
  whatsappAccountId,
  stage,
  status,
  limit,
  skip,
}) => {
  const conversations = await listConversations({
    organizationId,
    whatsappAccountId,
    assignedTo: canReadAll(permissions) ? undefined : actorId,
    stage,
    status,
    limit,
    skip,
  });

  return conversations.map((conversation) => serializeConversation(conversation));
};

export const getConversationForActor = async ({
  organizationId,
  conversationId,
  permissions,
  actorId,
}) => {
  const conversation = await loadVisibleConversation({
    organizationId,
    conversationId,
    permissions,
    actorId,
  });

  const contact = await findContactById({
    contactId: conversation.contactId,
    organizationId,
  });

  return {
    conversation: serializeConversation(conversation),
    contact: serializeContact(contact),
  };
};

export const getConversationMessagesForActor = async ({
  organizationId,
  conversationId,
  permissions,
  actorId,
  beforeSentAt,
  beforeId,
  limit,
}) => {
  await loadVisibleConversation({
    organizationId,
    conversationId,
    permissions,
    actorId,
  });

  const messages = await findMessagesByConversationCursor({
    organizationId,
    conversationId,
    beforeSentAt,
    beforeId,
    limit,
  });

  return messages.map((message) => serializeMessage(message));
};

export const assignConversationForActor = async ({
  organizationId,
  conversationId,
  actor,
  assignedTo,
  assignedTeam,
}) => {
  const conversation = await findConversationById({
    conversationId,
    organizationId,
  });

  if (!conversation) {
    throw new Error('CONVERSATION_NOT_FOUND');
  }

  const updated = await updateAssignment({
    conversationId: conversation._id,
    organizationId,
    assignedTo,
    assignedTeam,
    lastHandledBy: actor._id,
  });

  await createActivity({
    organizationId,
    whatsappAccountId: conversation.whatsappAccountId,
    conversationId: conversation._id,
    actorId: actor._id,
    eventType: ACTIVITY_EVENTS.CONVERSATION_ASSIGNED,
    summary: assignedTo ? 'Conversation assigned to a team member.' : 'Conversation unassigned.',
    metadata: {
      assigned: Boolean(assignedTo),
    },
  });

  await publishConversationChanged({
    organizationId,
    conversationId: conversation._id,
    assignedTo: updated?.assignedTo ?? assignedTo ?? null,
    reason: REALTIME_REASONS.ASSIGNMENT,
  });

  return serializeConversation(updated);
};

export const changeConversationStageForActor = async ({
  organizationId,
  conversationId,
  permissions,
  actor,
  stage,
}) => {
  const conversation = await loadVisibleConversationForActor({
    organizationId,
    conversationId,
    permissions,
    actorId: actor._id,
  });

  const updated = await updateStage({
    conversationId: conversation._id,
    organizationId,
    stage,
    lastHandledBy: actor._id,
  });

  await createActivity({
    organizationId,
    whatsappAccountId: conversation.whatsappAccountId,
    conversationId: conversation._id,
    actorId: actor._id,
    eventType: ACTIVITY_EVENTS.CONVERSATION_STAGE_CHANGED,
    summary: `Conversation stage changed to ${stage}.`,
    metadata: {
      stage,
    },
  });

  await publishConversationChanged({
    organizationId,
    conversationId: conversation._id,
    assignedTo: conversation.assignedTo,
    reason: REALTIME_REASONS.STAGE,
  });

  return serializeConversation(updated);
};

export const getConversationActivityForActor = async ({
  organizationId,
  conversationId,
  permissions,
  actorId,
  limit,
  skip,
}) => {
  await loadVisibleConversationForActor({
    organizationId,
    conversationId,
    permissions,
    actorId,
  });

  const activity = await findActivityForConversation({
    organizationId,
    conversationId,
    limit,
    skip,
  });

  return activity.map((entry) => serializeActivityLog(entry));
};

export const sendMessageForActor = async ({
  organizationId,
  conversationId,
  permissions,
  actor,
  body,
  idempotencyKey,
}) => {
  const conversation = await loadVisibleConversation({
    organizationId,
    conversationId,
    permissions,
    actorId: actor._id,
  });

  return outboundMessageService.enqueueOutboundMessage({
    organizationId,
    conversation,
    actor,
    body,
    idempotencyKey,
  });
};
