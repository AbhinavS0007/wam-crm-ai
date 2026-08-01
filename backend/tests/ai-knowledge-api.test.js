import { randomUUID } from 'node:crypto';

import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import app from '../src/app.js';
import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import { connectRedis, disconnectRedis } from '../src/config/redis.js';
import { AI_KNOWLEDGE_STATUSES } from '../src/constants/ai-knowledge-statuses.js';
import {
  cleanupPhase9TestData,
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

describe('Phase 17 AI knowledge API', () => {
  let base;
  let adminToken;
  let staffToken;

  beforeAll(async () => {
    await connectDatabase();
    await connectRedis();
    await initializePhase9Models();

    base = await createPhase7Base({ testRunId, suffix: 'ai-knowledge' });
    adminToken = await loginAs({ organization: base.organization, user: base.admin, testRunId });
    staffToken = await loginAs({ organization: base.organization, user: base.staff, testRunId });
  });

  afterAll(async () => {
    try {
      await cleanupPhase9TestData(testRunId);
    } finally {
      await disconnectRedis();
      await disconnectDatabase();
    }
  });

  it('lets admin create, list and archive a knowledge entry', async () => {
    const label = `Warranty ${randomUUID().slice(0, 8)}`;

    const created = await request(app)
      .post('/api/v1/ai/knowledge')
      .set(authHeader(adminToken))
      .send({ label, content: 'Warranty is two years.', category: 'policy' })
      .expect(201);

    expect(created.body.data.label).toBe(label);
    expect(created.body.data.status).toBe(AI_KNOWLEDGE_STATUSES.ACTIVE);

    const list = await request(app)
      .get('/api/v1/ai/knowledge')
      .set(authHeader(adminToken))
      .expect(200);
    expect(list.body.data.map((item) => item.id)).toContain(created.body.data.id);

    const archived = await request(app)
      .patch(`/api/v1/ai/knowledge/${created.body.data.id}/archive`)
      .set(authHeader(adminToken))
      .expect(200);
    expect(archived.body.data.status).toBe(AI_KNOWLEDGE_STATUSES.ARCHIVED);
  });

  it('forbids staff from every knowledge route, including list', async () => {
    await request(app).get('/api/v1/ai/knowledge').set(authHeader(staffToken)).expect(403);

    await request(app)
      .post('/api/v1/ai/knowledge')
      .set(authHeader(staffToken))
      .send({ label: 'Staff fact', content: 'Should be forbidden.' })
      .expect(403);
  });

  it('404s archiving an unknown knowledge id', async () => {
    await request(app)
      .patch('/api/v1/ai/knowledge/507f1f77bcf86cd799439011/archive')
      .set(authHeader(adminToken))
      .expect(404);
  });
});
