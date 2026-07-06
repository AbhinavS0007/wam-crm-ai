import { MESSAGE_DIRECTIONS } from '../../constants/message-directions.js';
import { MESSAGE_STATUSES } from '../../constants/message-statuses.js';
import { MESSAGE_TYPES } from '../../constants/message-types.js';
import { Message } from './message.model.js';

const resolveMessageTime = ({ sentAt, receivedAt, providerTimestamp } = {}) =>
  sentAt ?? providerTimestamp ?? receivedAt ?? new Date();

export const createInboundMessage = ({
  organizationId,
  whatsappAccountId,
  conversationId,
  contactId,
  providerMessageId,
  body,
  type = MESSAGE_TYPES.TEXT,
  mediaObjectKey,
  media,
  receivedAt = new Date(),
  providerTimestamp,
  status = MESSAGE_STATUSES.RECEIVED,
} = {}) => {
  const resolvedSentAt = resolveMessageTime({
    receivedAt,
    providerTimestamp,
  });

  return Message.create({
    organizationId,
    whatsappAccountId,
    conversationId,
    contactId,
    providerMessageId,
    direction: MESSAGE_DIRECTIONS.IN,
    type,
    body,
    mediaObjectKey,
    media,
    status,
    sentAt: resolvedSentAt,
    receivedAt,
    providerTimestamp,
    statusUpdatedAt: receivedAt,
  });
};

export const createOutboundMessageRecord = ({
  organizationId,
  whatsappAccountId,
  conversationId,
  contactId,
  idempotencyKey,
  body,
  type = MESSAGE_TYPES.TEXT,
  mediaObjectKey,
  media,
  sentByUserId,
  sentAt = new Date(),
  status = MESSAGE_STATUSES.CREATED,
} = {}) =>
  Message.create({
    organizationId,
    whatsappAccountId,
    conversationId,
    contactId,
    idempotencyKey,
    direction: MESSAGE_DIRECTIONS.OUT,
    type,
    body,
    mediaObjectKey,
    media,
    sentByUserId,
    status,
    sentAt,
    statusUpdatedAt: sentAt,
  });

export const findMessageByProviderId = ({
  organizationId,
  whatsappAccountId,
  providerMessageId,
} = {}) =>
  Message.findOne({
    organizationId,
    whatsappAccountId,
    providerMessageId,
  }).exec();

export const findMessagesByConversationCursor = ({
  organizationId,
  conversationId,
  beforeSentAt,
  beforeId,
  limit = 50,
} = {}) => {
  const filter = {
    organizationId,
    conversationId,
  };

  if (beforeSentAt && beforeId) {
    filter.$or = [
      {
        sentAt: {
          $lt: beforeSentAt,
        },
      },
      {
        sentAt: beforeSentAt,
        _id: {
          $lt: beforeId,
        },
      },
    ];
  } else if (beforeSentAt) {
    filter.sentAt = {
      $lt: beforeSentAt,
    };
  }

  return Message.find(filter)
    .sort({
      sentAt: -1,
      _id: -1,
    })
    .limit(limit)
    .exec();
};

export const updateMessageStatus = ({
  messageId,
  organizationId,
  status,
  statusUpdatedAt = new Date(),
} = {}) =>
  Message.findOneAndUpdate(
    {
      _id: messageId,
      organizationId,
    },
    {
      $set: {
        status,
        statusUpdatedAt,
      },
    },
    {
      returnDocument: 'after',
      runValidators: true,
    },
  ).exec();
