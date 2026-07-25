import { randomUUID } from 'node:crypto';

import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import app from '../src/app.js';
import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import { connectRedis, disconnectRedis } from '../src/config/redis.js';
import { TAG_STATUSES } from '../src/constants/tag-statuses.js';
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

describe('Phase 9 tag API', () => {
  let base;
  let adminToken;
  let staffToken;
  let conversation;

  beforeAll(async () => {
    await connectDatabase();
    await connectRedis();
    await initializePhase9Models();

    base = await createPhase7Base({ testRunId, suffix: 'tag' });
    adminToken = await loginAs({ organization: base.organization, user: base.admin, testRunId });
    staffToken = await loginAs({ organization: base.organization, user: base.staff, testRunId });

    const contact = await createContactWithPhone({
      organizationId: base.organization._id,
      suffix: 'tag',
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

  it('creates a tag, rejects duplicates, and attaches/detaches it to a conversation', async () => {
    const name = `VIP ${randomUUID().slice(0, 8)}`;

    const created = await request(app)
      .post('/api/v1/tags')
      .set(authHeader(adminToken))
      .send({ name, color: '#ff8800' })
      .expect(201);

    const tagId = created.body.data.id;
    expect(created.body.data.slug).toMatch(/^vip-/);

    await request(app)
      .post('/api/v1/tags')
      .set(authHeader(adminToken))
      .send({ name, slug: created.body.data.slug })
      .expect(409);

    const attach = await request(app)
      .post(`/api/v1/conversations/${conversation._id.toString()}/tags`)
      .set(authHeader(adminToken))
      .send({ tagId })
      .expect(200);
    expect(attach.body.data.tags).toContain(tagId);

    const detach = await request(app)
      .delete(`/api/v1/conversations/${conversation._id.toString()}/tags/${tagId}`)
      .set(authHeader(adminToken))
      .expect(200);
    expect(detach.body.data.tags).not.toContain(tagId);
  });

  it('archives a tag', async () => {
    const created = await request(app)
      .post('/api/v1/tags')
      .set(authHeader(adminToken))
      .send({ name: `Archive ${randomUUID().slice(0, 8)}` })
      .expect(201);

    const archived = await request(app)
      .patch(`/api/v1/tags/${created.body.data.id}/archive`)
      .set(authHeader(adminToken))
      .expect(200);
    expect(archived.body.data.status).toBe(TAG_STATUSES.ARCHIVED);
  });

  it('lets any authenticated user list tags but forbids creation without crm.tags.manage', async () => {
    await request(app).get('/api/v1/tags').set(authHeader(staffToken)).expect(200);

    await request(app)
      .post('/api/v1/tags')
      .set(authHeader(staffToken))
      .send({ name: 'Staff tag' })
      .expect(403);
  });
});
