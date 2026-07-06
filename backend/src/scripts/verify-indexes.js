import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { ActivityLog } from '../modules/activity/activity-log.model.js';
import { Contact } from '../modules/contacts/contact.model.js';
import { Conversation } from '../modules/conversations/conversation.model.js';
import { FollowUpTask } from '../modules/followups/followup-task.model.js';
import { IdempotencyRecord } from '../modules/idempotency/idempotency-record.model.js';
import { Message } from '../modules/messages/message.model.js';
import { Note } from '../modules/notes/note.model.js';
import { Tag } from '../modules/tags/tag.model.js';
import { WhatsAppAccount } from '../modules/whatsapp-accounts/whatsapp-account.model.js';

const requiredIndexes = [
  {
    model: WhatsAppAccount,
    name: 'WhatsAppAccount',
    indexes: [
      { keys: { organizationId: 1, status: 1 } },
      { keys: { organizationId: 1, name: 1 } },
      { keys: { organizationId: 1, brandKey: 1 } },
    ],
  },
  {
    model: Contact,
    name: 'Contact',
    indexes: [
      { keys: { organizationId: 1, leadId: 1 }, options: { unique: true } },
      { keys: { organizationId: 1, displayName: 1 } },
    ],
  },
  {
    model: Conversation,
    name: 'Conversation',
    indexes: [
      {
        keys: { organizationId: 1, whatsappAccountId: 1, contactId: 1 },
        options: { unique: true },
      },
      { keys: { organizationId: 1, whatsappAccountId: 1, updatedAt: -1 } },
      { keys: { organizationId: 1, assignedTo: 1, updatedAt: -1 } },
      { keys: { organizationId: 1, stage: 1, updatedAt: -1 } },
      { keys: { organizationId: 1, tags: 1, updatedAt: -1 } },
      { keys: { organizationId: 1, nextFollowUpAt: 1 } },
    ],
  },
  {
    model: Message,
    name: 'Message',
    indexes: [
      {
        keys: { organizationId: 1, whatsappAccountId: 1, providerMessageId: 1 },
        options: { unique: true },
      },
      { keys: { organizationId: 1, conversationId: 1, sentAt: -1, _id: -1 } },
      {
        keys: { organizationId: 1, whatsappAccountId: 1, idempotencyKey: 1 },
        options: { unique: true },
      },
      { keys: { organizationId: 1, status: 1, createdAt: -1 } },
    ],
  },
  {
    model: Tag,
    name: 'Tag',
    indexes: [
      { keys: { organizationId: 1, whatsappAccountId: 1, slug: 1 }, options: { unique: true } },
      { keys: { organizationId: 1, status: 1, name: 1 } },
    ],
  },
  {
    model: Note,
    name: 'Note',
    indexes: [
      { keys: { organizationId: 1, conversationId: 1, createdAt: -1 } },
      { keys: { organizationId: 1, visibility: 1, createdAt: -1 } },
    ],
  },
  {
    model: FollowUpTask,
    name: 'FollowUpTask',
    indexes: [
      { keys: { organizationId: 1, assignedTo: 1, status: 1, dueAt: 1 } },
      { keys: { organizationId: 1, conversationId: 1, status: 1, dueAt: 1 } },
      { keys: { organizationId: 1, whatsappAccountId: 1, status: 1, dueAt: 1 } },
    ],
  },
  {
    model: ActivityLog,
    name: 'ActivityLog',
    indexes: [
      { keys: { organizationId: 1, conversationId: 1, createdAt: -1 } },
      { keys: { organizationId: 1, whatsappAccountId: 1, createdAt: -1 } },
      { keys: { organizationId: 1, actorId: 1, createdAt: -1 } },
    ],
  },
  {
    model: IdempotencyRecord,
    name: 'IdempotencyRecord',
    indexes: [
      { keys: { organizationId: 1, scope: 1, key: 1 }, options: { unique: true } },
      { keys: { expiresAt: 1 }, options: { expireAfterSeconds: 0 } },
    ],
  },
];

const hasSchemaIndex = (model, expectedKeys, expectedOptions = {}) =>
  model.schema.indexes().some(([keys, options]) => {
    const keysMatch = JSON.stringify(keys) === JSON.stringify(expectedKeys);

    if (!keysMatch) {
      return false;
    }

    return Object.entries(expectedOptions).every(
      ([optionName, optionValue]) => options[optionName] === optionValue,
    );
  });

const verifySchemaIndexes = () => {
  const failures = [];

  for (const modelRequirement of requiredIndexes) {
    for (const indexRequirement of modelRequirement.indexes) {
      const found = hasSchemaIndex(
        modelRequirement.model,
        indexRequirement.keys,
        indexRequirement.options ?? {},
      );

      if (!found) {
        failures.push({
          model: modelRequirement.name,
          keys: indexRequirement.keys,
          options: indexRequirement.options ?? {},
        });
      }
    }
  }

  return failures;
};

const run = async () => {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Index verification must not run in production.');
  }

  const failures = verifySchemaIndexes();

  if (failures.length > 0) {
    console.error('Phase 3 index verification failed.');
    console.error(JSON.stringify(failures, null, 2));
    process.exitCode = 1;
    return;
  }

  await connectDatabase();

  try {
    await Promise.all(requiredIndexes.map(({ model }) => model.init()));

    console.log('Phase 3 index verification passed.');
    console.log(`Verified models: ${requiredIndexes.map(({ name }) => name).join(', ')}`);
  } finally {
    await disconnectDatabase();
  }
};

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
