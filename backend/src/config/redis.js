import { createClient } from 'redis';

import { env } from './env.js';

const redisClient = createClient({
  url: env.REDIS_URL,
  socket: {
    connectTimeout: 5000,
    reconnectStrategy: (retries) => {
      if (retries >= 3) {
        return false;
      }

      return Math.min(retries * 100, 500);
    },
  },
});

redisClient.on('error', (error) => {
  console.error(`Redis client error: ${error.message}`);
});

let connectionPromise = null;

export const connectRedis = async () => {
  if (redisClient.isReady) {
    return redisClient;
  }

  if (connectionPromise) {
    return connectionPromise;
  }

  connectionPromise = redisClient
    .connect()
    .then(async () => {
      await redisClient.ping();

      return redisClient;
    })
    .finally(() => {
      connectionPromise = null;
    });

  return connectionPromise;
};

export const disconnectRedis = async () => {
  if (redisClient.isOpen) {
    await redisClient.close();
  }
};

export const getRedisStatus = () => {
  if (redisClient.isReady) {
    return {
      ready: true,
      state: 'ready',
    };
  }

  if (redisClient.isOpen) {
    return {
      ready: false,
      state: 'open',
    };
  }

  return {
    ready: false,
    state: 'closed',
  };
};

export const getRedisClient = () => redisClient;
