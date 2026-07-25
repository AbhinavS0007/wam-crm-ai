import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import app from '../src/app.js';
import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import { connectRedis, disconnectRedis } from '../src/config/redis.js';
import { NOTE_VISIBILITY } from '../src/constants/note-visibility.js';
import {
  cleanupPhase9TestData,
  createContactWithPhone,
  createConversationFor,
  createPhase7Base,
  createTestRunId,
  initializePhase9Models,
  loginAs,
} from './fixtures/phase9-fixtures.js';

const testRunId = createTestRunId();

const authHeader = (token) => ({
  Authorization: `Bearer ${token}`,
  'user-agent': `vitest-${testRunId}`,
});

describe('Phase 9 note API', () => {
  let base;
  let adminToken;
  let staffToken;
  let assignedConversation;
  let unassignedConversation;

  beforeAll(async () => {
    await connectDatabase();
    await connectRedis();
    await initializePhase9Models();

    base = await createPhase7Base({ testRunId, suffix: 'note' });
    adminToken = await loginAs({ organization: base.organization, user: base.admin, testRunId });
    staffToken = await loginAs({ organization: base.organization, user: base.staff, testRunId });

    const assignedContact = await createContactWithPhone({
      organizationId: base.organization._id,
      suffix: 'note-assigned',
    });
    const unassignedContact = await createContactWithPhone({
      organizationId: base.organization._id,
      suffix: 'note-unassigned',
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
  });

  afterAll(async () => {
    try {
      await cleanupPhase9TestData(testRunId);
    } finally {
      await disconnectRedis();
      await disconnectDatabase();
    }
  });

  it('lets staff create and read a shared note on their conversation', async () => {
    const created = await request(app)
      .post(`/api/v1/conversations/${assignedConversation._id.toString()}/notes`)
      .set(authHeader(staffToken))
      .send({ body: 'Follow up next week', visibility: NOTE_VISIBILITY.SHARED })
      .expect(201);

    expect(created.body.data.visibility).toBe(NOTE_VISIBILITY.SHARED);

    const list = await request(app)
      .get(`/api/v1/conversations/${assignedConversation._id.toString()}/notes`)
      .set(authHeader(staffToken))
      .expect(200);

    expect(list.body.data.map((note) => note.body)).toContain('Follow up next week');
  });

  it('forbids staff from creating an admin-visibility note', async () => {
    await request(app)
      .post(`/api/v1/conversations/${assignedConversation._id.toString()}/notes`)
      .set(authHeader(staffToken))
      .send({ body: 'secret', visibility: NOTE_VISIBILITY.ADMIN })
      .expect(403);
  });

  it('hides admin-visibility notes from staff but shows them to admins', async () => {
    await request(app)
      .post(`/api/v1/conversations/${assignedConversation._id.toString()}/notes`)
      .set(authHeader(adminToken))
      .send({ body: 'Admin only note', visibility: NOTE_VISIBILITY.ADMIN })
      .expect(201);

    const staffList = await request(app)
      .get(`/api/v1/conversations/${assignedConversation._id.toString()}/notes`)
      .set(authHeader(staffToken))
      .expect(200);
    expect(staffList.body.data.map((note) => note.body)).not.toContain('Admin only note');

    const adminList = await request(app)
      .get(`/api/v1/conversations/${assignedConversation._id.toString()}/notes`)
      .set(authHeader(adminToken))
      .expect(200);
    expect(adminList.body.data.map((note) => note.body)).toContain('Admin only note');
  });

  it('blocks a scoped staff user from an unassigned conversation', async () => {
    await request(app)
      .get(`/api/v1/conversations/${unassignedConversation._id.toString()}/notes`)
      .set(authHeader(staffToken))
      .expect(403);
  });

  it('lets the creator soft-delete a note', async () => {
    const created = await request(app)
      .post(`/api/v1/conversations/${assignedConversation._id.toString()}/notes`)
      .set(authHeader(staffToken))
      .send({ body: 'Delete me' })
      .expect(201);

    await request(app)
      .delete(
        `/api/v1/conversations/${assignedConversation._id.toString()}/notes/${created.body.data.id}`,
      )
      .set(authHeader(staffToken))
      .expect(200);

    const list = await request(app)
      .get(`/api/v1/conversations/${assignedConversation._id.toString()}/notes`)
      .set(authHeader(staffToken))
      .expect(200);
    expect(list.body.data.map((note) => note.id)).not.toContain(created.body.data.id);
  });

  it('never includes a phone in note responses', async () => {
    const list = await request(app)
      .get(`/api/v1/conversations/${assignedConversation._id.toString()}/notes`)
      .set(authHeader(adminToken))
      .expect(200);
    expect(JSON.stringify(list.body)).not.toMatch(/"phone"/);
  });
});
