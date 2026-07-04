import { afterAll, describe, expect, it } from 'vitest';

import { connectDatabase, disconnectDatabase, getDatabaseStatus } from '../src/config/database.js';

describe('MongoDB connection', () => {
  afterAll(async () => {
    await disconnectDatabase();
  });

  it('connects to the isolated test database', async () => {
    const connection = await connectDatabase();
    const status = getDatabaseStatus();

    expect(connection.readyState).toBe(1);
    expect(connection.name).toBe('wam_crm_ai_test');
    expect(status).toEqual({
      ready: true,
      state: 'connected',
    });
  });
});
