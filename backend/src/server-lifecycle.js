import app from './app.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { env } from './config/env.js';
import { connectRedis, disconnectRedis } from './config/redis.js';

const listenForRequests = ({ appInstance, port }) =>
  new Promise((resolve, reject) => {
    let server;

    const handleError = (error) => {
      reject(error);
    };

    const handleListening = () => {
      server.off('error', handleError);
      resolve(server);
    };

    server = appInstance.listen(port, handleListening);
    server.once('error', handleError);
  });

const closeHttpServer = (server) =>
  new Promise((resolve, reject) => {
    if (!server || !server.listening) {
      resolve();
      return;
    }

    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });

const disconnectDependencies = async ({ disconnectDatabaseFn, disconnectRedisFn }) => {
  const results = await Promise.allSettled([disconnectRedisFn(), disconnectDatabaseFn()]);

  const failedResult = results.find((result) => result.status === 'rejected');

  if (failedResult) {
    throw failedResult.reason;
  }
};

export const startServer = async ({
  appInstance = app,
  port = env.PORT,
  connectDatabaseFn = connectDatabase,
  connectRedisFn = connectRedis,
  disconnectDatabaseFn = disconnectDatabase,
  disconnectRedisFn = disconnectRedis,
} = {}) => {
  try {
    await connectDatabaseFn();
    await connectRedisFn();

    return await listenForRequests({
      appInstance,
      port,
    });
  } catch (error) {
    await Promise.allSettled([disconnectRedisFn(), disconnectDatabaseFn()]);

    throw error;
  }
};

export const stopServer = async ({
  server,
  disconnectDatabaseFn = disconnectDatabase,
  disconnectRedisFn = disconnectRedis,
} = {}) => {
  let httpServerError = null;

  try {
    await closeHttpServer(server);
  } catch (error) {
    httpServerError = error;
  }

  let dependencyError = null;

  try {
    await disconnectDependencies({
      disconnectDatabaseFn,
      disconnectRedisFn,
    });
  } catch (error) {
    dependencyError = error;
  }

  if (httpServerError) {
    throw httpServerError;
  }

  if (dependencyError) {
    throw dependencyError;
  }
};
