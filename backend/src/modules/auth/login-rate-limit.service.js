import { getRedisClient } from '../../config/redis.js';

const LOGIN_WINDOW_SECONDS = 15 * 60;
const IP_LIMIT = 20;
const EMAIL_IP_LIMIT = 5;

const normalizeLimiterValue = (value) =>
  String(value ?? 'unknown')
    .trim()
    .toLowerCase()
    .replaceAll(/\s+/g, '-');

const getLoginRateLimitKeys = ({ email, ipAddress }) => {
  const normalizedIp = normalizeLimiterValue(ipAddress);
  const normalizedEmail = normalizeLimiterValue(email);

  return {
    ipKey: `auth:login:ip:${normalizedIp}`,
    emailIpKey: `auth:login:email-ip:${normalizedEmail}:${normalizedIp}`,
  };
};

const incrementWindowCounter = async ({ key, windowSeconds }) => {
  const redisClient = getRedisClient();

  const count = await redisClient.incr(key);

  if (count === 1) {
    await redisClient.expire(key, windowSeconds);
  }

  return count;
};

export const checkLoginRateLimit = async ({ email, ipAddress }) => {
  const { ipKey, emailIpKey } = getLoginRateLimitKeys({
    email,
    ipAddress,
  });

  const [ipCount, emailIpCount] = await Promise.all([
    incrementWindowCounter({
      key: ipKey,
      windowSeconds: LOGIN_WINDOW_SECONDS,
    }),
    incrementWindowCounter({
      key: emailIpKey,
      windowSeconds: LOGIN_WINDOW_SECONDS,
    }),
  ]);

  const limited = ipCount > IP_LIMIT || emailIpCount > EMAIL_IP_LIMIT;

  return {
    limited,
    retryAfterSeconds: LOGIN_WINDOW_SECONDS,
    counters: {
      ipCount,
      emailIpCount,
      ipLimit: IP_LIMIT,
      emailIpLimit: EMAIL_IP_LIMIT,
    },
  };
};

export const clearLoginRateLimit = async ({ email, ipAddress }) => {
  const redisClient = getRedisClient();
  const { ipKey, emailIpKey } = getLoginRateLimitKeys({
    email,
    ipAddress,
  });

  await Promise.all([redisClient.del(ipKey), redisClient.del(emailIpKey)]);
};

export const clearLoginRateLimitForTest = clearLoginRateLimit;
