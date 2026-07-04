import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import app from '../src/app.js';
import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import { connectRedis, disconnectRedis } from '../src/config/redis.js';

describe.sequential('GET /api/v1/health/readiness', () => {
  beforeAll(async () => {
    await disconnectRedis();
    await disconnectDatabase();
  });

  afterAll(async () => {
    await disconnectRedis();
    await disconnectDatabase();
  });

  it('returns 503 when dependencies are disconnected', async () => {
    const response = await request(app).get('/api/v1/health/readiness');

    expect(response.status).toBe(503);

    expect(response.body).toEqual({
      data: {
        status: 'not_ready',
        service: 'wam-backend',
        dependencies: {
          mongodb: {
            ready: false,
            state: 'disconnected',
          },
          redis: {
            ready: false,
            state: 'closed',
          },
        },
      },
      meta: {
        environment: 'test',
      },
    });
  });

  it('returns 200 after MongoDB and Redis connect', async () => {
    await connectDatabase();
    await connectRedis();

    const response = await request(app).get('/api/v1/health/readiness');

    expect(response.status).toBe(200);

    expect(response.body).toEqual({
      data: {
        status: 'ready',
        service: 'wam-backend',
        dependencies: {
          mongodb: {
            ready: true,
            state: 'connected',
          },
          redis: {
            ready: true,
            state: 'ready',
          },
        },
      },
      meta: {
        environment: 'test',
      },
    });
  });
});
