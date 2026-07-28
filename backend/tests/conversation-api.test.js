import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import app from '../src/app.js';
import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import { connectRedis, disconnectRedis } from '../src/config/redis.js';
import { updateConversationPreview } from '../src/modules/conversations/conversation.repository.js';
import {
  cleanupPhase7TestData,
  createContactWithPhone,
  createConversationFor,
  createPhase7Base,
  createTestRunId,
  initializePhase7Models,
  loginAs,
  seedInboundMessage,
} from './fixtures/phase7-fixtures.js';

const testRunId = createTestRunId();

const authHeader = (token) => ({
  Authorization: `Bearer ${token}`,
  'user-agent': `vitest-${testRunId}`,
});

describe('Phase 7 conversation API', () => {
  let base;
  let adminToken;
  let staffToken;
  let assignedConversation;
  let unassignedConversation;

  beforeAll(async () => {
    await connectDatabase();
    await connectRedis();
    await initializePhase7Models();

    base = await createPhase7Base({ testRunId, suffix: 'convo' });
    adminToken = await loginAs({ organization: base.organization, user: base.admin, testRunId });
    staffToken = await loginAs({ organization: base.organization, user: base.staff, testRunId });

    const assignedContact = await createContactWithPhone({
      organizationId: base.organization._id,
      suffix: 'assigned',
    });
    const unassignedContact = await createContactWithPhone({
      organizationId: base.organization._id,
      suffix: 'unassigned',
    });

    assignedConversation = await createConversationFor({
      organizationId: base.organization._id,
      account: base.account,
      contact: assignedContact,
      assignedTo: base.staff._id,
    });
    unassignedConversation = await createConversationFor({
      organizationId: base.organization._id,
      account: base.account,
      contact: unassignedContact,
      assignedTo: null,
    });

    await seedInboundMessage({
      organization: base.organization,
      account: base.account,
      conversation: assignedConversation,
      contact: assignedContact,
      body: 'Assigned inbound message',
    });
  });

  afterAll(async () => {
    try {
      await cleanupPhase7TestData(testRunId);
    } finally {
      await disconnectRedis();
      await disconnectDatabase();
    }
  });

  it('lets an admin (read_all) see every conversation', async () => {
    const response = await request(app)
      .get('/api/v1/conversations')
      .set(authHeader(adminToken))
      .expect(200);

    const ids = response.body.data.map((conversation) => conversation.id);
    expect(ids).toContain(assignedConversation._id.toString());
    expect(ids).toContain(unassignedConversation._id.toString());
  });

  it('limits a staff user (read_assigned) to conversations assigned to them', async () => {
    const response = await request(app)
      .get('/api/v1/conversations')
      .set(authHeader(staffToken))
      .expect(200);

    const ids = response.body.data.map((conversation) => conversation.id);
    expect(ids).toContain(assignedConversation._id.toString());
    expect(ids).not.toContain(unassignedConversation._id.toString());
  });

  it('never includes a phone number in list or detail responses', async () => {
    const listResponse = await request(app)
      .get('/api/v1/conversations')
      .set(authHeader(adminToken))
      .expect(200);

    const detailResponse = await request(app)
      .get(`/api/v1/conversations/${assignedConversation._id.toString()}`)
      .set(authHeader(adminToken))
      .expect(200);

    expect(JSON.stringify(listResponse.body)).not.toMatch(/"phone"/);
    expect(JSON.stringify(detailResponse.body)).not.toMatch(/"phone"/);
    expect(detailResponse.body.data.contact.id).toBeTruthy();
    expect(detailResponse.body.data.contact.phone).toBeUndefined();
  });

  it('blocks a scoped staff user from an unassigned conversation and its thread', async () => {
    await request(app)
      .get(`/api/v1/conversations/${unassignedConversation._id.toString()}`)
      .set(authHeader(staffToken))
      .expect(403);

    await request(app)
      .get(`/api/v1/conversations/${unassignedConversation._id.toString()}/messages`)
      .set(authHeader(staffToken))
      .expect(403);
  });

  it('returns the message thread for an assigned conversation', async () => {
    const response = await request(app)
      .get(`/api/v1/conversations/${assignedConversation._id.toString()}/messages`)
      .set(authHeader(staffToken))
      .expect(200);

    expect(response.body.data.length).toBeGreaterThanOrEqual(1);
    expect(response.body.data[0].body).toBe('Assigned inbound message');
    expect(response.body.data[0].direction).toBe('in');
  });

  it('clears the unread count when the conversation is opened', async () => {
    await updateConversationPreview({
      conversationId: assignedConversation._id,
      organizationId: base.organization._id,
      unreadCountIncrement: 3,
    });

    const listBefore = await request(app)
      .get('/api/v1/conversations')
      .set(authHeader(staffToken))
      .expect(200);
    const before = listBefore.body.data.find(
      (conversation) => conversation.id === assignedConversation._id.toString(),
    );
    expect(before.unreadCount).toBe(3);

    const detailResponse = await request(app)
      .get(`/api/v1/conversations/${assignedConversation._id.toString()}`)
      .set(authHeader(staffToken))
      .expect(200);
    expect(detailResponse.body.data.conversation.unreadCount).toBe(0);

    const listAfter = await request(app)
      .get('/api/v1/conversations')
      .set(authHeader(staffToken))
      .expect(200);
    const after = listAfter.body.data.find(
      (conversation) => conversation.id === assignedConversation._id.toString(),
    );
    expect(after.unreadCount).toBe(0);
  });

  it('lets an assigner reassign a conversation, and forbids staff from assigning', async () => {
    await request(app)
      .patch(`/api/v1/conversations/${unassignedConversation._id.toString()}/assignment`)
      .set(authHeader(staffToken))
      .send({ assignedTo: base.staff._id.toString() })
      .expect(403);

    const assignResponse = await request(app)
      .patch(`/api/v1/conversations/${unassignedConversation._id.toString()}/assignment`)
      .set(authHeader(adminToken))
      .send({ assignedTo: base.staff._id.toString() })
      .expect(200);

    expect(assignResponse.body.data.assignedTo).toBe(base.staff._id.toString());

    const staffList = await request(app)
      .get('/api/v1/conversations')
      .set(authHeader(staffToken))
      .expect(200);

    const ids = staffList.body.data.map((conversation) => conversation.id);
    expect(ids).toContain(unassignedConversation._id.toString());
  });
});
