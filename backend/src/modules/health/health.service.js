import { getDatabaseStatus } from '../../config/database.js';
import { env } from '../../config/env.js';
import { getRedisStatus } from '../../config/redis.js';

const SERVICE_NAME = 'wam-backend';

export const getLivenessSnapshot = () => ({
  data: {
    status: 'ok',
    service: SERVICE_NAME,
  },
  meta: {
    environment: env.NODE_ENV,
  },
});

export const getReadinessSnapshot = () => {
  const mongodb = getDatabaseStatus();
  const redis = getRedisStatus();

  const ready = mongodb.ready && redis.ready;

  return {
    ready,
    body: {
      data: {
        status: ready ? 'ready' : 'not_ready',
        service: SERVICE_NAME,
        dependencies: {
          mongodb,
          redis,
        },
      },
      meta: {
        environment: env.NODE_ENV,
      },
    },
  };
};
