import app from './app.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { env } from './config/env.js';
import { connectRedis, disconnectRedis } from './config/redis.js';
import {
  startRealtimeSubscriber,
  stopRealtimeSubscriber,
} from './modules/realtime/realtime.hub.js';
import { createDeliveryRunner } from './modules/whatsapp/delivery/delivery-runner.js';
import { getSessionManager } from './modules/whatsapp/sessions/session-manager.instance.js';

let deliveryRunner = null;

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
  startRealtimeSubscriberFn = startRealtimeSubscriber,
} = {}) => {
  try {
    await connectDatabaseFn();
    await connectRedisFn();
    await startRealtimeSubscriberFn();

    deliveryRunner = createDeliveryRunner();
    deliveryRunner.start();

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
  stopRealtimeSubscriberFn = stopRealtimeSubscriber,
} = {}) => {
  let httpServerError = null;

  try {
    deliveryRunner?.stop();
    deliveryRunner = null;
    await getSessionManager().stopAll();
    await stopRealtimeSubscriberFn();
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
