import { randomUUID } from 'node:crypto';

import { ACTIVITY_EVENTS } from '../../src/constants/activity-events.js';
import { FOLLOWUP_TYPES } from '../../src/constants/followup-types.js';
import { MESSAGE_TYPES } from '../../src/constants/message-types.js';
import { ROLES } from '../../src/constants/roles.js';
import { ActivityLog } from '../../src/modules/activity/activity-log.model.js';
import { Contact } from '../../src/modules/contacts/contact.model.js';
import { createContact } from '../../src/modules/contacts/contact.repository.js';
import { Conversation } from '../../src/modules/conversations/conversation.model.js';
import { createConversation } from '../../src/modules/conversations/conversation.repository.js';
import { FollowUpTask } from '../../src/modules/followups/followup-task.model.js';
import { IdempotencyRecord } from '../../src/modules/idempotency/idempotency-record.model.js';
import { Message } from '../../src/modules/messages/message.model.js';
import { Note } from '../../src/modules/notes/note.model.js';
import { Organization } from '../../src/modules/organizations/organization.model.js';
import { createOrganization } from '../../src/modules/organizations/organization.repository.js';
import { Tag } from '../../src/modules/tags/tag.model.js';
import { User } from '../../src/modules/users/user.model.js';
import { createUser } from '../../src/modules/users/user.repository.js';
import { WhatsAppAccount } from '../../src/modules/whatsapp-accounts/whatsapp-account.model.js';
import { createAccountRecord } from '../../src/modules/whatsapp-accounts/whatsapp-account.repository.js';

export const createTestRunId = () => randomUUID().replaceAll('-', '');

export const initializePhase3Models = async () => {
  await Promise.all([
    Organization.init(),
    User.init(),
    WhatsAppAccount.init(),
    Contact.init(),
    Conversation.init(),
    Message.init(),
    Tag.init(),
    Note.init(),
    FollowUpTask.init(),
    ActivityLog.init(),
    IdempotencyRecord.init(),
  ]);
};

export const cleanupPhase3TestData = async (testRunId) => {
  const organizations = await Organization.find({
    slug: new RegExp(testRunId),
  })
    .select('_id')
    .exec();

  const organizationIds = organizations.map((organization) => organization._id);

  if (organizationIds.length > 0) {
    await Promise.all([
      IdempotencyRecord.deleteMany({ organizationId: { $in: organizationIds } }),
      ActivityLog.deleteMany({ organizationId: { $in: organizationIds } }),
      FollowUpTask.deleteMany({ organizationId: { $in: organizationIds } }),
      Note.deleteMany({ organizationId: { $in: organizationIds } }),
      Message.deleteMany({ organizationId: { $in: organizationIds } }),
      Conversation.deleteMany({ organizationId: { $in: organizationIds } }),
      Tag.deleteMany({ organizationId: { $in: organizationIds } }),
      Contact.deleteMany({ organizationId: { $in: organizationIds } }),
      WhatsAppAccount.deleteMany({ organizationId: { $in: organizationIds } }),
      User.deleteMany({ organizationId: { $in: organizationIds } }),
      Organization.deleteMany({ _id: { $in: organizationIds } }),
    ]);
  }

  await User.deleteMany({ email: new RegExp(testRunId) });
};

export const createPhase3Organization = (testRunId, suffix) =>
  createOrganization({
    name: `Phase 3 ${suffix}`,
    slug: `phase-3-${suffix}-${testRunId}`,
  });

export const createPhase3User = ({ organizationId, testRunId, suffix, role = ROLES.STAFF }) =>
  createUser({
    organizationId,
    name: `Phase 3 User ${suffix}`,
    email: `${suffix}.${testRunId}@example.com`,
    passwordHash: `hashed-password-${suffix}`,
    role,
  });

export const createPhase3Account = ({ organizationId, testRunId, suffix, ownerUserId }) =>
  createAccountRecord({
    organizationId,
    name: `Phase 3 Account ${suffix}`,
    brandKey: `phase-3-account-${suffix}-${testRunId}`,
    ownerUserId,
  });

export const createPhase3Contact = ({ organizationId, testRunId, suffix }) =>
  createContact({
    organizationId,
    displayName: `Phase 3 Contact ${suffix} ${testRunId}`,
    profileName: `Profile ${suffix}`,
    source: 'manual',
  });

export const createPhase3Conversation = async ({
  organizationId,
  whatsappAccountId,
  contact,
  testRunId,
  suffix,
}) =>
  createConversation({
    organizationId,
    whatsappAccountId,
    contactId: contact._id,
    leadId: contact.leadId,
    displayName: `Phase 3 Conversation ${suffix} ${testRunId}`,
  });

export const createPhase3Base = async ({ testRunId, suffix }) => {
  const organization = await createPhase3Organization(testRunId, suffix);
  const user = await createPhase3User({
    organizationId: organization._id,
    testRunId,
    suffix,
    role: ROLES.ADMIN,
  });
  const account = await createPhase3Account({
    organizationId: organization._id,
    testRunId,
    suffix,
    ownerUserId: user._id,
  });
  const contact = await createPhase3Contact({
    organizationId: organization._id,
    testRunId,
    suffix,
  });
  const conversation = await createPhase3Conversation({
    organizationId: organization._id,
    whatsappAccountId: account._id,
    contact,
    testRunId,
    suffix,
  });

  return {
    organization,
    user,
    account,
    contact,
    conversation,
  };
};

export const createPhase3FollowUpData = ({ base, dueAt }) => ({
  organizationId: base.organization._id,
  whatsappAccountId: base.account._id,
  conversationId: base.conversation._id,
  assignedTo: base.user._id,
  createdBy: base.user._id,
  type: FOLLOWUP_TYPES.CALL,
  note: 'Follow up without private data',
  dueAt,
});

export const createPhase3ActivityData = ({ base, summary = 'Activity without private data' }) => ({
  organizationId: base.organization._id,
  whatsappAccountId: base.account._id,
  conversationId: base.conversation._id,
  actorId: base.user._id,
  eventType: ACTIVITY_EVENTS.CONVERSATION_CREATED,
  summary,
  metadata: {
    safe: true,
  },
});

export const createPhase3MessageData = ({ base, suffix }) => ({
  organizationId: base.organization._id,
  whatsappAccountId: base.account._id,
  conversationId: base.conversation._id,
  contactId: base.contact._id,
  providerMessageId: `provider-${suffix}-${randomUUID()}`,
  type: MESSAGE_TYPES.TEXT,
  body: `Message ${suffix}`,
});
