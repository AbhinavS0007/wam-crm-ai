import { randomUUID } from 'node:crypto';

import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import app from '../src/app.js';
import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import { connectRedis, disconnectRedis } from '../src/config/redis.js';
import { CONVERSATION_STAGES } from '../src/constants/conversation-stages.js';
import { ROLES } from '../src/constants/roles.js';
import { STAGE_STATUSES } from '../src/constants/stage-statuses.js';
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

describe('Phase 16 stage API', () => {
  let base;
  let adminToken;
  let staffToken;
  let managerToken;

  beforeAll(async () => {
    await connectDatabase();
    await connectRedis();
    await initializePhase9Models();

    base = await createPhase7Base({ testRunId, suffix: 'stage' });
    adminToken = await loginAs({ organization: base.organization, user: base.admin, testRunId });
    staffToken = await loginAs({ organization: base.organization, user: base.staff, testRunId });

    const manager = await createLoginableUser({
      organizationId: base.organization._id,
      testRunId,
      suffix: 'stage-manager',
      role: ROLES.MANAGER,
    });
    managerToken = await loginAs({ organization: base.organization, user: manager, testRunId });
  });

  afterAll(async () => {
    try {
      await cleanupPhase9TestData(testRunId);
    } finally {
      await disconnectRedis();
      await disconnectDatabase();
    }
  });

  it('creates a custom stage, rejects a duplicate key, and rejects a key reserved by a built-in', async () => {
    const label = `Hot Lead ${randomUUID().slice(0, 8)}`;

    const created = await request(app)
      .post('/api/v1/stages')
      .set(authHeader(adminToken))
      .send({ label, color: '#ff8800' })
      .expect(201);

    expect(created.body.data.label).toBe(label);
    expect(created.body.data.status).toBe(STAGE_STATUSES.ACTIVE);

    await request(app)
      .post('/api/v1/stages')
      .set(authHeader(adminToken))
      .send({ label, key: created.body.data.key })
      .expect(409);

    await request(app)
      .post('/api/v1/stages')
      .set(authHeader(adminToken))
      .send({ label: 'Duplicate built-in', key: CONVERSATION_STAGES.WON })
      .expect(400);
  });

  it('archives a custom stage', async () => {
    const created = await request(app)
      .post('/api/v1/stages')
      .set(authHeader(adminToken))
      .send({ label: `Archive me ${randomUUID().slice(0, 8)}` })
      .expect(201);

    const archived = await request(app)
      .patch(`/api/v1/stages/${created.body.data.id}/archive`)
      .set(authHeader(adminToken))
      .expect(200);

    expect(archived.body.data.status).toBe(STAGE_STATUSES.ARCHIVED);
  });

  it('lets any authenticated user list stages but forbids create/archive without crm.stage.manage', async () => {
    await request(app).get('/api/v1/stages').set(authHeader(staffToken)).expect(200);
    await request(app).get('/api/v1/stages').set(authHeader(managerToken)).expect(200);

    await request(app)
      .post('/api/v1/stages')
      .set(authHeader(staffToken))
      .send({ label: 'Staff stage' })
      .expect(403);

    await request(app)
      .post('/api/v1/stages')
      .set(authHeader(managerToken))
      .send({ label: 'Manager stage' })
      .expect(403);
  });

  it('permanently deletes a custom stage, distinct from archiving', async () => {
    const created = await request(app)
      .post('/api/v1/stages')
      .set(authHeader(adminToken))
      .send({ label: `Delete me ${randomUUID().slice(0, 8)}` })
      .expect(201);

    await request(app)
      .delete(`/api/v1/stages/${created.body.data.id}`)
      .set(authHeader(adminToken))
      .expect(200);

    const list = await request(app).get('/api/v1/stages').set(authHeader(adminToken)).expect(200);
    expect(list.body.data.some((stage) => stage.id === created.body.data.id)).toBe(false);

    // Deleting again (or an unknown id) is a 404, not a silent success.
    await request(app)
      .delete(`/api/v1/stages/${created.body.data.id}`)
      .set(authHeader(adminToken))
      .expect(404);
  });

  it('forbids deleting a stage without crm.stage.manage', async () => {
    const created = await request(app)
      .post('/api/v1/stages')
      .set(authHeader(adminToken))
      .send({ label: `Protected ${randomUUID().slice(0, 8)}` })
      .expect(201);

    await request(app)
      .delete(`/api/v1/stages/${created.body.data.id}`)
      .set(authHeader(staffToken))
      .expect(403);

    await request(app)
      .delete(`/api/v1/stages/${created.body.data.id}`)
      .set(authHeader(managerToken))
      .expect(403);
  });

  it('an archived custom stage can no longer be applied to a conversation', async () => {
    const created = await request(app)
      .post('/api/v1/stages')
      .set(authHeader(adminToken))
      .send({ label: `Short lived ${randomUUID().slice(0, 8)}` })
      .expect(201);

    await request(app)
      .patch(`/api/v1/stages/${created.body.data.id}/archive`)
      .set(authHeader(adminToken))
      .expect(200);

    const contact = await createContactWithPhone({
      organizationId: base.organization._id,
      suffix: `stage-archived-${randomUUID().slice(0, 6)}`,
    });
    const conversation = await createConversationFor({
      organizationId: base.organization._id,
      account: base.account,
      contact,
      assignedTo: base.staff._id,
    });

    const response = await request(app)
      .patch(`/api/v1/conversations/${conversation._id.toString()}/stage`)
      .set(authHeader(staffToken))
      .send({ stage: created.body.data.key })
      .expect(400);

    expect(response.body.error.code).toBe('INVALID_STAGE');
  });
});
