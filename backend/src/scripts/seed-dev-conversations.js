/**
 * Dev-only helper: seeds a few synthetic contacts, conversations, and messages into the
 * database so the frontend inbox can be exercised without a live WhatsApp connection.
 *
 * Usage: node src/scripts/seed-dev-conversations.js [organizationSlug]
 * Only synthetic data is inserted. Never run against production data.
 */
import { randomUUID } from 'node:crypto';

import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { CONVERSATION_STAGES } from '../constants/conversation-stages.js';
import { createContact } from '../modules/contacts/contact.repository.js';
import {
  createConversation,
  updateConversationPreview,
} from '../modules/conversations/conversation.repository.js';
import {
  createInboundMessage,
  createOutboundMessageRecord,
} from '../modules/messages/message.repository.js';
import {
  findOrganizationBySlug,
  listOrganizations,
} from '../modules/organizations/organization.repository.js';
import { listUsersByOrganization } from '../modules/users/user.repository.js';
import {
  createAccountRecord,
  findAccountByBrandKey,
} from '../modules/whatsapp-accounts/whatsapp-account.repository.js';

const slug = process.argv[2] ?? process.env.SEED_ORGANIZATION_SLUG ?? 'vistaar-media';

const SAMPLES = [
  {
    name: 'Riya Sharma',
    stage: CONVERSATION_STAGES.QUALIFIED,
    inbound: ['Hi, is the 2BHK still available?', 'What is the rent per month?'],
    outbound: 'Yes it is available. Rent is ₹28,000/month. When can you visit?',
  },
  {
    name: 'Arjun Verma',
    stage: CONVERSATION_STAGES.NEW,
    inbound: ['Hello, saw your ad for interior design.'],
    outbound: null,
  },
  {
    name: 'Meera Nair',
    stage: CONVERSATION_STAGES.PROPOSAL,
    inbound: ['Thanks for the quote, reviewing it now.'],
    outbound: 'Great — happy to walk you through it on a quick call.',
  },
];

const run = async () => {
  await connectDatabase();

  const organization = await findOrganizationBySlug(slug);

  if (!organization) {
    const orgs = await listOrganizations({ limit: 20 });
    console.error(`No organization with slug "${slug}".`);
    console.error('Available slugs:', orgs.map((org) => org.slug).join(', ') || '(none)');
    return;
  }

  const [owner] = await listUsersByOrganization({ organizationId: organization._id, limit: 1 });

  if (!owner) {
    console.error(`No users found in "${slug}". Run "npm run seed:super-admin" first.`);
    return;
  }

  const brandKey = 'dev-sample-account';
  const account =
    (await findAccountByBrandKey({ organizationId: organization._id, brandKey })) ??
    (await createAccountRecord({
      organizationId: organization._id,
      name: 'Dev Sample Account',
      brandKey,
      ownerUserId: owner._id,
    }));

  const created = [];

  for (const sample of SAMPLES) {
    const contact = await createContact({
      organizationId: organization._id,
      displayName: sample.name,
      profileName: sample.name,
      source: 'dev-seed',
    });

    const conversation = await createConversation({
      organizationId: organization._id,
      whatsappAccountId: account._id,
      contactId: contact._id,
      leadId: contact.leadId,
      displayName: sample.name,
      stage: sample.stage,
      assignedTo: owner._id,
    });

    let lastBody = null;
    let lastAt = new Date(Date.now() - 3_600_000);

    for (const body of sample.inbound) {
      lastAt = new Date(lastAt.getTime() + 60_000);
      await createInboundMessage({
        organizationId: organization._id,
        whatsappAccountId: account._id,
        conversationId: conversation._id,
        contactId: contact._id,
        providerMessageId: `dev-${randomUUID()}`,
        body,
        receivedAt: lastAt,
      });
      lastBody = body;
    }

    if (sample.outbound) {
      lastAt = new Date(lastAt.getTime() + 120_000);
      await createOutboundMessageRecord({
        organizationId: organization._id,
        whatsappAccountId: account._id,
        conversationId: conversation._id,
        contactId: contact._id,
        idempotencyKey: `dev-${randomUUID()}`,
        body: sample.outbound,
        sentByUserId: owner._id,
        status: 'sent',
        sentAt: lastAt,
      });
      lastBody = sample.outbound;
    }

    await updateConversationPreview({
      conversationId: conversation._id,
      organizationId: organization._id,
      lastMessageAt: lastAt,
      lastMessagePreview: lastBody,
      unreadCountIncrement: sample.outbound ? 0 : sample.inbound.length,
    });

    created.push({ name: sample.name, leadId: contact.leadId, stage: sample.stage });
  }

  console.log(`Seeded ${created.length} dev conversations into "${slug}":`);
  console.table(created);
};

run()
  .catch((error) => {
    console.error('Dev conversation seed failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDatabase();
  });
