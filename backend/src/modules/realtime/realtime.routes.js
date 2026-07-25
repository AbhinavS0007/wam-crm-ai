import { Router } from 'express';

import { authenticateRequest } from '../../middleware/auth.middleware.js';

import { registerClient, removeClient } from './realtime.hub.js';

const HEARTBEAT_INTERVAL_MS = 25000;

const realtimeRouter = Router();

realtimeRouter.use(authenticateRequest);

realtimeRouter.get('/stream', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  res.write(': connected\n\n');
  res.flushHeaders?.();

  const client = registerClient({
    res,
    userId: req.auth.user._id,
    organizationId: req.auth.organization._id,
    permissions: req.auth.permissions,
  });

  const heartbeat = setInterval(() => {
    try {
      res.write(': ping\n\n');
    } catch {
      clearInterval(heartbeat);
    }
  }, HEARTBEAT_INTERVAL_MS);

  req.on('close', () => {
    clearInterval(heartbeat);
    removeClient(client);
  });
});

export default realtimeRouter;
