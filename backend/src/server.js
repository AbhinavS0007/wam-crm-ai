import { env } from './config/env.js';
import { startServer, stopServer } from './server-lifecycle.js';

let server;
let shutdownPromise = null;

const shutdown = (signal) => {
  if (shutdownPromise) {
    return shutdownPromise;
  }

  shutdownPromise = (async () => {
    console.log(`${signal} received. Shutting down WAM backend.`);

    try {
      await stopServer({ server });

      console.log('WAM backend shutdown completed.');
    } catch (error) {
      console.error(`WAM backend shutdown failed: ${error.message}`);
      process.exitCode = 1;
    }
  })();

  return shutdownPromise;
};

try {
  server = await startServer();

  console.log(`WAM backend running at http://localhost:${env.PORT}`);

  process.once('SIGINT', () => {
    void shutdown('SIGINT');
  });

  process.once('SIGTERM', () => {
    void shutdown('SIGTERM');
  });
} catch (error) {
  console.error(`Failed to start WAM backend: ${error.message}`);
  process.exitCode = 1;
}
