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

export const findMessageByIdempotencyKey = ({
  organizationId,
  whatsappAccountId,
  idempotencyKey,
} = {}) =>
  Message.findOne({
    organizationId,
    whatsappAccountId,
    idempotencyKey,
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

export const claimNextOutboundMessage = ({
  organizationId,
  whatsappAccountId,
  now = new Date(),
  maxAttempts = 3,
} = {}) =>
  Message.findOneAndUpdate(
    {
      organizationId,
      whatsappAccountId,
      direction: MESSAGE_DIRECTIONS.OUT,
      $or: [
        {
          status: MESSAGE_STATUSES.QUEUED,
        },
        {
          status: MESSAGE_STATUSES.FAILED,
          deliveryAttempts: {
            $lt: maxAttempts,
          },
          nextAttemptAt: {
            $lte: now,
          },
        },
      ],
    },
    {
      $set: {
        status: MESSAGE_STATUSES.SENDING,
        statusUpdatedAt: now,
      },
      $inc: {
        deliveryAttempts: 1,
      },
    },
    {
      returnDocument: 'after',
      runValidators: true,
      sort: {
        createdAt: 1,
      },
    },
  ).exec();

export const markOutboundMessageSent = ({
  messageId,
  organizationId,
  providerMessageId,
  now = new Date(),
} = {}) =>
  Message.findOneAndUpdate(
    {
      _id: messageId,
      organizationId,
    },
    {
      $set: {
        status: MESSAGE_STATUSES.SENT,
        providerMessageId,
        sentAt: now,
        statusUpdatedAt: now,
        lastDeliveryError: null,
        nextAttemptAt: null,
      },
    },
    {
      returnDocument: 'after',
      runValidators: true,
    },
  ).exec();

export const markOutboundMessageFailed = ({
  messageId,
  organizationId,
  error,
  permanent = false,
  nextAttemptAt = null,
  now = new Date(),
} = {}) =>
  Message.findOneAndUpdate(
    {
      _id: messageId,
      organizationId,
    },
    {
      $set: {
        status: permanent ? MESSAGE_STATUSES.FAILED_PERMANENT : MESSAGE_STATUSES.FAILED,
        statusUpdatedAt: now,
        lastDeliveryError: error ? String(error).slice(0, 300) : null,
        nextAttemptAt: permanent ? null : nextAttemptAt,
      },
    },
    {
      returnDocument: 'after',
      runValidators: true,
    },
  ).exec();

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
