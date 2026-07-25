import { randomUUID } from 'node:crypto';

import request from 'supertest';

import app from '../../src/app.js';
import { ROLES } from '../../src/constants/roles.js';
import { AuditLog } from '../../src/modules/audit/audit.model.js';
import { hashPassword } from '../../src/modules/auth/password.service.js';
import { RefreshSession } from '../../src/modules/auth/refresh-session.model.js';
import { Contact } from '../../src/modules/contacts/contact.model.js';
import {
  createContact,
  setContactEncryptedPii,
} from '../../src/modules/contacts/contact.repository.js';
import { Conversation } from '../../src/modules/conversations/conversation.model.js';
import { createConversation } from '../../src/modules/conversations/conversation.repository.js';
import { createInboundMessage } from '../../src/modules/messages/message.repository.js';
import { Organization } from '../../src/modules/organizations/organization.model.js';
import { createOrganization } from '../../src/modules/organizations/organization.repository.js';
import { User } from '../../src/modules/users/user.model.js';
import { createUser } from '../../src/modules/users/user.repository.js';
import { createAccountRecord } from '../../src/modules/whatsapp-accounts/whatsapp-account.repository.js';
import { initializePhase3Models } from './phase3-fixtures.js';

export const PHASE7_PASSWORD = 'ValidPhase7ApiPassword123';

export const createTestRunId = () => randomUUID().replaceAll('-', '');

export const initializePhase7Models = async () => {
  await initializePhase3Models();
  await Promise.all([RefreshSession.init(), AuditLog.init()]);
};

export const cleanupPhase7TestData = async (testRunId) => {
  const organizations = await Organization.find({
    slug: new RegExp(testRunId),
  })
    .select('_id')
    .exec();

  const organizationIds = organizations.map((organization) => organization._id);

  await Promise.all([
    AuditLog.deleteMany({ userAgent: new RegExp(testRunId) }),
    RefreshSession.deleteMany({ userAgent: new RegExp(testRunId) }),
  ]);

  if (organizationIds.length > 0) {
    await Promise.all([
      Conversation.deleteMany({ organizationId: { $in: organizationIds } }),
      Contact.deleteMany({ organizationId: { $in: organizationIds } }),
      User.deleteMany({ organizationId: { $in: organizationIds } }),
      Organization.deleteMany({ _id: { $in: organizationIds } }),
    ]);
  }

  await User.deleteMany({ email: new RegExp(testRunId) });
};

export const createLoginableUser = async ({
  organizationId,
  testRunId,
  suffix,
  role,
  permissionOverrides,
}) => {
  const passwordHash = await hashPassword(PHASE7_PASSWORD);

  return createUser({
    organizationId,
    name: `Phase 7 ${suffix}`,
    email: `${suffix}-${testRunId}@example.com`,
    passwordHash,
    role,
    mustChangePassword: false,
    ...(permissionOverrides ? { permissionOverrides } : {}),
  });
};

export const loginAs = async ({ organization, user, testRunId }) => {
  const response = await request(app)
    .post('/api/v1/auth/login')
    .set('user-agent', `vitest-${testRunId}`)
    .send({
      organizationSlug: organization.slug,
      email: user.email,
      password: PHASE7_PASSWORD,
    })
    .expect(200);

  return response.body.data.accessToken;
};

export const createPhase7Base = async ({ testRunId, suffix }) => {
  const organization = await createOrganization({
    name: `Phase 7 ${suffix}`,
    slug: `phase-7-${suffix}-${testRunId}`,
  });

  const admin = await createLoginableUser({
    organizationId: organization._id,
    testRunId,
    suffix: `admin-${suffix}`,
    role: ROLES.ADMIN,
  });

  const staff = await createLoginableUser({
    organizationId: organization._id,
    testRunId,
    suffix: `staff-${suffix}`,
    role: ROLES.STAFF,
  });

  const account = await createAccountRecord({
    organizationId: organization._id,
    name: `Phase 7 Account ${suffix}`,
    brandKey: `phase-7-account-${suffix}-${testRunId}`,
    ownerUserId: admin._id,
  });

  return {
    organization,
    admin,
    staff,
    account,
  };
};

export const createContactWithPhone = async ({ organizationId, suffix, phone }) => {
  const contact = await createContact({
    organizationId,
    displayName: `Phase 7 Contact ${suffix}`,
    source: 'whatsapp',
  });

  if (phone) {
    await setContactEncryptedPii({
      contactId: contact._id,
      organizationId,
      phone,
    });
  }

  return contact;
};

export const createConversationFor = async ({
  organizationId,
  account,
  contact,
  assignedTo = null,
}) =>
  createConversation({
    organizationId,
    whatsappAccountId: account._id,
    contactId: contact._id,
    leadId: contact.leadId,
    displayName: contact.displayName,
    assignedTo,
  });

export const seedInboundMessage = ({ organization, account, conversation, contact, body }) =>
  createInboundMessage({
    organizationId: organization._id,
    whatsappAccountId: account._id,
    conversationId: conversation._id,
    contactId: contact._id,
    providerMessageId: `seed-${randomUUID()}`,
    body,
  });
