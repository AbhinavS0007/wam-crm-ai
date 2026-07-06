const DEFAULT_TEST_MONGODB_URI = 'mongodb://localhost:27017/wam_crm_ai_test';
const DEFAULT_TEST_REDIS_URL = 'redis://localhost:6379/15';

const mongodbUri = process.env.MONGODB_URI_TEST ?? DEFAULT_TEST_MONGODB_URI;
const redisUrl = process.env.REDIS_URL_TEST ?? DEFAULT_TEST_REDIS_URL;

const getMongoDatabaseName = (uri) => {
  const parsedUrl = new URL(uri);

  return parsedUrl.pathname.replace(/^\//, '');
};

const getRedisDatabaseNumber = (uri) => {
  const parsedUrl = new URL(uri);
  const databasePath = parsedUrl.pathname.replace(/^\//, '');

  if (databasePath === '') {
    return 0;
  }

  return Number(databasePath);
};

const mongoDatabaseName = getMongoDatabaseName(mongodbUri);
const redisDatabaseNumber = getRedisDatabaseNumber(redisUrl);

if (!mongoDatabaseName.endsWith('_test')) {
  throw new Error('Unsafe test MongoDB configuration: database name must end with _test.');
}

if (!Number.isInteger(redisDatabaseNumber) || redisDatabaseNumber <= 0) {
  throw new Error(
    'Unsafe test Redis configuration: use an isolated Redis database greater than 0.',
  );
}

process.env.NODE_ENV = 'test';
process.env.PORT = '5001';
process.env.FRONTEND_ORIGIN = 'http://localhost:5173';
process.env.MONGODB_URI = mongodbUri;
process.env.REDIS_URL = redisUrl;
process.env.LOG_LEVEL = 'error';
