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
