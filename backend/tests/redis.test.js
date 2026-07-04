import { randomUUID } from 'node:crypto';

import { afterAll, describe, expect, it } from 'vitest';

import { env } from '../src/config/env.js';
import { connectRedis, disconnectRedis, getRedisStatus } from '../src/config/redis.js';

describe('Redis connection', () => {
  afterAll(async () => {
    await disconnectRedis();
  });

  it('connects to isolated Redis database 15', async () => {
    const redisUrl = new URL(env.REDIS_URL);

    expect(redisUrl.pathname).toBe('/15');

    const client = await connectRedis();
    const status = getRedisStatus();
    const key = `wam:test:redis:${randomUUID()}`;

    try {
      await client.set(key, 'connected');

      expect(await client.get(key)).toBe('connected');
      expect(await client.ping()).toBe('PONG');
      expect(status).toEqual({
        ready: true,
        state: 'ready',
      });
    } finally {
      await client.del(key);
    }
  });
});
