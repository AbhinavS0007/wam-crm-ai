import { Conversation } from './conversation.model.js';

const removeUndefinedValues = (value) =>
  Object.fromEntries(Object.entries(value).filter(([, entryValue]) => entryValue !== undefined));

export const createConversation = (conversationData) => Conversation.create(conversationData);

export const findConversationById = ({ conversationId, organizationId } = {}) => {
  const filter = {
    _id: conversationId,
  };

  if (organizationId) {
    filter.organizationId = organizationId;
  }

  return Conversation.findOne(filter).exec();
};

export const listConversations = ({
  organizationId,
  whatsappAccountId,
  assignedTo,
  stage,
  status,
  limit = 50,
  skip = 0,
} = {}) => {
  const filter = {
    organizationId,
  };

  if (whatsappAccountId) {
    filter.whatsappAccountId = whatsappAccountId;
  }

  if (assignedTo) {
    filter.assignedTo = assignedTo;
  }

  if (stage) {
    filter.stage = stage;
  }

  if (status) {
    filter.status = status;
  }

  return Conversation.find(filter)
    .sort({
      updatedAt: -1,
    })
    .skip(skip)
    .limit(limit)
    .exec();
};

export const findConversationByAccountAndContact = ({
  organizationId,
  whatsappAccountId,
  contactId,
} = {}) =>
  Conversation.findOne({
    organizationId,
    whatsappAccountId,
    contactId,
  }).exec();

export const upsertConversationForContact = ({
  organizationId,
  whatsappAccountId,
  contactId,
  leadId,
  displayName,
  defaults = {},
} = {}) =>
  Conversation.findOneAndUpdate(
    {
      organizationId,
      whatsappAccountId,
      contactId,
    },
    {
      $setOnInsert: {
        organizationId,
        whatsappAccountId,
        contactId,
        leadId,
        displayName,
        ...defaults,
      },
    },
    {
      returnDocument: 'after',
      upsert: true,
      runValidators: true,
      setDefaultsOnInsert: true,
    },
  ).exec();

export const updateConversationPreview = ({
  conversationId,
  organizationId,
  lastMessageAt,
  lastMessagePreview,
  unreadCountIncrement = 0,
  nextFollowUpAt,
} = {}) => {
  const update = {
    $set: removeUndefinedValues({
      lastMessageAt,
      lastMessagePreview,
      nextFollowUpAt,
    }),
  };

  if (unreadCountIncrement !== 0) {
    update.$inc = {
      unreadCount: unreadCountIncrement,
    };
  }

  if (Object.keys(update.$set).length === 0) {
    delete update.$set;
  }

  return Conversation.findOneAndUpdate(
    {
      _id: conversationId,
      organizationId,
    },
    update,
    {
      returnDocument: 'after',
      runValidators: true,
    },
  ).exec();
};

/**
 * Clears the unread counter when an agent opens the conversation. A no-op update (still
 * returns the current doc) when it is already 0, so callers can always use the result.
 */
export const markConversationRead = ({ conversationId, organizationId } = {}) =>
  Conversation.findOneAndUpdate(
    {
      _id: conversationId,
      organizationId,
    },
    {
      $set: {
        unreadCount: 0,
      },
    },
    {
      returnDocument: 'after',
      runValidators: true,
    },
  ).exec();

export const updateAssignment = ({
  conversationId,
  organizationId,
  assignedTo,
  assignedTeam,
  lastHandledBy,
  lastHandledAt = new Date(),
} = {}) =>
  Conversation.findOneAndUpdate(
    {
      _id: conversationId,
      organizationId,
    },
    {
      $set: removeUndefinedValues({
        assignedTo,
        assignedTeam,
        lastHandledBy,
        lastHandledAt,
      }),
    },
    {
      returnDocument: 'after',
      runValidators: true,
    },
  ).exec();

export const addTagToConversation = ({ conversationId, organizationId, tagId } = {}) =>
  Conversation.findOneAndUpdate(
    {
      _id: conversationId,
      organizationId,
    },
    {
      $addToSet: {
        tags: tagId,
      },
    },
    {
      returnDocument: 'after',
      runValidators: true,
    },
  ).exec();

export const removeTagFromConversation = ({ conversationId, organizationId, tagId } = {}) =>
  Conversation.findOneAndUpdate(
    {
      _id: conversationId,
      organizationId,
    },
    {
      $pull: {
        tags: tagId,
      },
    },
    {
      returnDocument: 'after',
      runValidators: true,
    },
  ).exec();

export const updateStage = ({
  conversationId,
  organizationId,
  stage,
  lastHandledBy,
  lastHandledAt = new Date(),
} = {}) =>
  Conversation.findOneAndUpdate(
    {
      _id: conversationId,
      organizationId,
    },
    {
      $set: removeUndefinedValues({
        stage,
        lastHandledBy,
        lastHandledAt,
      }),
    },
    {
      returnDocument: 'after',
      runValidators: true,
    },
  ).exec();
