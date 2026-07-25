import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import app from '../src/app.js';
import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import { connectRedis, disconnectRedis } from '../src/config/redis.js';
import { FOLLOWUP_STATUSES } from '../src/constants/followup-statuses.js';
import { PERMISSIONS } from '../src/constants/permissions.js';
import { ROLES } from '../src/constants/roles.js';
import {
  cleanupPhase9TestData,
  createContactWithPhone,
  createConversationFor,
  createLoginableUser,
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

const futureDate = () => new Date(Date.now() + 86_400_000).toISOString();

describe('Phase 9 follow-up API', () => {
  let base;
  let staffToken;
  let conversation;

  beforeAll(async () => {
    await connectDatabase();
    await connectRedis();
    await initializePhase9Models();

    base = await createPhase7Base({ testRunId, suffix: 'followup' });
    staffToken = await loginAs({ organization: base.organization, user: base.staff, testRunId });

    const contact = await createContactWithPhone({
      organizationId: base.organization._id,
      suffix: 'followup',
    });
    conversation = await createConversationFor({
      organizationId: base.organization._id,
      account: base.account,
      contact,
      assignedTo: base.staff._id,
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

  it('creates, lists, and completes a follow-up task', async () => {
    const created = await request(app)
      .post(`/api/v1/conversations/${conversation._id.toString()}/follow-ups`)
      .set(authHeader(staffToken))
      .send({ type: 'call', note: 'Call the lead', dueAt: futureDate(), priority: 'high' })
      .expect(201);

    expect(created.body.data.status).toBe(FOLLOWUP_STATUSES.PENDING);
    expect(created.body.data.assignedTo).toBe(base.staff._id.toString());

    const mine = await request(app)
      .get('/api/v1/follow-ups')
      .set(authHeader(staffToken))
      .expect(200);
    expect(mine.body.data.map((task) => task.id)).toContain(created.body.data.id);

    const completed = await request(app)
      .patch(`/api/v1/follow-ups/${created.body.data.id}/complete`)
      .set(authHeader(staffToken))
      .expect(200);
    expect(completed.body.data.status).toBe(FOLLOWUP_STATUSES.COMPLETED);
    expect(completed.body.data.completedAt).toBeTruthy();
  });

  it('cannot complete an already-completed task', async () => {
    const created = await request(app)
      .post(`/api/v1/conversations/${conversation._id.toString()}/follow-ups`)
      .set(authHeader(staffToken))
      .send({ dueAt: futureDate() })
      .expect(201);

    await request(app)
      .patch(`/api/v1/follow-ups/${created.body.data.id}/cancel`)
      .set(authHeader(staffToken))
      .expect(200);

    await request(app)
      .patch(`/api/v1/follow-ups/${created.body.data.id}/complete`)
      .set(authHeader(staffToken))
      .expect(409);
  });

  it('forbids follow-up management without crm.tasks.manage', async () => {
    const restricted = await createLoginableUser({
      organizationId: base.organization._id,
      testRunId,
      suffix: 'followup-restricted',
      role: ROLES.STAFF,
      permissionOverrides: { allow: [], deny: [PERMISSIONS.CRM_TASKS_MANAGE] },
    });
    const restrictedToken = await loginAs({
      organization: base.organization,
      user: restricted,
      testRunId,
    });

    await request(app)
      .post(`/api/v1/conversations/${conversation._id.toString()}/follow-ups`)
      .set(authHeader(restrictedToken))
      .send({ dueAt: futureDate() })
      .expect(403);

    await request(app).get('/api/v1/follow-ups').set(authHeader(restrictedToken)).expect(403);
  });

  it('validates the follow-up body', async () => {
    await request(app)
      .post(`/api/v1/conversations/${conversation._id.toString()}/follow-ups`)
      .set(authHeader(staffToken))
      .send({ priority: 'not-a-priority' })
      .expect(400);
  });
});
