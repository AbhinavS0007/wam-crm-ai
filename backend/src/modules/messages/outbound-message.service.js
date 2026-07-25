import { ACTIVITY_EVENTS } from '../../constants/activity-events.js';
import { MESSAGE_STATUSES } from '../../constants/message-statuses.js';
import { createActivity as defaultCreateActivity } from '../activity/activity-log.repository.js';
import {
  updateAssignment as defaultUpdateAssignment,
  updateConversationPreview as defaultUpdateConversationPreview,
} from '../conversations/conversation.repository.js';
import { REALTIME_REASONS } from '../realtime/realtime.events.js';
import { publishConversationChanged as defaultPublishConversationChanged } from '../realtime/realtime.publisher.js';
import { serializeMessage } from './message.serializer.js';
import {
  createOutboundMessageRecord as defaultCreateOutboundMessageRecord,
  findMessageByIdempotencyKey as defaultFindMessageByIdempotencyKey,
} from './message.repository.js';

const CONVERSATION_PREVIEW_MAX_LENGTH = 500;

const truncate = (value, maxLength) =>
  typeof value === 'string' && value.length > maxLength ? value.slice(0, maxLength) : value;

const isDuplicateKeyError = (error) => error?.code === 11000;

/**
 * Enqueues an outbound text message for a conversation.
 *
 * The message is persisted with status `queued` and a caller-supplied idempotency key;
 * actual delivery through the WhatsApp socket is performed by the session process in a
 * later phase. Re-sending with the same idempotency key returns the existing message
 * instead of creating a duplicate (idempotent send workflow).
 */
export const createOutboundMessageService = ({
  createOutboundMessageRecord = defaultCreateOutboundMessageRecord,
  findMessageByIdempotencyKey = defaultFindMessageByIdempotencyKey,
  updateConversationPreview = defaultUpdateConversationPreview,
  updateAssignment = defaultUpdateAssignment,
  createActivity = defaultCreateActivity,
  publishEvent = defaultPublishConversationChanged,
  now = () => new Date(),
} = {}) => {
  const enqueueOutboundMessage = async ({
    organizationId,
    conversation,
    actor,
    body,
    idempotencyKey,
  } = {}) => {
    const whatsappAccountId = conversation.whatsappAccountId;
    const sentAt = now();

    let message;
    let created = true;

    try {
      message = await createOutboundMessageRecord({
        organizationId,
        whatsappAccountId,
        conversationId: conversation._id,
        contactId: conversation.contactId,
        idempotencyKey,
        body,
        sentByUserId: actor._id,
        status: MESSAGE_STATUSES.QUEUED,
        sentAt,
      });
    } catch (error) {
      if (!isDuplicateKeyError(error)) {
        throw error;
      }

      created = false;
      message = await findMessageByIdempotencyKey({
        organizationId,
        whatsappAccountId,
        idempotencyKey,
      });
    }

    if (created) {
      await updateConversationPreview({
        conversationId: conversation._id,
        organizationId,
        lastMessageAt: sentAt,
        lastMessagePreview: truncate(body, CONVERSATION_PREVIEW_MAX_LENGTH),
        unreadCountIncrement: 0,
      });

      await updateAssignment({
        conversationId: conversation._id,
        organizationId,
        lastHandledBy: actor._id,
        lastHandledAt: sentAt,
      });

      await createActivity({
        organizationId,
        whatsappAccountId,
        conversationId: conversation._id,
        actorId: actor._id,
        eventType: ACTIVITY_EVENTS.MESSAGE_CREATED,
        summary: 'Outbound message queued for delivery.',
        metadata: {
          direction: 'out',
          status: MESSAGE_STATUSES.QUEUED,
        },
      });

      await publishEvent({
        organizationId,
        conversationId: conversation._id,
        assignedTo: conversation.assignedTo,
        reason: REALTIME_REASONS.OUTBOUND,
      });
    }

    return {
      created,
      message: serializeMessage(message),
    };
  };

  return {
    enqueueOutboundMessage,
  };
};
