import { randomUUID } from 'node:crypto';

import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import app from '../src/app.js';
import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import { connectRedis, disconnectRedis } from '../src/config/redis.js';
import { WhatsAppAccount } from '../src/modules/whatsapp-accounts/whatsapp-account.model.js';
import { setSessionManager } from '../src/modules/whatsapp/sessions/session-manager.instance.js';
import {
  cleanupPhase7TestData,
  createPhase7Base,
  createTestRunId,
  initializePhase7Models,
  loginAs,
} from './fixtures/phase7-fixtures.js';

const testRunId = createTestRunId();

const authHeader = (token) => ({
  Authorization: `Bearer ${token}`,
  'user-agent': `vitest-${testRunId}`,
});

const fakeManager = {
  getSessionState: () => ({ running: false, qrAvailable: false }),
  connectAccount: vi.fn(async () => ({ running: true, status: 'connecting' })),
  getQrDataUrl: vi.fn(async () => 'data:image/png;base64,QQ=='),
  getPairingCode: vi.fn(() => null),
  disconnectAccount: vi.fn(async () => ({ running: false })),
  listRuntimeStates: () => [],
  sendTextMessage: vi.fn(),
  stopAll: vi.fn(async () => {}),
};

describe('Phase 13 WhatsApp account API', () => {
  let base;
  let adminToken;
  let staffToken;

  beforeAll(async () => {
    await connectDatabase();
    await connectRedis();
    await initializePhase7Models();
    setSessionManager(fakeManager);

    base = await createPhase7Base({ testRunId, suffix: 'accounts' });
    adminToken = await loginAs({ organization: base.organization, user: base.admin, testRunId });
    staffToken = await loginAs({ organization: base.organization, user: base.staff, testRunId });
  });

  afterAll(async () => {
    try {
      const orgs = await (
        await import('../src/modules/organizations/organization.model.js')
      ).Organization.find({ slug: new RegExp(testRunId) })
        .select('_id')
        .exec();
      await WhatsAppAccount.deleteMany({ organizationId: { $in: orgs.map((o) => o._id) } });
      await cleanupPhase7TestData(testRunId);
    } finally {
      setSessionManager(null);
      await disconnectRedis();
      await disconnectDatabase();
    }
  });

  it('lets an admin list and create accounts, and rejects duplicate brand keys', async () => {
    const list = await request(app)
      .get('/api/v1/whatsapp-accounts')
      .set(authHeader(adminToken))
      .expect(200);
    expect(Array.isArray(list.body.data)).toBe(true);

    const brandKey = `brand-${randomUUID().slice(0, 8)}`;
    const created = await request(app)
      .post('/api/v1/whatsapp-accounts')
      .set(authHeader(adminToken))
      .send({ name: 'Sales Line', brandKey })
      .expect(201);

    expect(created.body.data.brandKey).toBe(brandKey);
    expect(created.body.data.runtime).toEqual({ running: false, qrAvailable: false });
    expect(JSON.stringify(created.body)).not.toMatch(/"phone"|"jid"/i);

    await request(app)
      .post('/api/v1/whatsapp-accounts')
      .set(authHeader(adminToken))
      .send({ name: 'Dup', brandKey })
      .expect(409);
  });

  it('runs the connect / qr / pause / disconnect / remove lifecycle', async () => {
    const created = await request(app)
      .post('/api/v1/whatsapp-accounts')
      .set(authHeader(adminToken))
      .send({ name: 'Lifecycle', brandKey: `life-${randomUUID().slice(0, 8)}` })
      .expect(201);
    const id = created.body.data.id;

    await request(app)
      .post(`/api/v1/whatsapp-accounts/${id}/connect`)
      .set(authHeader(adminToken))
      .expect(202);
    expect(fakeManager.connectAccount).toHaveBeenCalled();

    const qr = await request(app)
      .get(`/api/v1/whatsapp-accounts/${id}/qr`)
      .set(authHeader(adminToken))
      .expect(200);
    expect(qr.body.data.qrDataUrl).toMatch(/^data:image\/png/);

    await request(app)
      .post(`/api/v1/whatsapp-accounts/${id}/pause`)
      .set(authHeader(adminToken))
      .expect(200);
    await request(app)
      .post(`/api/v1/whatsapp-accounts/${id}/resume`)
      .set(authHeader(adminToken))
      .expect(200);
    const reset = await request(app)
      .post(`/api/v1/whatsapp-accounts/${id}/reset`)
      .set(authHeader(adminToken))
      .expect(200);
    expect(reset.body.data.status).toBe('disconnected');
    await request(app)
      .post(`/api/v1/whatsapp-accounts/${id}/disconnect`)
      .set(authHeader(adminToken))
      .expect(200);
    await request(app)
      .delete(`/api/v1/whatsapp-accounts/${id}`)
      .set(authHeader(adminToken))
      .expect(200);
  });

  it('forbids account read and management without the permissions', async () => {
    await request(app).get('/api/v1/whatsapp-accounts').set(authHeader(staffToken)).expect(403);

    await request(app)
      .post('/api/v1/whatsapp-accounts')
      .set(authHeader(staffToken))
      .send({ name: 'Nope', brandKey: 'nope-key' })
      .expect(403);
  });

  it('validates the create body', async () => {
    await request(app)
      .post('/api/v1/whatsapp-accounts')
      .set(authHeader(adminToken))
      .send({ name: 'x', brandKey: 'Invalid Key!' })
      .expect(400);
  });
});
