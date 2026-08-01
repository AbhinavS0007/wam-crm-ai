import { getRedisClient } from '../../config/redis.js';

const WINDOW_SECONDS = 60 * 60;

const getAiDraftRateLimitKey = (userId) => `ai:draft:user:${userId}`;

/**
 * ADR-005's cost/rate-limit control: caps how many AI drafts one user can request per hour.
 * Mirrors the login rate limiter's Redis INCR/EXPIRE shape.
 */
export const checkAiDraftRateLimit = async ({ userId, limitPerHour }) => {
  const redisClient = getRedisClient();
  const key = getAiDraftRateLimitKey(userId);

  const count = await redisClient.incr(key);

  if (count === 1) {
    await redisClient.expire(key, WINDOW_SECONDS);
  }

  return {
    limited: count > limitPerHour,
    count,
    limitPerHour,
  };
};

export const clearAiDraftRateLimitForTest = async ({ userId }) => {
  const redisClient = getRedisClient();
  await redisClient.del(getAiDraftRateLimitKey(userId));
};
